/**
 * Authentication Unit Tests
 * 
 * Tests individual authentication functions and middleware in isolation.
 * These tests use mocks and don't require a database connection.
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock Prisma before importing auth middleware
const mockPrisma = {
  user: {
    findUnique: jest.fn()
  }
};

jest.mock('../../src/lib/prisma', () => mockPrisma);

const authMiddleware = require('../../src/middleware/auth');

describe('Authentication Unit Tests', () => {
  // Test environment setup
  const originalEnv = process.env;
  const TEST_JWT_SECRET = 'test-jwt-secret-for-unit-tests';

  beforeAll(() => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('JWT Token Generation and Validation', () => {
    const testUserId = 'test-user-id-123';

    it('should generate a valid JWT token', () => {
      const token = jwt.sign(
        { userId: testUserId },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should decode a valid JWT token correctly', () => {
      const token = jwt.sign(
        { userId: testUserId },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      const decoded = jwt.verify(token, TEST_JWT_SECRET);

      expect(decoded).toHaveProperty('userId', testUserId);
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('exp');
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    it('should reject invalid JWT token', () => {
      const invalidToken = 'invalid.jwt.token';

      expect(() => {
        jwt.verify(invalidToken, TEST_JWT_SECRET);
      }).toThrow('invalid token');
    });

    it('should reject JWT token with wrong secret', () => {
      const token = jwt.sign(
        { userId: testUserId },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      expect(() => {
        jwt.verify(token, TEST_JWT_SECRET);
      }).toThrow('invalid signature');
    });

    it('should reject expired JWT token', () => {
      const expiredToken = jwt.sign(
        { userId: testUserId },
        TEST_JWT_SECRET,
        { expiresIn: '-1h' } // Already expired
      );

      expect(() => {
        jwt.verify(expiredToken, TEST_JWT_SECRET);
      }).toThrow('jwt expired');
    });

    it('should handle token with custom claims', () => {
      const customClaims = {
        userId: testUserId,
        role: 'user',
        permissions: ['read', 'write']
      };

      const token = jwt.sign(customClaims, TEST_JWT_SECRET, { expiresIn: '1h' });
      const decoded = jwt.verify(token, TEST_JWT_SECRET);

      expect(decoded.userId).toBe(testUserId);
      expect(decoded.role).toBe('user');
      expect(decoded.permissions).toEqual(['read', 'write']);
    });
  });

  describe('Password Hashing and Comparison', () => {
    const testPassword = 'testPassword123';

    it('should hash password correctly', async () => {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(testPassword, salt);

      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).not.toBe(testPassword);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are long
    });

    it('should verify correct password', async () => {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(testPassword, salt);

      const isMatch = await bcrypt.compare(testPassword, hashedPassword);
      expect(isMatch).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(testPassword, salt);

      const isMatch = await bcrypt.compare('wrongPassword', hashedPassword);
      expect(isMatch).toBe(false);
    });

    it('should handle empty password', async () => {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('', salt);

      const isMatch = await bcrypt.compare('', hashedPassword);
      expect(isMatch).toBe(true);

      const isWrongMatch = await bcrypt.compare('notEmpty', hashedPassword);
      expect(isWrongMatch).toBe(false);
    });

    it('should generate different hashes for same password', async () => {
      const salt1 = await bcrypt.genSalt(10);
      const salt2 = await bcrypt.genSalt(10);
      const hash1 = await bcrypt.hash(testPassword, salt1);
      const hash2 = await bcrypt.hash(testPassword, salt2);

      expect(hash1).not.toBe(hash2);

      // But both should verify correctly
      expect(await bcrypt.compare(testPassword, hash1)).toBe(true);
      expect(await bcrypt.compare(testPassword, hash2)).toBe(true);
    });

    it('should handle different salt rounds', async () => {
      const hash10 = await bcrypt.hash(testPassword, 10);
      const hash12 = await bcrypt.hash(testPassword, 12);

      expect(hash10).not.toBe(hash12);
      expect(await bcrypt.compare(testPassword, hash10)).toBe(true);
      expect(await bcrypt.compare(testPassword, hash12)).toBe(true);
    });
  });

  describe('Auth Middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        header: jest.fn()
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockNext = jest.fn();
    });

    it('should authenticate valid token and set user', async () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        monthlyBudget: 50000
      };

      const token = jwt.sign({ userId: testUser.id }, TEST_JWT_SECRET, { expiresIn: '1h' });
      
      mockReq.header.mockReturnValue(`Bearer ${token}`);
      mockPrisma.user.findUnique.mockResolvedValue(testUser);

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: testUser.id },
        select: { id: true, email: true, name: true, monthlyBudget: true }
      });
      expect(mockReq.user).toEqual(testUser);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should reject request without Authorization header', async () => {
      mockReq.header.mockReturnValue(undefined);

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'No token, authorization denied'
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should reject request with empty Authorization header', async () => {
      mockReq.header.mockReturnValue('');

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'No token, authorization denied'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with malformed Authorization header', async () => {
      mockReq.header.mockReturnValue('InvalidFormat token');

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Token is not valid'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid JWT token', async () => {
      mockReq.header.mockReturnValue('Bearer invalid.jwt.token');

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Token is not valid'
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should reject request with expired JWT token', async () => {
      const expiredToken = jwt.sign(
        { userId: 'user-123' },
        TEST_JWT_SECRET,
        { expiresIn: '-1h' }
      );
      
      mockReq.header.mockReturnValue(`Bearer ${expiredToken}`);

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Token is not valid'
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should reject request when user not found in database', async () => {
      const token = jwt.sign({ userId: 'nonexistent-user' }, TEST_JWT_SECRET, { expiresIn: '1h' });
      
      mockReq.header.mockReturnValue(`Bearer ${token}`);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent-user' },
        select: { id: true, email: true, name: true, monthlyBudget: true }
      });
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Token is not valid'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const token = jwt.sign({ userId: 'user-123' }, TEST_JWT_SECRET, { expiresIn: '1h' });
      
      mockReq.header.mockReturnValue(`Bearer ${token}`);
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Token is not valid'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle JWT token without Bearer prefix', async () => {
      const token = jwt.sign({ userId: 'user-123' }, TEST_JWT_SECRET, { expiresIn: '1h' });
      
      mockReq.header.mockReturnValue(token); // No "Bearer " prefix

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Token is not valid'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle token with extra spaces', async () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        monthlyBudget: 50000
      };

      const token = jwt.sign({ userId: testUser.id }, TEST_JWT_SECRET, { expiresIn: '1h' });
      
      mockReq.header.mockReturnValue(`  Bearer   ${token}  `);
      mockPrisma.user.findUnique.mockResolvedValue(testUser);

      await authMiddleware(mockReq, mockRes, mockNext);

      // Should fail because our implementation doesn't handle extra spaces
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Token is not valid'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive Bearer keyword', async () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        monthlyBudget: 50000
      };

      const token = jwt.sign({ userId: testUser.id }, TEST_JWT_SECRET, { expiresIn: '1h' });
      
      mockReq.header.mockReturnValue(`bearer ${token}`); // lowercase
      mockPrisma.user.findUnique.mockResolvedValue(testUser);

      await authMiddleware(mockReq, mockRes, mockNext);

      // Should fail because our implementation is case-sensitive
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Token Edge Cases', () => {
    it('should handle token with missing userId claim', async () => {
      const token = jwt.sign({ email: 'test@example.com' }, TEST_JWT_SECRET, { expiresIn: '1h' });
      
      const mockReq = { header: jest.fn().mockReturnValue(`Bearer ${token}`) };
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const mockNext = jest.fn();

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: undefined },
        select: { id: true, email: true, name: true, monthlyBudget: true }
      });
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Token is not valid'
      });
    });

    it('should handle token with null userId', async () => {
      const token = jwt.sign({ userId: null }, TEST_JWT_SECRET, { expiresIn: '1h' });
      
      const mockReq = { header: jest.fn().mockReturnValue(`Bearer ${token}`) };
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const mockNext = jest.fn();

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Token is not valid'
      });
    });

    it('should handle token with empty string userId', async () => {
      const token = jwt.sign({ userId: '' }, TEST_JWT_SECRET, { expiresIn: '1h' });
      
      const mockReq = { header: jest.fn().mockReturnValue(`Bearer ${token}`) };
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const mockNext = jest.fn();

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '' },
        select: { id: true, email: true, name: true, monthlyBudget: true }
      });
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
});
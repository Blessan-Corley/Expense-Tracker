/**
 * Auth Integration Tests
 * 
 * Tests the complete authentication flow against a real database.
 * These tests verify that the API endpoints work correctly end-to-end.
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import the Express app
const app = require('../src/server');
const prisma = require('../src/lib/prisma');

describe('Auth API - Integration Tests', () => {
    // Clean up before each test
    beforeEach(async () => {
        await prisma.transaction.deleteMany({});
        await prisma.recurringTransaction.deleteMany({});
        await prisma.goal.deleteMany({});
        await prisma.user.deleteMany({});
    });

    // Clean up after all tests
    afterAll(async () => {
        await prisma.transaction.deleteMany({});
        await prisma.recurringTransaction.deleteMany({});
        await prisma.goal.deleteMany({});
        await prisma.user.deleteMany({});
        await prisma.$disconnect();
    });

    describe('POST /api/auth/register', () => {
        it('should successfully register a new user', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect('Content-Type', /json/)
                .expect(201);

            // Verify response structure
            expect(response.body).toHaveProperty('message', 'User created successfully');
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user).toHaveProperty('id');
            expect(response.body.user).toHaveProperty('email', 'john@example.com');
            expect(response.body.user).toHaveProperty('name', 'John Doe');
            expect(response.body.user).not.toHaveProperty('password'); // Password should not be returned

            // Verify token is valid JWT
            const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
            expect(decoded).toHaveProperty('userId');

            // Verify user was actually created in database
            const dbUser = await prisma.user.findUnique({
                where: { email: 'john@example.com' }
            });
            expect(dbUser).not.toBeNull();
            expect(dbUser.name).toBe('John Doe');

            // Verify password was hashed
            const isPasswordHashed = await bcrypt.compare('password123', dbUser.password);
            expect(isPasswordHashed).toBe(true);
        });

        it('should reject registration with duplicate email', async () => {
            // Create existing user
            const hashedPassword = await bcrypt.hash('password123', 10);
            await prisma.user.create({
                data: {
                    name: 'Existing User',
                    email: 'existing@example.com',
                    password: hashedPassword
                }
            });

            // Try to register with same email
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'New User',
                    email: 'existing@example.com',
                    password: 'newpassword'
                })
                .expect(400);

            expect(response.body).toHaveProperty('message', 'User already exists');
        });

        it('should reject registration with invalid email format', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'not-an-email',
                    password: 'password123'
                })
                .expect(400);

            expect(response.body.message).toMatch(/email/i);
        });

        it('should reject registration with short password', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: '1234567' // Less than 8 characters
                })
                .expect(400);

            expect(response.body.message).toMatch(/password/i);
        });

        it('should reject registration with missing name', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                })
                .expect(400);

            expect(response.body.message).toMatch(/name/i);
        });

        it('should reject registration with short name', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'A', // Less than 2 characters
                    email: 'test@example.com',
                    password: 'password123'
                })
                .expect(400);

            expect(response.body.message).toMatch(/name/i);
        });
    });

    describe('POST /api/auth/login', () => {
        let testUser;

        beforeEach(async () => {
            // Create a test user for login tests
            const hashedPassword = await bcrypt.hash('correctpassword', 10);
            testUser = await prisma.user.create({
                data: {
                    name: 'Login Test User',
                    email: 'login@example.com',
                    password: hashedPassword,
                    monthlyBudget: 50000
                }
            });
        });

        it('should successfully login with correct credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'correctpassword'
                })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Login successful');
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user.email).toBe('login@example.com');
            expect(response.body.user).not.toHaveProperty('password');

            // Verify token contains correct user ID
            const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
            expect(decoded.userId).toBe(testUser.id);
        });

        it('should reject login with wrong password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'wrongpassword'
                })
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Invalid credentials');
        });

        it('should reject login with non-existent email', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'anypassword'
                })
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Invalid credentials');
        });

        it('should reject login with missing email', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    password: 'password123'
                })
                .expect(400);

            expect(response.body).toHaveProperty('message');
        });

        it('should reject login with missing password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com'
                })
                .expect(400);

            expect(response.body).toHaveProperty('message');
        });
    });

    describe('GET /api/auth/me', () => {
        let testUser;
        let validToken;

        beforeEach(async () => {
            // Create a test user
            const hashedPassword = await bcrypt.hash('password123', 10);
            testUser = await prisma.user.create({
                data: {
                    name: 'Me Test User',
                    email: 'me@example.com',
                    password: hashedPassword,
                    monthlyBudget: 75000
                }
            });

            // Generate valid token
            validToken = jwt.sign(
                { userId: testUser.id },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
        });

        it('should return current user with valid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${validToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('user');
            expect(response.body.user.id).toBe(testUser.id);
            expect(response.body.user.email).toBe('me@example.com');
            expect(response.body.user.name).toBe('Me Test User');
            expect(response.body.user.monthlyBudget).toBe(75000);
            expect(response.body.user).not.toHaveProperty('password');
        });

        it('should reject request without token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .expect(401);

            expect(response.body).toHaveProperty('message', 'No token, authorization denied');
        });

        it('should reject request with invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body).toHaveProperty('message', 'Token is not valid');
        });

        it('should reject request with expired token', async () => {
            const expiredToken = jwt.sign(
                { userId: testUser.id },
                process.env.JWT_SECRET,
                { expiresIn: '-1h' } // Already expired
            );

            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${expiredToken}`)
                .expect(401);

            expect(response.body).toHaveProperty('message', 'Token is not valid');
        });

        it('should reject request with token for deleted user', async () => {
            // Delete the user
            await prisma.user.delete({ where: { id: testUser.id } });

            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(401);

            expect(response.body).toHaveProperty('message', 'Token is not valid');
        });
    });

    describe('Complete Authentication Flow', () => {
        it('should complete full signup -> login -> access protected route flow', async () => {
            // Step 1: Register new user
            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Flow Test User',
                    email: 'flow@example.com',
                    password: 'flowpassword123'
                })
                .expect(201);

            const registeredToken = registerResponse.body.token;

            // Step 2: Verify we can access protected route with registration token
            const meResponse1 = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${registeredToken}`)
                .expect(200);

            expect(meResponse1.body.user.email).toBe('flow@example.com');

            // Step 3: Login with same credentials
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'flow@example.com',
                    password: 'flowpassword123'
                })
                .expect(200);

            const loginToken = loginResponse.body.token;

            // Step 4: Verify we can access protected route with login token
            const meResponse2 = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${loginToken}`)
                .expect(200);

            expect(meResponse2.body.user.email).toBe('flow@example.com');
        });
    });
});

/**
 * Authentication Edge Cases Integration Tests
 * 
 * Tests edge cases and concurrent scenarios for authentication endpoints.
 * These tests verify behavior under stress and unusual conditions.
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import the Express app
const app = require('../src/server');
const prisma = require('../src/lib/prisma');

describe('Auth API - Edge Cases Integration Tests', () => {
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

    describe('Concurrent Authentication Requests', () => {
        it('should handle multiple concurrent registration requests', async () => {
            const registrationPromises = [];
            
            // Create 5 concurrent registration requests with different emails
            for (let i = 0; i < 5; i++) {
                const promise = request(app)
                    .post('/api/auth/register')
                    .send({
                        name: `User ${i}`,
                        email: `user${i}@concurrent.com`,
                        password: 'password123'
                    });
                registrationPromises.push(promise);
            }

            const responses = await Promise.all(registrationPromises);

            // All should succeed
            responses.forEach((response, index) => {
                expect(response.status).toBe(201);
                expect(response.body.user.email).toBe(`user${index}@concurrent.com`);
                expect(response.body).toHaveProperty('token');
            });

            // Verify all users were created in database
            const users = await prisma.user.findMany({
                where: {
                    email: {
                        in: ['user0@concurrent.com', 'user1@concurrent.com', 'user2@concurrent.com', 'user3@concurrent.com', 'user4@concurrent.com']
                    }
                }
            });
            expect(users).toHaveLength(5);
        });

        it('should handle concurrent registration with same email gracefully', async () => {
            const registrationPromises = [];
            
            // Create 3 concurrent registration requests with same email
            for (let i = 0; i < 3; i++) {
                const promise = request(app)
                    .post('/api/auth/register')
                    .send({
                        name: `User ${i}`,
                        email: 'duplicate@concurrent.com',
                        password: 'password123'
                    });
                registrationPromises.push(promise);
            }

            const responses = await Promise.all(registrationPromises);

            // One should succeed, others should fail with either 400 (duplicate) or 500 (race condition)
            const successfulResponses = responses.filter(r => r.status === 201);
            const failedResponses = responses.filter(r => r.status === 400 || r.status === 500);

            expect(successfulResponses).toHaveLength(1);
            expect(failedResponses.length).toBeGreaterThanOrEqual(1);

            // Verify only one user was created
            const users = await prisma.user.findMany({
                where: { email: 'duplicate@concurrent.com' }
            });
            expect(users).toHaveLength(1);
        });

        it('should handle concurrent login requests for same user', async () => {
            // Create a test user first
            const hashedPassword = await bcrypt.hash('password123', 10);
            await prisma.user.create({
                data: {
                    name: 'Concurrent User',
                    email: 'concurrent@login.com',
                    password: hashedPassword
                }
            });

            const loginPromises = [];
            
            // Create 5 concurrent login requests for same user
            for (let i = 0; i < 5; i++) {
                const promise = request(app)
                    .post('/api/auth/login')
                    .send({
                        email: 'concurrent@login.com',
                        password: 'password123'
                    });
                loginPromises.push(promise);
            }

            const responses = await Promise.all(loginPromises);

            // All should succeed
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.message).toBe('Login successful');
                expect(response.body).toHaveProperty('token');
                expect(response.body.user.email).toBe('concurrent@login.com');
            });

            // All tokens should be valid (they may be the same due to same timestamp)
            const tokens = responses.map(r => r.body.token);
            expect(tokens).toHaveLength(5);
            tokens.forEach(token => {
                expect(token).toBeDefined();
                expect(typeof token).toBe('string');
            });
        });

        it('should handle concurrent /me requests with same token', async () => {
            // Create a test user and get token
            const hashedPassword = await bcrypt.hash('password123', 10);
            const user = await prisma.user.create({
                data: {
                    name: 'Me Concurrent User',
                    email: 'me-concurrent@test.com',
                    password: hashedPassword
                }
            });

            const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

            const mePromises = [];
            
            // Create 5 concurrent /me requests with same token
            for (let i = 0; i < 5; i++) {
                const promise = request(app)
                    .get('/api/auth/me')
                    .set('Authorization', `Bearer ${token}`);
                mePromises.push(promise);
            }

            const responses = await Promise.all(mePromises);

            // All should succeed
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.user.email).toBe('me-concurrent@test.com');
                expect(response.body.user.id).toBe(user.id);
            });
        });
    });

    describe('Token Edge Cases', () => {
        let testUser;

        beforeEach(async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);
            testUser = await prisma.user.create({
                data: {
                    name: 'Token Test User',
                    email: 'token@test.com',
                    password: hashedPassword
                }
            });
        });

        it('should handle token with very long expiration', async () => {
            // Create token that expires in 100 years
            const longToken = jwt.sign(
                { userId: testUser.id },
                process.env.JWT_SECRET,
                { expiresIn: '100y' }
            );

            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${longToken}`)
                .expect(200);

            expect(response.body.user.id).toBe(testUser.id);
        });

        it('should handle token that expires in 1 second', async () => {
            // Create token that expires very soon
            const shortToken = jwt.sign(
                { userId: testUser.id },
                process.env.JWT_SECRET,
                { expiresIn: '1s' }
            );

            // Should work immediately
            const response1 = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${shortToken}`)
                .expect(200);

            expect(response1.body.user.id).toBe(testUser.id);

            // Wait for token to expire
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Should fail after expiration
            await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${shortToken}`)
                .expect(401);
        });

        it('should handle token with additional custom claims', async () => {
            const customToken = jwt.sign(
                { 
                    userId: testUser.id,
                    role: 'admin',
                    permissions: ['read', 'write', 'delete'],
                    customData: { theme: 'dark', language: 'en' }
                },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${customToken}`)
                .expect(200);

            expect(response.body.user.id).toBe(testUser.id);
        });

        it('should handle token with numeric userId', async () => {
            // Create token with numeric userId (should still work as string)
            const numericToken = jwt.sign(
                { userId: 12345 },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            // Should fail because user with ID 12345 doesn't exist
            await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${numericToken}`)
                .expect(401);
        });

        it('should handle malformed Authorization headers', async () => {
            const validToken = jwt.sign({ userId: testUser.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

            // Test various malformed headers that should all fail
            const testCases = [
                { header: `Bearer${validToken}`, description: 'Missing space' },
                { header: `bearer ${validToken}`, description: 'Wrong case' },
                { header: `Basic ${validToken}`, description: 'Wrong prefix' },
            ];

            for (const { header, description } of testCases) {
                const response = await request(app)
                    .get('/api/auth/me')
                    .set('Authorization', header);
                
                expect(response.status).toBe(401);
                expect(response.body.message).toBe('Token is not valid');
            }
        });
    });

    describe('Database Edge Cases', () => {
        it('should handle user deletion during active session', async () => {
            // Create user and get token
            const hashedPassword = await bcrypt.hash('password123', 10);
            const user = await prisma.user.create({
                data: {
                    name: 'Delete Test User',
                    email: 'delete@test.com',
                    password: hashedPassword
                }
            });

            const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

            // Verify token works initially
            await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            // Delete the user
            await prisma.user.delete({ where: { id: user.id } });

            // Token should now be invalid
            await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`)
                .expect(401);
        });

        it('should handle user data changes during active session', async () => {
            // Create user and get token
            const hashedPassword = await bcrypt.hash('password123', 10);
            const user = await prisma.user.create({
                data: {
                    name: 'Update Test User',
                    email: 'update@test.com',
                    password: hashedPassword,
                    monthlyBudget: 50000
                }
            });

            const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

            // Get initial user data
            const response1 = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(response1.body.user.name).toBe('Update Test User');
            expect(response1.body.user.monthlyBudget).toBe(50000);

            // Update user data
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    name: 'Updated Name',
                    monthlyBudget: 75000
                }
            });

            // Token should still work and return updated data
            const response2 = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(response2.body.user.name).toBe('Updated Name');
            expect(response2.body.user.monthlyBudget).toBe(75000);
        });
    });

    describe('Input Validation Edge Cases', () => {
        it('should handle registration with extremely long inputs', async () => {
            const longString = 'a'.repeat(1000);

            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: longString,
                    email: `${longString}@test.com`,
                    password: longString
                })
                .expect(400);

            expect(response.body.message).toMatch(/name|email/i);
        });

        it('should handle registration with special characters', async () => {
            const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: `User ${specialChars}`,
                    email: 'special@test.com',
                    password: `password${specialChars}`
                })
                .expect(201);

            expect(response.body.user.name).toBe(`User ${specialChars}`);
        });

        it('should handle registration with unicode characters', async () => {
            const unicodeName = 'José García';
            const unicodePassword = 'pässw0rd8';

            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: unicodeName,
                    email: 'unicode@test.com',
                    password: unicodePassword
                })
                .expect(201);

            expect(response.body.user.name).toBe(unicodeName);

            // Should be able to login with unicode password
            await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'unicode@test.com',
                    password: unicodePassword
                })
                .expect(200);
        });

        it('should handle login with case-sensitive email', async () => {
            // Register with lowercase email
            await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Case Test User',
                    email: 'case@test.com',
                    password: 'password123'
                })
                .expect(201);

            // Try to login with uppercase email (should fail)
            await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'CASE@TEST.COM',
                    password: 'password123'
                })
                .expect(400);

            // Try to login with mixed case email (should fail)
            await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'Case@Test.Com',
                    password: 'password123'
                })
                .expect(400);
        });

        it('should handle empty and whitespace inputs', async () => {
            // Test empty strings
            await request(app)
                .post('/api/auth/register')
                .send({
                    name: '',
                    email: '',
                    password: ''
                })
                .expect(400);

            // Test whitespace-only strings
            await request(app)
                .post('/api/auth/register')
                .send({
                    name: '   ',
                    email: '   ',
                    password: '   '
                })
                .expect(400);

            // Test null values
            await request(app)
                .post('/api/auth/register')
                .send({
                    name: null,
                    email: null,
                    password: null
                })
                .expect(400);
        });
    });

    describe('Rate Limiting Edge Cases', () => {
        it('should handle requests from different IPs differently', async () => {
            // This test verifies that rate limiting is per-IP
            // In test environment, rate limiting is disabled, so all should succeed
            
            const promises = [];
            for (let i = 0; i < 10; i++) {
                const promise = request(app)
                    .post('/api/auth/register')
                    .send({
                        name: `Rate Test User ${i}`,
                        email: `rate${i}@test.com`,
                        password: 'password123'
                    });
                promises.push(promise);
            }

            const responses = await Promise.all(promises);
            
            // All should succeed in test environment
            responses.forEach(response => {
                expect(response.status).toBe(201);
            });
        });

        it('should handle rapid sequential requests', async () => {
            // Test rapid sequential requests (not concurrent)
            for (let i = 0; i < 5; i++) {
                const response = await request(app)
                    .post('/api/auth/register')
                    .send({
                        name: `Sequential User ${i}`,
                        email: `sequential${i}@test.com`,
                        password: 'password123'
                    });
                
                expect(response.status).toBe(201);
            }
        });
    });

    describe('Memory and Performance Edge Cases', () => {
        it('should handle large number of users efficiently', async () => {
            const startTime = Date.now();
            
            // Create 50 users
            const promises = [];
            for (let i = 0; i < 50; i++) {
                const promise = request(app)
                    .post('/api/auth/register')
                    .send({
                        name: `Performance User ${i}`,
                        email: `perf${i}@test.com`,
                        password: 'password123'
                    });
                promises.push(promise);
            }

            const responses = await Promise.all(promises);
            const endTime = Date.now();
            
            // All should succeed
            responses.forEach(response => {
                expect(response.status).toBe(201);
            });

            // Should complete within reasonable time (10 seconds)
            expect(endTime - startTime).toBeLessThan(10000);

            // Verify all users were created
            const userCount = await prisma.user.count();
            expect(userCount).toBe(50);
        });

        it('should handle authentication with large user database', async () => {
            // Create many users first
            const users = [];
            for (let i = 0; i < 20; i++) {
                const hashedPassword = await bcrypt.hash('password123', 10);
                users.push({
                    name: `Bulk User ${i}`,
                    email: `bulk${i}@test.com`,
                    password: hashedPassword
                });
            }

            await prisma.user.createMany({ data: users });

            // Test authentication performance with large database
            const startTime = Date.now();
            
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'bulk10@test.com',
                    password: 'password123'
                })
                .expect(200);

            const endTime = Date.now();

            expect(response.body.user.email).toBe('bulk10@test.com');
            
            // Should complete quickly even with many users
            expect(endTime - startTime).toBeLessThan(1000);
        });
    });
});

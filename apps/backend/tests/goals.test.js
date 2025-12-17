/**
 * Goals Integration Tests
 * 
 * Tests the complete goals flow against a real database.
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = require('../src/server');
const prisma = require('../src/lib/prisma');

describe('Goals API - Integration Tests', () => {
    let testUser;
    let authToken;

    beforeAll(async () => {
        const hashedPassword = await bcrypt.hash('password123', 10);
        testUser = await prisma.user.create({
            data: {
                name: 'Goals Test User',
                email: `goals-test-${Date.now()}@example.com`,
                password: hashedPassword
            }
        });

        authToken = jwt.sign(
            { userId: testUser.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
    });

    beforeEach(async () => {
        await prisma.goal.deleteMany({ where: { userId: testUser.id } });
    });

    afterAll(async () => {
        if (testUser) {
            await prisma.goal.deleteMany({ where: { userId: testUser.id } });
            await prisma.user.delete({ where: { id: testUser.id } });
        }
        await prisma.$disconnect();
    });

    describe('POST /api/goals', () => {
        it('should create a new goal', async () => {
            const goalData = {
                title: 'Emergency Fund',
                description: 'Save 6 months expenses',
                targetAmount: 300000,
                targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                category: 'EMERGENCY_FUND',
                priority: 'HIGH'
            };

            const response = await request(app)
                .post('/api/goals')
                .set('Authorization', `Bearer ${authToken}`)
                .send(goalData)
                .expect(201);

            expect(response.body.message).toBe('Goal created successfully');
            expect(response.body.goal).toHaveProperty('id');
            expect(response.body.goal.title).toBe('Emergency Fund');
            expect(response.body.goal.currentAmount).toBe(0);
            expect(response.body.goal.isCompleted).toBe(false);

            // Verify in database
            const dbGoal = await prisma.goal.findUnique({
                where: { id: response.body.goal.id }
            });
            expect(dbGoal).not.toBeNull();
            expect(dbGoal.userId).toBe(testUser.id);
        });

        it('should reject goal with invalid category', async () => {
            const response = await request(app)
                .post('/api/goals')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Test Goal',
                    targetAmount: 20000,
                    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    category: 'INVALID_CATEGORY',
                    priority: 'HIGH'
                })
                .expect(400);

            expect(response.body.message).toMatch(/category/i);
        });

        it('should reject goal with past target date', async () => {
            const response = await request(app)
                .post('/api/goals')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Test Goal',
                    targetAmount: 10000,
                    targetDate: '2020-01-01',
                    category: 'OTHER',
                    priority: 'HIGH'
                })
                .expect(400);

            expect(response.body.message).toMatch(/targetDate/i);
        });
    });

    describe('GET /api/goals', () => {
        beforeEach(async () => {
            await prisma.goal.createMany({
                data: [
                    {
                        title: 'Emergency Fund',
                        targetAmount: 300000,
                        currentAmount: 75000,
                        targetDate: new Date('2025-12-31'),
                        category: 'EMERGENCY_FUND',
                        priority: 'HIGH',
                        isCompleted: false,
                        userId: testUser.id
                    },
                    {
                        title: 'Vacation',
                        targetAmount: 100000,
                        currentAmount: 100000,
                        targetDate: new Date('2025-06-30'),
                        category: 'VACATION',
                        priority: 'MEDIUM',
                        isCompleted: true,
                        userId: testUser.id
                    }
                ]
            });
        });

        it('should return all goals with calculated progress', async () => {
            const response = await request(app)
                .get('/api/goals')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.goals).toHaveLength(2);
            expect(response.body.goals[0]).toHaveProperty('progress');
            expect(response.body.goals[0]).toHaveProperty('remainingAmount');
            expect(response.body.goals[0]).toHaveProperty('daysRemaining');
        });

        it('should filter active goals', async () => {
            const response = await request(app)
                .get('/api/goals?status=active')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.goals).toHaveLength(1);
            expect(response.body.goals[0].isCompleted).toBe(false);
        });

        it('should filter completed goals', async () => {
            const response = await request(app)
                .get('/api/goals?status=completed')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.goals).toHaveLength(1);
            expect(response.body.goals[0].isCompleted).toBe(true);
        });

        it('should calculate progress correctly', async () => {
            const response = await request(app)
                .get('/api/goals')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            const emergencyFund = response.body.goals.find(g => g.title === 'Emergency Fund');
            // 75000 / 300000 * 100 = 25%
            expect(emergencyFund.progress).toBe(25);
            expect(emergencyFund.remainingAmount).toBe(225000);
        });
    });

    describe('POST /api/goals/:id/contribute', () => {
        let testGoal;

        beforeEach(async () => {
            testGoal = await prisma.goal.create({
                data: {
                    title: 'Test Goal',
                    targetAmount: 10000,
                    currentAmount: 5000,
                    targetDate: new Date('2025-12-31'),
                    category: 'OTHER',
                    priority: 'MEDIUM',
                    userId: testUser.id
                }
            });
        });

        it('should add contribution to goal', async () => {
            const response = await request(app)
                .post(`/api/goals/${testGoal.id}/contribute`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ amount: 2000 })
                .expect(200);

            expect(response.body.message).toBe('Contribution added successfully');
            expect(response.body.goal.currentAmount).toBe(7000);

            // Verify in database
            const dbGoal = await prisma.goal.findUnique({ where: { id: testGoal.id } });
            expect(Number(dbGoal.currentAmount)).toBe(7000);
        });

        it('should mark goal as completed when fully funded', async () => {
            const response = await request(app)
                .post(`/api/goals/${testGoal.id}/contribute`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ amount: 5000 })
                .expect(200);

            expect(response.body.message).toBe('Congratulations! Goal completed!');
            expect(response.body.goal.isCompleted).toBe(true);
        });

        it('should reject negative contribution', async () => {
            const response = await request(app)
                .post(`/api/goals/${testGoal.id}/contribute`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ amount: -100 })
                .expect(400);

            expect(response.body.message).toBe('Valid contribution amount required');
        });
    });

    describe('DELETE /api/goals/:id', () => {
        it('should delete a goal', async () => {
            const goal = await prisma.goal.create({
                data: {
                    title: 'To Delete',
                    targetAmount: 10000,
                    targetDate: new Date('2025-12-31'),
                    category: 'OTHER',
                    userId: testUser.id
                }
            });

            const response = await request(app)
                .delete(`/api/goals/${goal.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.message).toBe('Goal deleted successfully');

            const dbGoal = await prisma.goal.findUnique({ where: { id: goal.id } });
            expect(dbGoal).toBeNull();
        });
    });

    describe('GET /api/goals/summary', () => {
        beforeEach(async () => {
            await prisma.goal.createMany({
                data: [
                    {
                        title: 'Goal 1',
                        targetAmount: 100000,
                        currentAmount: 50000,
                        targetDate: new Date('2025-12-31'),
                        category: 'EMERGENCY_FUND',
                        isCompleted: false,
                        userId: testUser.id
                    },
                    {
                        title: 'Goal 2',
                        targetAmount: 50000,
                        currentAmount: 50000,
                        targetDate: new Date('2025-06-30'),
                        category: 'VACATION',
                        isCompleted: true,
                        userId: testUser.id
                    }
                ]
            });
        });

        it('should return goals summary', async () => {
            const response = await request(app)
                .get('/api/goals/summary')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.total).toBe(2);
            expect(response.body.completed).toBe(1);
            expect(response.body.active).toBe(1);
            expect(response.body.totalTargetAmount).toBe(150000);
            expect(response.body.totalSavedAmount).toBe(100000);
            // (50000 + 50000) / (100000 + 50000) * 100 = 66.67%
            expect(response.body.overallProgress).toBe(67);
        });
    });
});

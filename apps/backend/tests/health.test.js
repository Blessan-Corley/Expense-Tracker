/**
 * Health Endpoint Integration Tests
 */
const request = require('supertest');
const app = require('../src/server');

describe('GET /api/health', () => {
  it('should return healthy status with correct app name', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('message', 'Expense Tracker API is running!');
    expect(response.body).toHaveProperty('database');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('environment');
  });

  it('should include memory usage', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.body).toHaveProperty('memory');
    expect(response.body.memory).toHaveProperty('used');
    expect(response.body.memory).toHaveProperty('total');
    expect(typeof response.body.memory.used).toBe('number');
  });

  it('should allow localhost CORS preflight requests', async () => {
    const response = await request(app)
      .options('/api/transactions')
      .set('Origin', 'http://localhost:4173')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:4173');
  });
});

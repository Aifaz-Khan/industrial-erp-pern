const request = require('supertest');
const app = require('../src/app');

describe('System Health & Base Endpoints (Phase 1)', () => {
  it('GET / should return online service status', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'online');
    expect(res.body).toHaveProperty('version');
  });

  it('GET /api/health should return 200 with system telemetry', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('status', 'healthy');
    expect(res.body.data).toHaveProperty('uptimeSeconds');
    expect(res.body.data).toHaveProperty('environment');
  });

  it('GET /api/non-existent-route should return 404 with standardized error structure', async () => {
    const res = await request(app).get('/api/non-existent-route');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body).toHaveProperty('message');
  });
});

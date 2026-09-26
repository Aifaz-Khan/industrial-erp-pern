const request = require('supertest');
const app = require('../src/app');

describe('Authentication & Role-Based Authorization (Phase 2)', () => {
  let adminToken = '';
  let salesToken = '';

  it('POST /api/auth/login should fail with invalid email format (400)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'not-an-email',
      password: 'SomePassword123!',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].field).toBe('email');
  });

  it('POST /api/auth/login should fail with incorrect password (401)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@industrial-erp.com',
      password: 'WrongPassword!',
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('POST /api/auth/login should authenticate ADMIN user and return token and profile (200)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@industrial-erp.com',
      password: 'AdminPassword123!',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user).toHaveProperty('role', 'ADMIN');
    expect(res.body.data.user).not.toHaveProperty('password');

    adminToken = res.body.data.token;
  });

  it('POST /api/auth/login should authenticate SALES user and return token (200)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'sales@industrial-erp.com',
      password: 'SalesPassword123!',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user).toHaveProperty('role', 'SALES');

    salesToken = res.body.data.token;
  });

  it('GET /api/auth/me should reject requests without Authorization header (401)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/auth/me should reject requests with invalid token (401)', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token-string');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/auth/me should return authenticated user profile for valid token (200)', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('sales@industrial-erp.com');
    expect(res.body.data.user.role).toBe('SALES');
  });

  it('RBAC: SALES user should be FORBIDDEN from accessing ADMIN-only route (403)', async () => {
    const res = await request(app)
      .get('/api/auth/admin-only')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Access forbidden');
  });

  it('RBAC: ADMIN user should successfully access ADMIN-only route (200)', async () => {
    const res = await request(app)
      .get('/api/auth/admin-only')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.granted).toBe(true);
  });
});

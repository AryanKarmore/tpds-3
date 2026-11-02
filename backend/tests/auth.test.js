const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');

describe('Authentication & Access Control', () => {
  const testCitizenEmail = `test_cit_${Date.now()}@example.com`;

  afterAll(async () => {
    // Clean up test user
    await pool.query('DELETE FROM users WHERE email LIKE "test_cit_%"');
  });

  test('Citizen self-service registration - Valid', async () => {
    const res = await request(app)
      .post('/api/auth/citizen/register')
      .send({
        name: 'Test Citizen User',
        email: testCitizenEmail,
        password: 'Password123',
        phone: '9876543210'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({
      name: 'Test Citizen User',
      email: testCitizenEmail,
      role: 'citizen'
    });
  });

  test('Citizen registration - Boundary: password at 7 chars (invalid)', async () => {
    const res = await request(app)
      .post('/api/auth/citizen/register')
      .send({
        name: 'Short Pass',
        email: `short_${Date.now()}@example.com`,
        password: '1234567' // 7 chars
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  test('Citizen login - Valid', async () => {
    const res = await request(app)
      .post('/api/auth/citizen/login')
      .send({
        email: testCitizenEmail,
        password: 'Password123'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('citizen');
  });

  test('Citizen login - Wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/citizen/login')
      .send({
        email: testCitizenEmail,
        password: 'WrongPassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid email or password/i);
  });

  test('Officer login - Valid', async () => {
    const res = await request(app)
      .post('/api/auth/officer/login')
      .send({
        email: 'officer1@civictrack.test',
        password: 'Officer@123'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('officer');
  });

  test('Cross-portal rejection: Citizen credentials on Officer login (403)', async () => {
    const res = await request(app)
      .post('/api/auth/officer/login')
      .send({
        email: testCitizenEmail,
        password: 'Password123'
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Citizen Portal');
  });

  test('Cross-portal rejection: Officer credentials on Citizen login (403)', async () => {
    const res = await request(app)
      .post('/api/auth/citizen/login')
      .send({
        email: 'officer1@civictrack.test',
        password: 'Officer@123'
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Officer Portal');
  });

  test('Current user endpoint /api/auth/me with Bearer token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/citizen/login')
      .send({
        email: testCitizenEmail,
        password: 'Password123'
      });

    const token = loginRes.body.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(testCitizenEmail);
  });
});

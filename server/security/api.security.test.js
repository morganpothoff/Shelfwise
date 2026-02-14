/**
 * API Security Integration Tests
 * Verifies authentication, authorization, and input validation at the HTTP layer
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../app.js';

describe('API Security', () => {
  describe('Authentication - Protected routes', () => {
    it('GET /api/books returns 401 without session cookie', async () => {
      const res = await request(app)
        .get('/api/books')
        .expect(401);
      assert.ok(res.body.error);
      assert.ok(
        res.body.error.includes('Authentication') ||
        res.body.error.includes('required') ||
        res.body.error.includes('Session')
      );
    });

    it('GET /api/completed-books returns 401 without session cookie', async () => {
      const res = await request(app).get('/api/completed-books').expect(401);
      assert.ok(res.body.error);
    });

    it('POST /api/pick-a-number returns 401 without session cookie', async () => {
      const res = await request(app)
        .post('/api/pick-a-number')
        .send({ number: 1 })
        .set('Content-Type', 'application/json')
        .expect(401);
      assert.ok(res.body.error);
    });

    it('DELETE /api/books/1 returns 401 without session cookie', async () => {
      await request(app).delete('/api/books/1').expect(401);
    });

    it('rejects request with invalid/expired session cookie', async () => {
      const res = await request(app)
        .get('/api/books')
        .set('Cookie', 'session_token=invalid-fake-token-12345')
        .expect(401);
      assert.ok(res.body.error);
    });
  });

  describe('Auth endpoints - Input validation', () => {
    it('POST /api/auth/login rejects empty body', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({})
        .set('Content-Type', 'application/json')
        .expect(400);
      assert.ok(res.body.error);
      assert.ok(
        res.body.error.toLowerCase().includes('email') ||
        res.body.error.toLowerCase().includes('password')
      );
    });

    it('POST /api/auth/login rejects missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' })
        .set('Content-Type', 'application/json')
        .expect(400);
      assert.ok(res.body.error);
    });

    it('POST /api/auth/login rejects missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' })
        .set('Content-Type', 'application/json')
        .expect(400);
      assert.ok(res.body.error);
    });

    it('POST /api/auth/login returns same error for non-existent user (user enumeration prevention)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'wrongpass' })
        .set('Content-Type', 'application/json')
        .expect(401);
      // Should not reveal whether user exists
      assert.ok(res.body.error);
      assert.strictEqual(
        res.body.error,
        'Invalid email or password',
        'Should use generic message to prevent user enumeration'
      );
    });

    it('POST /api/auth/register rejects short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: `test-${Date.now()}@example.com`,
          password: 'short',
          name: 'Test'
        })
        .set('Content-Type', 'application/json')
        .expect(400);
      assert.ok(res.body.error);
      assert.ok(res.body.error.toLowerCase().includes('8') || res.body.error.toLowerCase().includes('password'));
    });

    it('POST /api/auth/register rejects invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'validpassword123',
          name: 'Test'
        })
        .set('Content-Type', 'application/json')
        .expect(400);
      assert.ok(res.body.error);
      assert.ok(res.body.error.toLowerCase().includes('email'));
    });

    it('POST /api/auth/register rejects empty password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: `test-${Date.now()}@example.com`,
          password: '',
          name: 'Test'
        })
        .set('Content-Type', 'application/json')
        .expect(400);
      assert.ok(res.body.error);
    });
  });

  describe('Public endpoints', () => {
    it('GET /api/health returns 200 without auth', async () => {
      const res = await request(app).get('/api/health').expect(200);
      assert.strictEqual(res.body.status, 'ok');
      assert.ok(res.body.timestamp);
    });
  });

  describe('Content-Type enforcement', () => {
    it('rejects request without Content-Type for JSON body', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send('invalid');
      // Will fail to parse or return 400
      assert.ok(res.status >= 400 || res.body?.error);
    });
  });
});

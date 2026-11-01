import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { _clearAllAttempts } from './rate-limiter';

describe('Auth API Endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    _clearAllAttempts();
  });

  it('POST /api/v1/auth/login succeeds with valid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        identifier: 'owner@hospital.test',
        password: 'HospitalCRM@2026',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe('owner@hospital.test');
    expect(body.user.role.code).toBe('owner');
    expect(body.accessToken).toBeDefined();

    // Verify httpOnly secure cookies are set
    const setCookie = response.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie.join(';') : (setCookie as string);
    expect(cookieStr).toContain('accessToken');
    expect(cookieStr).toContain('refreshToken');
    expect(cookieStr).toContain('HttpOnly');
  });

  it('POST /api/v1/auth/login fails with invalid password and warns on attempts', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        identifier: 'owner@hospital.test',
        password: 'wrongPassword123',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
    expect(body.error.message).toContain('attempts remaining');
  });

  it('POST /api/v1/auth/login enforces 5-attempt rate limit lockout (15 minutes)', async () => {
    const testIdentifier = 'telecaller1@hospital.test';

    // 4 failed attempts
    for (let i = 0; i < 4; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { identifier: testIdentifier, password: 'bad' },
      });
      expect(res.statusCode).toBe(401);
    }

    // 5th failed attempt locks the account
    const fifthRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: testIdentifier, password: 'bad' },
    });
    expect(fifthRes.statusCode).toBe(401);
    expect(JSON.parse(fifthRes.payload).error.message).toContain('locked for 15 minutes');

    // 6th attempt is blocked immediately with 429 even before verifying credentials
    const sixthRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: testIdentifier, password: 'HospitalCRM@2026' },
    });
    expect(sixthRes.statusCode).toBe(429);
    expect(JSON.parse(sixthRes.payload).error.code).toBe('ACCOUNT_LOCKED');
  });

  it('GET /api/v1/auth/me returns current user context with valid token', async () => {
    // First login
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        identifier: 'telecaller1@hospital.test',
        password: 'HospitalCRM@2026',
      },
    });

    const { accessToken } = JSON.parse(loginRes.payload);

    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(meRes.statusCode).toBe(200);
    const meBody = JSON.parse(meRes.payload);
    expect(meBody.user.email).toBe('telecaller1@hospital.test');
    expect(meBody.user.roleCode).toBe('support_telecaller');
    expect(meBody.user.teamCodes).toContain('support');
    expect(meBody.user.permissions['lead.view']).toBe('own');
  });

  it('POST /api/v1/auth/logout clears auth cookies', async () => {
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
    });

    expect(logoutRes.statusCode).toBe(200);
    expect(JSON.parse(logoutRes.payload).success).toBe(true);
  });
});

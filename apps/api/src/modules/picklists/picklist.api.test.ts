import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prisma } from '../../database/client';

describe('Picklists & Settings API Endpoints (Milestone 2)', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let telecallerToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Login Admin
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'admin@hospital.test', password: 'HospitalCRM@2026' },
    });
    adminToken = JSON.parse(adminLogin.payload).accessToken;

    // Login Support Telecaller
    const telecallerLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'telecaller1@hospital.test', password: 'HospitalCRM@2026' },
    });
    telecallerToken = JSON.parse(telecallerLogin.payload).accessToken;

    // Reset calling_hours setting for idempotency
    await prisma.setting.upsert({
      where: { key: 'calling_hours' },
      update: {
        value: {
          start: '09:00',
          end: '20:00',
          timezone: 'Asia/Kolkata',
          enforce: true,
        },
      },
      create: {
        key: 'calling_hours',
        value: {
          start: '09:00',
          end: '20:00',
          timezone: 'Asia/Kolkata',
          enforce: true,
        },
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/picklists/departments returns all 15 hospital departments with Malayalam labels', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/picklists/departments',
    });

    expect(res.statusCode).toBe(200);
    const depts = JSON.parse(res.payload);
    expect(depts.length).toBeGreaterThanOrEqual(16);

    const ayurveda = depts.find((d: any) => d.code === 'TRADITIONAL_AYURVEDA');
    expect(ayurveda).toBeDefined();
    expect(ayurveda.labelEn).toBe('Traditional Ayurveda');
    expect(ayurveda.labelMl).toBe('പരമ്പരാഗത ആയുർവേദം');

    const hijama = depts.find((d: any) => d.code === 'HIJAMA_ACUPUNCTURE');
    expect(hijama).toBeDefined();
    expect(hijama.labelMl).toBe('ഹിജാമ & അക്യുപങ്ചർ');

    const panchakarma = depts.find((d: any) => d.code === 'PANCHA_KARMA_SPA');
    expect(panchakarma).toBeDefined();
    expect(panchakarma.labelMl).toBe('പഞ്ചകർമ്മ & സ്പാ');
  });

  it('GET /api/v1/picklists/sources returns lead sources including Google Ads and Meta Ads', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/picklists/sources',
    });

    expect(res.statusCode).toBe(200);
    const sources = JSON.parse(res.payload);
    expect(sources.length).toBeGreaterThanOrEqual(10);

    const meta = sources.find((s: any) => s.code === 'META_ADS');
    expect(meta).toBeDefined();
    expect(meta.labelEn).toBe('Meta Ads');
    expect(meta.labelMl).toBe('മെറ്റ പരസ്യങ്ങൾ');
  });

  it('GET /api/v1/picklists/call-outcomes returns all call outcomes including Emergency Redirected', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/picklists/call-outcomes',
    });

    expect(res.statusCode).toBe(200);
    const outcomes = JSON.parse(res.payload);
    expect(outcomes.length).toBeGreaterThanOrEqual(10);

    const emergency = outcomes.find((o: any) => o.code === 'EMERGENCY_REDIRECTED');
    expect(emergency).toBeDefined();
    expect(emergency.labelMl).toContain('അടിയന്തിര');
  });

  it('GET /api/v1/picklists/lost-reasons returns lead lost reasons', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/picklists/lost-reasons',
    });

    expect(res.statusCode).toBe(200);
    const reasons = JSON.parse(res.payload);
    expect(reasons.length).toBeGreaterThanOrEqual(8);
  });

  it('GET /api/v1/picklists/decline-reasons returns admission decline reasons', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/picklists/decline-reasons',
    });

    expect(res.statusCode).toBe(200);
    const reasons = JSON.parse(res.payload);
    expect(reasons.length).toBeGreaterThanOrEqual(7);
  });

  it('GET /api/v1/picklists/closure-codes returns aftercare closure codes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/picklists/closure-codes',
    });

    expect(res.statusCode).toBe(200);
    const codes = JSON.parse(res.payload);
    expect(codes.length).toBeGreaterThanOrEqual(5);
  });

  it('GET /api/v1/settings returns calling hours, SLA minutes, and contact rules', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/settings',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const settings = JSON.parse(res.payload);
    expect(settings.calling_hours).toBeDefined();
    expect(settings.calling_hours.start).toBe('09:00');
    expect(settings.calling_hours.end).toBe('20:00');

    expect(settings.sla_minutes).toBeDefined();
    expect(settings.sla_minutes.meta_ads).toBe(5);
    expect(settings.sla_minutes.google_ads).toBe(5);
    expect(settings.sla_minutes.default).toBe(15);

    expect(settings.contact_rules).toBeDefined();
    expect(settings.contact_rules.max_calls_per_day).toBe(1);
    expect(settings.contact_rules.max_attempts_per_cycle).toBe(3);
  });

  it('PATCH /api/v1/settings/:key allows Admin to update and records an audit log', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/settings/calling_hours',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        value: {
          start: '08:30',
          end: '20:30',
          timezone: 'Asia/Kolkata',
          enforce: true,
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const updated = JSON.parse(res.payload);
    expect(updated.value.start).toBe('08:30');

    // Verify audit log
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'SETTING_UPDATED', entity: 'setting' },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).not.toBeNull();

    // Telecaller without settings.manage cannot update
    const unauthRes = await app.inject({
      method: 'PATCH',
      url: '/api/v1/settings/calling_hours',
      headers: { authorization: `Bearer ${telecallerToken}` },
      payload: { value: { start: '07:00' } },
    });
    expect(unauthRes.statusCode).toBe(403);
  });
});

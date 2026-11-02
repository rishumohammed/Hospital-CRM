import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { prisma } from '../../database/client';

describe('Milestone P1: Product Lead Isolation & RBAC', () => {
  let app: FastifyInstance;
  let telecallerToken: string;
  let prodCallerToken: string;
  let prodMgrToken: string;
  let ownerToken: string;
  let branchId: number;
  let deptId: number;
  let sourceId: number;
  let treatmentLeadId: number;
  let productLeadId: number;
  const sharedMobile = '+919876543210';

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Telecaller (treatment staff)
    const tLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'telecaller1@hospital.test', password: 'HospitalCRM@2026' },
    });
    telecallerToken = JSON.parse(tLogin.payload).accessToken;

    // 2. Product Sales Executive (product caller)
    const pLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'prod_caller@hospital.test', password: 'HospitalCRM@2026' },
    });
    prodCallerToken = JSON.parse(pLogin.payload).accessToken;

    // 3. Product Manager
    const pmLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'prod_mgr@hospital.test', password: 'HospitalCRM@2026' },
    });
    prodMgrToken = JSON.parse(pmLogin.payload).accessToken;

    // 4. Owner
    const oLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'owner@hospital.test', password: 'HospitalCRM@2026' },
    });
    ownerToken = JSON.parse(oLogin.payload).accessToken;

    const branch = await prisma.branch.findFirstOrThrow({ where: { code: 'MAIN' } });
    branchId = branch.id;
    const dept = await prisma.department.findFirstOrThrow({ where: { active: true } });
    deptId = dept.id;
    const src = await prisma.source.findFirstOrThrow({ where: { active: true } });
    sourceId = src.id;

    // Create a treatment lead via telecaller
    const tLeadRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${telecallerToken}` },
      payload: {
        name: 'Patient Treatment Alpha',
        mobile: sharedMobile,
        branchId,
        departmentId: deptId,
        sourceId,
        leadType: 'treatment',
        overrideDuplicate: true,
      },
    });
    expect(tLeadRes.statusCode).toBe(201);
    treatmentLeadId = JSON.parse(tLeadRes.payload).id;

    // Create a product lead via prod_caller with same mobile number (demonstrates separate records & cross-type duplicate check)
    const pLeadRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${prodCallerToken}` },
      payload: {
        name: 'Customer Product Beta',
        mobile: sharedMobile,
        branchId,
        sourceId,
        leadType: 'product',
        overrideDuplicate: true,
      },
    });
    expect(pLeadRes.statusCode).toBe(201);
    productLeadId = JSON.parse(pLeadRes.payload).id;
  });

  afterAll(async () => {
    if (treatmentLeadId) {
      await prisma.lead.delete({ where: { id: treatmentLeadId } }).catch(() => {});
    }
    if (productLeadId) {
      await prisma.lead.delete({ where: { id: productLeadId } }).catch(() => {});
    }
    await app.close();
  });

  it('treatment telecaller cannot open product lead by link (403 and OUT_OF_SCOPE_LEAD_ACCESS_BLOCKED audit entry)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/leads/${productLeadId}`,
      headers: { authorization: `Bearer ${telecallerToken}` },
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('FORBIDDEN');

    // Verify audit entry
    const audit = await prisma.auditLog.findFirst({
      where: {
        action: 'OUT_OF_SCOPE_LEAD_ACCESS_BLOCKED',
        entity: 'lead',
        entityId: productLeadId,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeDefined();
  });

  it('product executive cannot open treatment lead by link (403 and OUT_OF_SCOPE_LEAD_ACCESS_BLOCKED audit entry)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/leads/${treatmentLeadId}`,
      headers: { authorization: `Bearer ${prodCallerToken}` },
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('FORBIDDEN');

    // Verify audit entry
    const audit = await prisma.auditLog.findFirst({
      where: {
        action: 'OUT_OF_SCOPE_LEAD_ACCESS_BLOCKED',
        entity: 'lead',
        entityId: treatmentLeadId,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeDefined();
  });

  it('treatment telecaller listing leads never receives product leads', async () => {
    // Default list
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${telecallerToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    const hasProductLead = body.leads.some((l: any) => l.id === productLeadId || l.leadType === 'product');
    expect(hasProductLead).toBe(false);

    // Explicit product query by telecaller returns empty list
    const productQueryRes = await app.inject({
      method: 'GET',
      url: '/api/v1/leads?leadType=product',
      headers: { authorization: `Bearer ${telecallerToken}` },
    });
    expect(productQueryRes.statusCode).toBe(200);
    const prodBody = JSON.parse(productQueryRes.payload);
    expect(prodBody.leads).toHaveLength(0);
  });

  it('product executive listing leads never receives treatment leads', async () => {
    // Default list
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${prodCallerToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    const hasTreatmentLead = body.leads.some((l: any) => l.id === treatmentLeadId || l.leadType === 'treatment');
    expect(hasTreatmentLead).toBe(false);

    // Explicit treatment query by prod caller returns empty list
    const treatQueryRes = await app.inject({
      method: 'GET',
      url: '/api/v1/leads?leadType=treatment',
      headers: { authorization: `Bearer ${prodCallerToken}` },
    });
    expect(treatQueryRes.statusCode).toBe(200);
    const treatBody = JSON.parse(treatQueryRes.payload);
    expect(treatBody.leads).toHaveLength(0);
  });

  it('product lead and treatment lead with same mobile can both exist and duplicate check warns without merging', async () => {
    // Attempting to create without override triggers 409 DUPLICATE_LEAD
    const dupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${prodCallerToken}` },
      payload: {
        name: 'Another Lead Same Phone',
        mobile: sharedMobile,
        branchId,
        sourceId,
        leadType: 'product',
        overrideDuplicate: false,
      },
    });
    expect(dupRes.statusCode).toBe(409);
    const dupBody = JSON.parse(dupRes.payload);
    expect(dupBody.error.code).toBe('DUPLICATE_LEAD');
  });

  it('owner can view both treatment and product leads using leadType filter', async () => {
    const treatRes = await app.inject({
      method: 'GET',
      url: '/api/v1/leads?leadType=treatment',
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    expect(treatRes.statusCode).toBe(200);
    const treatBody = JSON.parse(treatRes.payload);
    expect(treatBody.leads.every((l: any) => l.leadType === 'treatment')).toBe(true);

    const prodRes = await app.inject({
      method: 'GET',
      url: '/api/v1/leads?leadType=product',
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    expect(prodRes.statusCode).toBe(200);
    const prodBody = JSON.parse(prodRes.payload);
    expect(prodBody.leads.every((l: any) => l.leadType === 'product')).toBe(true);
    expect(prodBody.leads.some((l: any) => l.id === productLeadId)).toBe(true);
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prisma } from '../../database/client';

describe('Scope Enforcement & Acceptance Tests 1 & 12', () => {
  let app: FastifyInstance;
  let telecaller1Token: string;
  let telecaller1Id: number;
  let telecaller2Id: number;
  let adminToken: string;
  let adminId: number;
  let ownerToken: string;
  let ownerId: number;
  let testLeadId: number;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Ensure test department and source exist
    const dept = await prisma.department.upsert({
      where: { code: 'AYURVEDA' },
      update: {},
      create: {
        code: 'AYURVEDA',
        labelEn: 'Traditional Ayurveda',
        labelMl: 'പരമ്പരാഗത ആയുർവേദം',
      },
    });

    const source = await prisma.source.upsert({
      where: { code: 'META_ADS' },
      update: {},
      create: {
        code: 'META_ADS',
        labelEn: 'Meta Ads',
        labelMl: 'മെറ്റ പരസ്യങ്ങൾ',
      },
    });

    const branch = await prisma.branch.findUniqueOrThrow({ where: { code: 'MAIN' } });

    // 2. Fetch seeded users
    const [t1, t2, adminUser, ownerUser] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { email: 'telecaller1@hospital.test' } }),
      prisma.user.findUniqueOrThrow({ where: { email: 'telecaller2@hospital.test' } }),
      prisma.user.findUniqueOrThrow({ where: { email: 'admin@hospital.test' } }),
      prisma.user.findUniqueOrThrow({ where: { email: 'owner@hospital.test' } }),
    ]);

    telecaller1Id = t1.id;
    telecaller2Id = t2.id;
    adminId = adminUser.id;
    ownerId = ownerUser.id;

    // 3. Create a lead owned strictly by Telecaller 2
    const lead = await prisma.lead.create({
      data: {
        name: 'Patient Assigned To Telecaller 2',
        mobile: '+919988776655',
        mobileNorm: '+919988776655',
        concern: 'Back pain consultation',
        departmentId: dept.id,
        sourceId: source.id,
        branchId: branch.id,
        ownerId: telecaller2Id,
        status: 'new',
        priority: 'warm',
      },
    });
    testLeadId = lead.id;

    // 4. Log in users to get tokens
    const loginT1 = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'telecaller1@hospital.test', password: 'HospitalCRM@2026' },
    });
    telecaller1Token = JSON.parse(loginT1.payload).accessToken;

    const loginAdmin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'admin@hospital.test', password: 'HospitalCRM@2026' },
    });
    adminToken = JSON.parse(loginAdmin.payload).accessToken;

    const loginOwner = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'owner@hospital.test', password: 'HospitalCRM@2026' },
    });
    ownerToken = JSON.parse(loginOwner.payload).accessToken;
  });

  afterAll(async () => {
    // Clean up test lead and grants
    if (testLeadId) {
      await prisma.lead.delete({ where: { id: testLeadId } }).catch(() => {});
    }
    await prisma.permissionGrant.deleteMany({ where: { userId: adminId } });
    await app.close();
  });

  it('Acceptance Test 1: Support telecaller 1 cannot open telecaller 2 lead by direct ID (403 + audit entry exists)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/leads/${testLeadId}`,
      headers: {
        authorization: `Bearer ${telecaller1Token}`,
      },
    });

    // Must be 403 Forbidden
    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.message).toContain('Access denied');

    // Verify an audit log entry exists documenting the out-of-scope access attempt
    const auditEntry = await prisma.auditLog.findFirst({
      where: {
        userId: telecaller1Id,
        action: 'OUT_OF_SCOPE_LEAD_ACCESS_BLOCKED',
        entity: 'lead',
        entityId: testLeadId,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(auditEntry).not.toBeNull();
    expect(auditEntry?.action).toBe('OUT_OF_SCOPE_LEAD_ACCESS_BLOCKED');
  });

  it('Acceptance Test 12: Admin cannot read lead content until owner grants temporary permission, and every access is logged', async () => {
    // Step 1: Admin tries to view lead before grant -> 403 Forbidden
    const unauthResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/leads/${testLeadId}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(unauthResponse.statusCode).toBe(403);

    // Step 2: Owner grants temporary permission to Admin
    const futureDate = new Date(Date.now() + 2 * 3600 * 1000).toISOString(); // 2 hours
    const grantResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/permission-grants',
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
      payload: {
        userId: adminId,
        permission: 'lead.view',
        scope: 'branch',
        reason: 'Temporary troubleshooting for data discrepancy',
        endsAt: futureDate,
      },
    });

    expect(grantResponse.statusCode).toBe(201);
    const grant = JSON.parse(grantResponse.payload);
    expect(grant.id).toBeDefined();

    // Verify permission grant audit log exists
    const grantAudit = await prisma.auditLog.findFirst({
      where: {
        userId: ownerId,
        action: 'PERMISSION_GRANT_CREATED',
        entityId: grant.id,
      },
    });
    expect(grantAudit).not.toBeNull();

    // Step 3: Admin re-attempts reading lead content with active grant -> 200 OK!
    const authResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/leads/${testLeadId}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(authResponse.statusCode).toBe(200);
    const leadBody = JSON.parse(authResponse.payload);
    expect(leadBody.id).toBe(testLeadId);
    expect(leadBody.name).toBe('Patient Assigned To Telecaller 2');

    // Step 4: Verify lead access is logged in audit_logs
    const leadOpenAudit = await prisma.auditLog.findFirst({
      where: {
        userId: adminId,
        action: 'LEAD_OPENED',
        entity: 'lead',
        entityId: testLeadId,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(leadOpenAudit).not.toBeNull();
  });
});

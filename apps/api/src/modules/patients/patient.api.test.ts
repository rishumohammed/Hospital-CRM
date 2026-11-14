import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prisma } from '../../database/client';
import { generateAccessToken } from '../auth/token';

describe('Centralized Patient Directory & Dossier API', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let testPatientId: number;
  let sharedMobile: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Find any active admin/owner user in DB or create a test token
    let user = await prisma.user.findFirst({
      where: {
        status: 'active',
        role: { code: { in: ['owner', 'admin', 'super_admin'] } },
      },
      include: { role: true },
    });

    if (!user) {
      user = await prisma.user.findFirst({
        where: { status: 'active' },
        include: { role: true },
      });
    }

    if (user) {
      adminToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        roleCode: user.role.code,
        branchIds: [],
        teamCodes: [],
      });
    }

    const branch = await prisma.branch.findFirst();
    const branchId = branch?.id || 1;

    sharedMobile = '+919999988888';

    // Create test patient 1
    const p1 = await prisma.patient.create({
      data: {
        patientCode: `PAT-TEST-${Date.now()}-1`,
        name: 'Suresh Kumar',
        mobileNorm: sharedMobile,
        language: 'en',
        branchId,
      },
    });
    testPatientId = p1.id;

    // Create test patient 2 (family member sharing same phone)
    await prisma.patient.create({
      data: {
        patientCode: `PAT-TEST-${Date.now()}-2`,
        name: 'Sunitha Suresh',
        mobileNorm: sharedMobile,
        language: 'en',
        branchId,
      },
    });

    // Create a completed case for patient 1
    const dept = await prisma.department.findFirst();
    if (dept) {
      await prisma.case.create({
        data: {
          patientId: p1.id,
          branchId,
          departmentId: dept.id,
          stage: 'completed',
          careType: 'consultation_only',
        },
      });
    }
  });

  afterAll(async () => {
    // Clean up test patients
    if (sharedMobile) {
      const patients = await prisma.patient.findMany({ where: { mobileNorm: sharedMobile } });
      const ids = patients.map((p) => p.id);
      await prisma.case.deleteMany({ where: { patientId: { in: ids } } });
      await prisma.patient.deleteMany({ where: { id: { in: ids } } });
    }
    await app.close();
  });

  it('lists patients in centralized directory with search and pagination', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/patients?search=Suresh',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.patients).toBeDefined();
    expect(Array.isArray(body.patients)).toBe(true);
    expect(body.patients.length).toBeGreaterThanOrEqual(1);
    expect(body.pagination).toBeDefined();
  });

  it('retrieves comprehensive lifetime patient dossier including family members on shared mobile', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/patients/${testPatientId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.patient).toBeDefined();
    expect(body.patient.id).toBe(testPatientId);
    expect(body.metrics).toBeDefined();
    expect(body.metrics.totalCases).toBeGreaterThanOrEqual(1);
    expect(body.metrics.completedCases).toBeGreaterThanOrEqual(1);
    expect(body.familyMembers).toBeDefined();
    expect(body.familyMembers.length).toBeGreaterThanOrEqual(1);
    expect(body.familyMembers[0].name).toBe('Sunitha Suresh');
    expect(body.cases).toBeDefined();
  });

  it('returns 404 for non-existent patient id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/patients/99999999',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(404);
  });
});

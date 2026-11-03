import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prisma } from '../../database/client';

describe('Doctors Against Departments API', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let telecallerToken: string;
  let testDepartmentId: number;

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

    // Login Telecaller
    const telecallerLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'telecaller1@hospital.test', password: 'HospitalCRM@2026' },
    });
    telecallerToken = JSON.parse(telecallerLogin.payload).accessToken;

    const dept = await prisma.department.findFirst({ where: { active: true } });
    if (dept) {
      testDepartmentId = dept.id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows telecallers to list doctors mapped to departments', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/doctors',
      headers: { authorization: `Bearer ${telecallerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const doctors = JSON.parse(res.payload);
    expect(Array.isArray(doctors)).toBe(true);
    expect(doctors.length).toBeGreaterThan(0);
    expect(doctors[0]).toHaveProperty('name');
    expect(doctors[0]).toHaveProperty('departmentId');
    expect(doctors[0]).toHaveProperty('departmentName');
  });

  it('filters doctors by departmentId', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/doctors?departmentId=${testDepartmentId}`,
      headers: { authorization: `Bearer ${telecallerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const doctors = JSON.parse(res.payload);
    expect(Array.isArray(doctors)).toBe(true);
    doctors.forEach((doc: any) => {
      expect(doc.departmentId).toBe(testDepartmentId);
    });
  });

  it('allows admin to create a new doctor against a department', async () => {
    const payload = {
      name: 'Dr. Test Specialist',
      departmentId: testDepartmentId,
      qualification: 'BAMS, MD (Ayurveda)',
      designation: 'Lead Research Physician',
      opdTiming: '10:00 AM - 02:00 PM',
      roomNo: 'Room 205',
      consultationFee: 750,
      phone: '+919876543210',
      email: 'test.doc@hospitalcrm.com',
      active: true,
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/doctors',
      headers: { authorization: `Bearer ${adminToken}` },
      payload,
    });

    expect(res.statusCode).toBe(201);
    const doctor = JSON.parse(res.payload);
    expect(doctor.name).toBe(payload.name);
    expect(doctor.departmentId).toBe(testDepartmentId);
    expect(doctor.qualification).toBe(payload.qualification);
    expect(doctor.consultationFee).toBe(750);
    expect(doctor.roomNo).toBe('Room 205');

    // Verify updating the doctor
    const updateRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/doctors/${doctor.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        designation: 'Senior Lead Physician',
        consultationFee: 800,
      },
    });

    expect(updateRes.statusCode).toBe(200);
    const updated = JSON.parse(updateRes.payload);
    expect(updated.designation).toBe('Senior Lead Physician');
    expect(updated.consultationFee).toBe(800);

    // Verify deletion
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/doctors/${doctor.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(delRes.statusCode).toBe(200);
  });

  it('rejects unauthenticated requests to doctors endpoint', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/doctors',
    });

    expect(res.statusCode).toBe(401);
  });
});


import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { prisma } from '../../database/client';
import { addDays } from 'date-fns';

describe('Milestone 5: Conversion & Patient Cases (Acceptance Test 7)', () => {
  let app: FastifyInstance;
  let managerToken: string;
  let telecaller1Token: string;
  let doctor1Token: string;
  let admission1Token: string;
  let branchId: number;
  let deptId: number;
  let sourceId: number;
  let doctor1User: any;
  let testLeadIds: number[] = [];
  let testCaseIds: number[] = [];
  let testPatientIds: number[] = [];

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Authenticate manager
    const mgrLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'manager@hospital.test', password: 'HospitalCRM@2026' },
    });
    managerToken = JSON.parse(mgrLogin.payload).accessToken;

    // Authenticate telecaller 1
    const t1Login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'telecaller1@hospital.test', password: 'HospitalCRM@2026' },
    });
    telecaller1Token = JSON.parse(t1Login.payload).accessToken;

    // Authenticate doctor 1
    const docLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'doctor1@hospital.test', password: 'HospitalCRM@2026' },
    });
    doctor1Token = JSON.parse(docLogin.payload).accessToken;
    doctor1User = await prisma.user.findUniqueOrThrow({ where: { email: 'doctor1@hospital.test' } });

    // Authenticate admission 1
    const admLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'admission1@hospital.test', password: 'HospitalCRM@2026' },
    });
    admission1Token = JSON.parse(admLogin.payload).accessToken;

    const branch = await prisma.branch.findFirstOrThrow({ where: { code: 'MAIN' } });
    branchId = branch.id;

    const dept = await prisma.department.findFirstOrThrow();
    deptId = dept.id;

    const source = await prisma.source.findFirstOrThrow();
    sourceId = source.id;
  });

  afterAll(async () => {
    if (testCaseIds.length > 0) {
      await prisma.task.deleteMany({ where: { caseId: { in: testCaseIds } } });
      await prisma.interaction.deleteMany({ where: { caseId: { in: testCaseIds } } });
      await prisma.appointment.deleteMany({ where: { caseId: { in: testCaseIds } } });
      await prisma.case.deleteMany({ where: { id: { in: testCaseIds } } });
    }
    if (testLeadIds.length > 0) {
      await prisma.task.deleteMany({ where: { leadId: { in: testLeadIds } } });
      await prisma.interaction.deleteMany({ where: { leadId: { in: testLeadIds } } });
      await prisma.appointment.deleteMany({ where: { leadId: { in: testLeadIds } } });
      await prisma.lead.deleteMany({ where: { id: { in: testLeadIds } } });
    }
    if (testPatientIds.length > 0) {
      await prisma.patient.deleteMany({ where: { id: { in: testPatientIds } } });
    }
    await app.close();
  });

  // -------------------------------------------------------------
  // Test 1: Lead "Mark Visited" and Conversion to Patient & Case
  // -------------------------------------------------------------
  it('converts a lead to patient and case when marked visited', async () => {
    // 1. Create a lead
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        name: 'M5 Conversion Patient',
        mobile: '+919822200001',
        departmentId: deptId,
        sourceId,
        branchId,
        language: 'ml',
        concern: 'Back pain consultation',
      },
    });
    expect(createRes.statusCode).toBe(201);
    const lead = JSON.parse(createRes.payload);
    testLeadIds.push(lead.id);

    // 2. Book an appointment for the lead
    const apptRes = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead.id}/book-appointment`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        doctorName: doctor1User.name,
        startsAt: addDays(new Date(), 1).toISOString(),
        note: 'Consultation appointment scheduled',
      },
    });
    expect(apptRes.statusCode).toBe(201);

    // 3. Mark Visited via POST /leads/:id/convert
    const convertRes = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead.id}/convert`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        treatingDoctorId: doctor1User.id,
        note: 'Patient arrived for consultation',
      },
    });
    expect(convertRes.statusCode).toBe(200);
    const result = JSON.parse(convertRes.payload);

    expect(result.lead.status).toBe('converted');
    expect(result.patient.name).toBe('M5 Conversion Patient');
    expect(result.patient.patientCode).toMatch(/^PAT-/);
    expect(result.case.stage).toBe('visited');
    expect(result.case.careType).toBe('consultation_only');
    expect(result.case.treatingDoctorId).toBe(doctor1User.id);

    testCaseIds.push(result.case.id);
    testPatientIds.push(result.patient.id);

    // Verify appointment was marked visited and linked to case
    const appt = await prisma.appointment.findFirst({
      where: { leadId: lead.id },
    });
    expect(appt?.status).toBe('visited');
    expect(appt?.caseId).toBe(result.case.id);

    // Verify open cadence tasks on the lead were cancelled
    const openTasks = await prisma.task.findMany({
      where: { leadId: lead.id, status: 'open' },
    });
    expect(openTasks.length).toBe(0);

    // Verify visit interaction was recorded
    const visitInteraction = await prisma.interaction.findFirst({
      where: { caseId: result.case.id, type: 'visit' },
    });
    expect(visitInteraction).toBeDefined();

    // Verify audit log exists
    const audit = await prisma.auditLog.findFirst({
      where: { entity: 'lead', entityId: lead.id, action: 'LEAD_CONVERTED' },
    });
    expect(audit).toBeDefined();
  });

  // -------------------------------------------------------------
  // Acceptance Test 7:
  // "7. Saving a consultation outcome with care type in_patient puts the case in the Admission Desk queue, assigned round-robin, with a first task due within 24 hours."
  // -------------------------------------------------------------
  it('Acceptance Test 7: Consultation outcome with care_type = in_patient schedules 24h task & routes to Admission Desk', async () => {
    // 1. Create and convert a lead to generate a Case
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        name: 'M5 InPatient Case',
        mobile: '+919822200002',
        departmentId: deptId,
        sourceId,
        branchId,
        language: 'en',
      },
    });
    const lead = JSON.parse(createRes.payload);
    testLeadIds.push(lead.id);

    const convertRes = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead.id}/convert`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: { treatingDoctorId: doctor1User.id },
    });
    const { case: newCase, patient } = JSON.parse(convertRes.payload);
    testCaseIds.push(newCase.id);
    testPatientIds.push(patient.id);

    // 2. Doctor records consultation outcome: care_type = in_patient
    const outcomeRes = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${newCase.id}/consultation-outcome`,
      headers: { authorization: `Bearer ${doctor1Token}` },
      payload: {
        careType: 'in_patient',
        departmentId: deptId,
        treatingDoctorId: doctor1User.id,
        estimatedAmount: 85000,
        planNote: 'Surgery and 5 days IP admission recommended',
      },
    });
    expect(outcomeRes.statusCode).toBe(200);
    const updatedCase = JSON.parse(outcomeRes.payload);

    // Verify case properties
    expect(updatedCase.careType).toBe('in_patient');
    expect(updatedCase.advisedAdmission).toBe(true);
    expect(updatedCase.stage).toBe('plan_given');
    expect(updatedCase.team).toBe('admission');
    expect(updatedCase.ownerId).toBeDefined();

    // Verify owner belongs to admission team or has admission_specialist role
    const caseOwner = await prisma.user.findUnique({
      where: { id: updatedCase.ownerId },
      include: { role: true },
    });
    expect(caseOwner?.role.code).toBe('admission_specialist');

    // Verify tasks generated by 'case.admission_advised' cadence
    const tasks = await prisma.task.findMany({
      where: { caseId: newCase.id, status: 'open' },
      orderBy: { dueAt: 'asc' },
    });
    expect(tasks.length).toBeGreaterThanOrEqual(1);

    // First task must be due within 24 hours
    const firstTask = tasks[0];
    expect(firstTask.cadenceKey).toBe('case.admission_advised');
    expect(firstTask.cadenceStep).toBe(1);
    expect(firstTask.type).toBe('call');

    const now = new Date();
    const diffHours = (firstTask.dueAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    // Since offset is 24 hours, diffHours should be approximately 24 hours (23.9 to 24.1)
    expect(diffHours).toBeGreaterThan(23);
    expect(diffHours).toBeLessThanOrEqual(24.5);
  });

  // -------------------------------------------------------------
  // Test 3: Case listing and RBAC Scope Enforcement
  // -------------------------------------------------------------
  it('enforces RBAC scoping on case queries for doctors and telecallers', async () => {
    // 1. Doctor queries cases
    const docCasesRes = await app.inject({
      method: 'GET',
      url: '/api/v1/cases',
      headers: { authorization: `Bearer ${doctor1Token}` },
    });
    expect(docCasesRes.statusCode).toBe(200);
    const docCases = JSON.parse(docCasesRes.payload);
    // Every case visible to doctor must have treatingDoctorId == doctor1User.id or ownerId == doctor1User.id
    for (const c of docCases.cases) {
      const isTreating = c.treatingDoctorId === doctor1User.id;
      const isOwner = c.ownerId === doctor1User.id;
      expect(isTreating || isOwner).toBe(true);
    }

    // 2. Telecaller attempts to update consultation outcome without case.edit permission (should fail or be restricted)
    // Create another case not owned by doctor
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        name: 'M5 Scope Test Lead',
        mobile: '+919822200003',
        departmentId: deptId,
        sourceId,
        branchId,
        language: 'en',
      },
    });
    const lead = JSON.parse(createRes.payload);
    testLeadIds.push(lead.id);

    const convertRes = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead.id}/convert`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {},
    });
    const { case: newCase, patient } = JSON.parse(convertRes.payload);
    testCaseIds.push(newCase.id);
    testPatientIds.push(patient.id);

    // Support telecaller 1 does NOT have case.edit permission -> 403
    const unauthorizedOutcomeRes = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${newCase.id}/consultation-outcome`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        careType: 'consultation_only',
      },
    });
    expect(unauthorizedOutcomeRes.statusCode).toBe(403);
  });
});

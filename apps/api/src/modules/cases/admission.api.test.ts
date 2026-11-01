import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { prisma } from '../../database/client';
import { addDays, subDays } from 'date-fns';

describe('Milestone 6: Admission Desk (Acceptance Test 8)', () => {
  let app: FastifyInstance;
  let managerToken: string;
  let admission1Token: string;
  let telecaller1Token: string;
  let branchId: number;
  let deptId: number;
  let sourceId: number;
  let costDeclineReasonId: number;
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

    // Authenticate admission 1
    const admLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'admission1@hospital.test', password: 'HospitalCRM@2026' },
    });
    admission1Token = JSON.parse(admLogin.payload).accessToken;

    // Authenticate telecaller 1
    const t1Login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'telecaller1@hospital.test', password: 'HospitalCRM@2026' },
    });
    telecaller1Token = JSON.parse(t1Login.payload).accessToken;

    const branch = await prisma.branch.findFirstOrThrow({ where: { code: 'MAIN' } });
    branchId = branch.id;

    const dept = await prisma.department.findFirstOrThrow();
    deptId = dept.id;

    const source = await prisma.source.findFirstOrThrow();
    sourceId = source.id;

    const declineReason = await prisma.declineReason.findFirstOrThrow();
    costDeclineReasonId = declineReason.id;
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

  // Helper to create an in-patient case
  async function createInPatientCase(name: string, mobile: string) {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        name,
        mobile,
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

    // Record in-patient outcome
    await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${newCase.id}/consultation-outcome`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        careType: 'in_patient',
        departmentId: deptId,
        estimatedAmount: 50000,
        planNote: 'IP admission advised',
      },
    });

    return newCase.id;
  }

  // -------------------------------------------------------------
  // Acceptance Test 8:
  // "8. A case cannot move to in_treatment without deposit_received, unless emergency_admission is ticked with a reason."
  // -------------------------------------------------------------
  it('Acceptance Test 8: Block in_treatment without deposit_received, unless emergency_admission is ticked with a reason', async () => {
    const caseId = await createInPatientCase('M6 Deposit Gate Patient', '+919833300001');

    // 1. Attempt to advance to in_treatment WITHOUT deposit_received and WITHOUT emergency
    const blockRes = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${caseId}/advance-stage`,
      headers: { authorization: `Bearer ${admission1Token}` },
      payload: {
        stage: 'in_treatment',
        depositReceived: false,
      },
    });

    expect(blockRes.statusCode).toBe(400);
    const blockData = JSON.parse(blockRes.payload);
    expect(blockData.error.code).toBe('DEPOSIT_REQUIRED');

    // 2. Advance to in_treatment WITH depositReceived = true -> Succeeds
    const succeedDepositRes = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${caseId}/advance-stage`,
      headers: { authorization: `Bearer ${admission1Token}` },
      payload: {
        stage: 'in_treatment',
        depositReceived: true,
        depositAmount: 25000,
        admissionDate: new Date().toISOString(),
      },
    });

    expect(succeedDepositRes.statusCode).toBe(200);
    const updatedCase = JSON.parse(succeedDepositRes.payload);
    expect(updatedCase.stage).toBe('in_treatment');
    expect(updatedCase.depositReceived).toBe(true);
    expect(updatedCase.admissionDate).toBeDefined();

    // 3. Test emergency exception: Create second in-patient case without deposit
    const emergencyCaseId = await createInPatientCase('M6 Emergency Patient', '+919833300002');

    // Attempt without deposit but WITH emergencyAdmission = true and emergencyReason
    const emergencyRes = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${emergencyCaseId}/advance-stage`,
      headers: { authorization: `Bearer ${admission1Token}` },
      payload: {
        stage: 'in_treatment',
        depositReceived: false,
        emergencyAdmission: true,
        emergencyReason: 'Acute surgical abdomen - emergency admission approved by MD',
        admissionDate: new Date().toISOString(),
      },
    });

    expect(emergencyRes.statusCode).toBe(200);
    const emergencyUpdatedCase = JSON.parse(emergencyRes.payload);
    expect(emergencyUpdatedCase.stage).toBe('in_treatment');
    expect(emergencyUpdatedCase.emergencyAdmission).toBe(true);
    expect(emergencyUpdatedCase.emergencyReason).toContain('Acute surgical abdomen');
  });

  // -------------------------------------------------------------
  // Test 2: Full stage progression through Admission Desk
  // -------------------------------------------------------------
  it('progresses case through counseling_estimate, plan_accepted, and decline handling', async () => {
    const caseId = await createInPatientCase('M6 Pipeline Patient', '+919833300003');

    // 1. Advance to counseling_estimate
    const counselingRes = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${caseId}/advance-stage`,
      headers: { authorization: `Bearer ${admission1Token}` },
      payload: {
        stage: 'counseling_estimate',
        estimatedAmount: 75000,
        estimateSharedAt: new Date().toISOString(),
        note: 'Estimate counseling completed with patient family',
      },
    });
    expect(counselingRes.statusCode).toBe(200);
    const counselingCase = JSON.parse(counselingRes.payload);
    expect(counselingCase.stage).toBe('counseling_estimate');
    expect(Number(counselingCase.estimatedAmount)).toBe(75000);

    // 2. Advance to plan_accepted
    const acceptedRes = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${caseId}/advance-stage`,
      headers: { authorization: `Bearer ${admission1Token}` },
      payload: {
        stage: 'plan_accepted',
        depositReceived: true,
        depositAmount: 37500,
        expectedAdmissionDate: addDays(new Date(), 3).toISOString(),
        note: '50% advance deposit received',
      },
    });
    expect(acceptedRes.statusCode).toBe(200);
    const acceptedCase = JSON.parse(acceptedRes.payload);
    expect(acceptedCase.stage).toBe('plan_accepted');
    expect(acceptedCase.depositReceived).toBe(true);

    // 3. Test Decline handling: Create another case and decline with reason
    const declineCaseId = await createInPatientCase('M6 Declined Patient', '+919833300004');

    // Missing decline reason -> 400
    const failDeclineRes = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${declineCaseId}/advance-stage`,
      headers: { authorization: `Bearer ${admission1Token}` },
      payload: {
        stage: 'not_started',
      },
    });
    expect(failDeclineRes.statusCode).toBe(400);

    // Valid decline reason -> 200
    const succeedDeclineRes = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${declineCaseId}/advance-stage`,
      headers: { authorization: `Bearer ${admission1Token}` },
      payload: {
        stage: 'not_started',
        notStartedReasonId: costDeclineReasonId,
        note: 'Patient chose another hospital closer to home',
      },
    });
    expect(succeedDeclineRes.statusCode).toBe(200);
    const declinedCase = JSON.parse(succeedDeclineRes.payload);
    expect(declinedCase.stage).toBe('not_started');
    expect(declinedCase.notStartedReasonId).toBe(costDeclineReasonId);

    // Verify all open tasks were cancelled
    const openTasks = await prisma.task.findMany({
      where: { caseId: declineCaseId, status: 'open' },
    });
    expect(openTasks.length).toBe(0);
  });

  // -------------------------------------------------------------
  // Test 3: Admission Desk Reports Endpoint
  // -------------------------------------------------------------
  it('generates Admission Desk metrics and conversion funnel report', async () => {
    const reportRes = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/admission',
      headers: { authorization: `Bearer ${managerToken}` },
    });

    expect(reportRes.statusCode).toBe(200);
    const report = JSON.parse(reportRes.payload);

    expect(report.advised).toBeGreaterThanOrEqual(1);
    expect(typeof report.contactedWithin24h).toBe('number');
    expect(typeof report.contactRate).toBe('number');
    expect(report.admitted).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(report.declinedReasons)).toBe(true);
    expect(Array.isArray(report.overdueFollowUps)).toBe(true);
  });
});

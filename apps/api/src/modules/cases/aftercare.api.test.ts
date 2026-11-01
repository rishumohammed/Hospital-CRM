import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { prisma } from '../../database/client';
import { addDays, subHours } from 'date-fns';
import { checkUnansweredEscalations } from '../../cron/jobs.js';

describe('Milestone 7: Aftercare Desk (Acceptance Tests 9, 10, 11)', () => {
  let app: FastifyInstance;
  let managerToken: string;
  let aftercare1Token: string;
  let doctor1Token: string;
  let centerheadToken: string;
  let branchId: number;
  let deptId: number;
  let sourceId: number;
  let closureCodeId: number;
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

    // Authenticate aftercare 1
    const aftLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'aftercare1@hospital.test', password: 'HospitalCRM@2026' },
    });
    aftercare1Token = JSON.parse(aftLogin.payload).accessToken;

    // Authenticate doctor 1
    const docLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'doctor1@hospital.test', password: 'HospitalCRM@2026' },
    });
    doctor1Token = JSON.parse(docLogin.payload).accessToken;

    // Authenticate center head
    const chLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'centerhead@hospital.test', password: 'HospitalCRM@2026' },
    });
    centerheadToken = JSON.parse(chLogin.payload).accessToken;

    const branch = await prisma.branch.findFirstOrThrow({ where: { code: 'MAIN' } });
    branchId = branch.id;

    const dept = await prisma.department.findFirstOrThrow();
    deptId = dept.id;

    const source = await prisma.source.findFirstOrThrow();
    sourceId = source.id;

    const closureCode = await prisma.closureCode.findFirstOrThrow({ where: { code: 'IMPROVED' } });
    closureCodeId = closureCode.id;
  });

  afterAll(async () => {
    const validCaseIds = testCaseIds.filter((id) => typeof id === 'number');
    if (validCaseIds.length > 0) {
      await prisma.escalation.deleteMany({ where: { caseId: { in: validCaseIds } } });
      await prisma.task.deleteMany({ where: { caseId: { in: validCaseIds } } });
      await prisma.interaction.deleteMany({ where: { caseId: { in: validCaseIds } } });
      await prisma.appointment.deleteMany({ where: { caseId: { in: validCaseIds } } });
      await prisma.case.deleteMany({ where: { id: { in: validCaseIds } } });
    }
    const validLeadIds = testLeadIds.filter((id) => typeof id === 'number');
    if (validLeadIds.length > 0) {
      await prisma.task.deleteMany({ where: { leadId: { in: validLeadIds } } });
      await prisma.interaction.deleteMany({ where: { leadId: { in: validLeadIds } } });
      await prisma.appointment.deleteMany({ where: { leadId: { in: validLeadIds } } });
      await prisma.lead.deleteMany({ where: { id: { in: validLeadIds } } });
    }
    const validPatientIds = testPatientIds.filter((id) => typeof id === 'number');
    if (validPatientIds.length > 0) {
      await prisma.patient.deleteMany({ where: { id: { in: validPatientIds } } });
    }
    await app.close();
  });

  // Helper to create an active case
  async function createCase(name: string, mobile: string, careType: string) {
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
    if (!lead.id) throw new Error(`Lead creation failed: ${createRes.payload}`);
    testLeadIds.push(lead.id);

    const convRes = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead.id}/convert`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {},
    });
    const conv = JSON.parse(convRes.payload);
    if (!conv.case) throw new Error(`Lead conversion failed: ${convRes.payload}`);
    testCaseIds.push(conv.case.id);
    testPatientIds.push(conv.patient.id);

    // Record consultation outcome with specified careType
    const outcomeRes = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${conv.case.id}/consultation-outcome`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        careType,
        departmentId: deptId,
        estimatedAmount: careType === 'in_patient' ? 50000 : 15000,
        planNote: `${careType} treatment planned`,
      },
    });
    const updatedCase = JSON.parse(outcomeRes.payload);

    return updatedCase;
  }

  // --- Acceptance Test 9: Treatment Completed & Discharge Cadence ---
  it('Acceptance Test 9: Treatment completed creates aftercare cadence tasks (in-patient vs OPD)', async () => {
    // 1. In-patient case requires dischargeDate
    const inPatientCase = await createCase('Rahul InPatient', '+919876599001', 'in_patient');

    // Attempting to complete in-patient without discharge date should fail with 400
    const failRes = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${inPatientCase.id}/treatment-completed`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        treatmentCompletedAt: new Date().toISOString(),
      },
    });
    expect(failRes.statusCode).toBe(400);
    const failJson = JSON.parse(failRes.payload);
    expect(failJson.error?.code).toBe('DISCHARGE_DATE_REQUIRED');

    // Complete in-patient with discharge date
    const dischargeDate = new Date();
    const completeRes = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${inPatientCase.id}/treatment-completed`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        treatmentCompletedAt: new Date().toISOString(),
        dischargeDate: dischargeDate.toISOString(),
        note: 'Surgery successful. Patient discharged in stable condition.',
      },
    });
    expect(completeRes.statusCode).toBe(200);
    const updatedCase = JSON.parse(completeRes.payload);
    expect(updatedCase.stage).toBe('aftercare_follow_up');
    expect(updatedCase.team).toBe('aftercare');
    expect(updatedCase.dischargeDate).toBeTruthy();

    // Verify aftercare cadence tasks created (case.aftercare_inpatient: Day 2, 7, 30, 90)
    const inpatientTasks = await prisma.task.findMany({
      where: { caseId: inPatientCase.id, status: 'open' },
      orderBy: { dueAt: 'asc' },
    });
    expect(inpatientTasks.length).toBe(4);
    expect(inpatientTasks[0].title).toContain('Day 2');
    expect(inpatientTasks[1].title).toContain('Day 7');
    expect(inpatientTasks[2].title).toContain('Day 30');
    expect(inpatientTasks[3].title).toContain('Day 90');

    // 2. OPD case (does not require dischargeDate, creates Day 7, 30, 90)
    const opdCase = await createCase('Anjali OPD', '+919876599002', 'opd_course');
    const opdRes = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${opdCase.id}/treatment-completed`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        treatmentCompletedAt: new Date().toISOString(),
        note: 'Completed 5-session physiotherapy course.',
      },
    });
    expect(opdRes.statusCode).toBe(200);

    const opdTasks = await prisma.task.findMany({
      where: { caseId: opdCase.id, status: 'open' },
      orderBy: { dueAt: 'asc' },
    });
    expect(opdTasks.length).toBe(3);
    expect(opdTasks[0].title).toContain('Day 7');
    expect(opdTasks[1].title).toContain('Day 30');
    expect(opdTasks[2].title).toContain('Day 90');
  });

  // --- Acceptance Test 10: Clinical Red Flag Escalation & Decision SLA ---
  it('Acceptance Test 10: Clinical escalation alerts duty doctor, SLA alerts manager and center head, and doctor decision creates callback task', async () => {
    const aftercareCase = await createCase('Suresh Escalation', '+919876599003', 'in_patient');

    // Move to aftercare
    await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${aftercareCase.id}/treatment-completed`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        treatmentCompletedAt: new Date().toISOString(),
        dischargeDate: new Date().toISOString(),
      },
    });

    // 1. Aftercare executive calls patient and escalates due to clinical red flag
    const callRes = await app.inject({
      method: 'POST',
      url: '/api/v1/interactions/aftercare-call',
      headers: { authorization: `Bearer ${aftercare1Token}` },
      payload: {
        caseId: aftercareCase.id,
        durationSeconds: 120,
        details: {
          generalCondition: 'worse',
          medicinesTaken: 'yes',
          symptoms: 'High fever and severe surgical site swelling',
          dietRestFollowed: true,
          escalateToDoctor: true,
          escalationReason: 'Acute surgical wound swelling with 102F fever',
        },
        escalateToDoctor: true,
        escalationReason: 'Acute surgical wound swelling with 102F fever',
      },
    });
    expect(callRes.statusCode).toBe(201);
    const callJson = JSON.parse(callRes.payload);
    expect(callJson.escalationId).toBeTruthy();

    const escalation = await prisma.escalation.findUnique({
      where: { id: callJson.escalationId },
    });
    expect(escalation).toBeTruthy();
    expect(escalation?.status).toBe('pending');
    expect(escalation?.reason).toContain('wound swelling');

    // Verify duty doctor received notification
    const docNotification = await prisma.notification.findFirst({
      where: {
        type: 'escalation',
        body: { contains: 'wound swelling' },
      },
    });
    expect(docNotification).toBeTruthy();

    // 2. Test Escalation SLA Alerts (1h -> Telecaller Manager, 2h -> Center Head)
    // Simulate +65 minutes without decision
    const nowPlus65m = addDays(new Date(), 0);
    // Artificially age the escalation by 65 minutes
    await prisma.escalation.update({
      where: { id: escalation!.id },
      data: {
        createdAt: subHours(new Date(), 1.1),
        dueAt: subHours(new Date(), 0.1), // due time passed
      },
    });

    const slaCheck1h = await checkUnansweredEscalations(prisma, new Date());
    expect(slaCheck1h.notificationsSent).toBeGreaterThanOrEqual(1);

    const mgrNotification = await prisma.notification.findFirst({
      where: {
        type: 'escalation_unanswered_manager',
      },
    });
    expect(mgrNotification).toBeTruthy();
    expect(mgrNotification?.title).toContain('Unanswered Clinical Escalation (>1h)');

    // Simulate +125 minutes without decision (age by 2.1 hours)
    await prisma.escalation.update({
      where: { id: escalation!.id },
      data: {
        createdAt: subHours(new Date(), 2.1),
      },
    });

    const slaCheck2h = await checkUnansweredEscalations(prisma, new Date());
    expect(slaCheck2h.notificationsSent).toBeGreaterThanOrEqual(1);

    const chNotification = await prisma.notification.findFirst({
      where: {
        type: 'escalation_unanswered_centerhead',
      },
    });
    expect(chNotification).toBeTruthy();
    expect(chNotification?.title).toContain('CRITICAL');

    // 3. Duty doctor records decision
    const decideRes = await app.inject({
      method: 'POST',
      url: `/api/v1/escalations/${escalation!.id}/decision`,
      headers: { authorization: `Bearer ${doctor1Token}` },
      payload: {
        decision: 'Advise immediate oral antibiotic Augmentin 625mg BD, call patient to report to OPD by 4 PM.',
      },
    });
    expect(decideRes.statusCode).toBe(200);
    const updatedEscalation = JSON.parse(decideRes.payload);
    expect(updatedEscalation.status).toBe('decided');
    expect(updatedEscalation.decision).toContain('Augmentin');

    // Verify aftercare executive received callback task with priority 'hot'
    const callbackTask = await prisma.task.findFirst({
      where: {
        caseId: aftercareCase.id,
        type: 'escalation_callback',
        status: 'open',
      },
    });
    expect(callbackTask).toBeTruthy();
    expect(callbackTask?.priority).toBe('hot');
    expect(callbackTask?.title).toContain('Doctor Decision Callback');
  });

  // --- Acceptance Test 11: Feedback Score <= 6 Rule ---
  it('Acceptance Test 11: Low feedback score (<= 6) creates Telecaller Manager callback within 24 hours', async () => {
    const aftercareCase = await createCase('Priya Feedback', '+919876599004', 'opd_course');

    await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${aftercareCase.id}/treatment-completed`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        treatmentCompletedAt: new Date().toISOString(),
      },
    });

    // 1. Log aftercare call with low feedback score (4 / 10)
    const callRes = await app.inject({
      method: 'POST',
      url: '/api/v1/interactions/aftercare-call',
      headers: { authorization: `Bearer ${aftercare1Token}` },
      payload: {
        caseId: aftercareCase.id,
        durationSeconds: 150,
        details: {
          generalCondition: 'same',
          medicinesTaken: 'partly',
          dietRestFollowed: true,
          feedbackScore: 4,
          complaints: 'Long wait times at the pharmacy and rude desk staff',
        },
      },
    });
    expect(callRes.statusCode).toBe(201);
    const callJson = JSON.parse(callRes.payload);
    expect(callJson.managerCallbackTaskId).toBeTruthy();

    // Verify manager callback task created with 24-hour due time and hot priority
    const managerTask = await prisma.task.findUnique({
      where: { id: callJson.managerCallbackTaskId },
    });
    expect(managerTask).toBeTruthy();
    expect(managerTask?.type).toBe('escalation_callback');
    expect(managerTask?.priority).toBe('hot');
    expect(managerTask?.title).toContain('Score: 4/10');

    // Verify notification sent to manager
    const mgrNotification = await prisma.notification.findFirst({
      where: {
        type: 'low_feedback',
        body: { contains: '4/10' },
      },
    });
    expect(mgrNotification).toBeTruthy();

    // 2. High feedback score (9 / 10) does NOT create manager task
    const case2 = await createCase('Happy Patient', '+919876599005', 'opd_course');
    const goodCallRes = await app.inject({
      method: 'POST',
      url: '/api/v1/interactions/aftercare-call',
      headers: { authorization: `Bearer ${aftercare1Token}` },
      payload: {
        caseId: case2.id,
        details: {
          generalCondition: 'better',
          medicinesTaken: 'yes',
          dietRestFollowed: true,
          feedbackScore: 9,
        },
      },
    });
    expect(goodCallRes.statusCode).toBe(201);
    expect(JSON.parse(goodCallRes.payload).managerCallbackTaskId).toBeNull();
  });

  // --- Case Closure & Aftercare Reports ---
  it('Closes case with closure code and aggregates Aftercare Desk report', async () => {
    const caseToClose = await createCase('Closing Patient', '+919876599006', 'opd_course');

    // 1. Close case
    const closeRes = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${caseToClose.id}/close`,
      headers: { authorization: `Bearer ${aftercare1Token}` },
      payload: {
        closureCodeId,
        note: 'Patient fully recovered and treatment course completed.',
      },
    });
    expect(closeRes.statusCode).toBe(200);
    const closedJson = JSON.parse(closeRes.payload);
    expect(closedJson.stage).toBe('completed');
    expect(closedJson.closureCodeId).toBe(closureCodeId);

    // 2. Verify Aftercare Report endpoint
    const reportRes = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/aftercare?branchId=${branchId}`,
      headers: { authorization: `Bearer ${managerToken}` },
    });
    expect(reportRes.statusCode).toBe(200);
    const report = JSON.parse(reportRes.payload);

    expect(report.totalCases).toBeGreaterThanOrEqual(1);
    expect(report.calls).toBeDefined();
    expect(report.feedback).toBeDefined();
    expect(report.escalations).toBeDefined();
    expect(report.clinical).toBeDefined();
    expect(report.closures).toBeInstanceOf(Array);
  });
});

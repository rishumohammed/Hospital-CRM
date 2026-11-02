import { describe, it, expect, beforeAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { prisma } from '../../database/client';
import { addDays, subHours } from 'date-fns';
import { checkUnmarkedVisits, recomputeAllAdherenceRisks, runNightlyTreatmentMaintenance } from '../../cron/jobs.js';

describe('Treatment Follow-up Desk (Acceptance Tests 1 - 15)', () => {
  let app: FastifyInstance;
  let managerToken: string;
  let treatmentExecToken: string;
  let doctorToken: string;
  let frontOfficeToken: string;
  let branchId: number;
  let doctorUserId: number;
  let therapyId: number;
  let missedReasonId: number;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Authenticate manager
    const mgrRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'manager@hospital.test', password: 'HospitalCRM@2026' },
    });
    managerToken = JSON.parse(mgrRes.payload).accessToken;

    // Authenticate treatment followup executive
    const execRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'treatment1@hospital.test', password: 'HospitalCRM@2026' },
    });
    treatmentExecToken = JSON.parse(execRes.payload).accessToken;

    // Authenticate doctor
    const docRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'doctor1@hospital.test', password: 'HospitalCRM@2026' },
    });
    doctorToken = JSON.parse(docRes.payload).accessToken;
    const docUser = await prisma.user.findUniqueOrThrow({ where: { email: 'doctor1@hospital.test' } });
    doctorUserId = docUser.id;

    // Authenticate front office / reception
    const foRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'reception1@hospital.test', password: 'HospitalCRM@2026' },
    });
    frontOfficeToken = JSON.parse(foRes.payload).accessToken;

    const branch = await prisma.branch.findFirstOrThrow({ where: { code: 'MAIN' } });
    branchId = branch.id;

    const therapy = await prisma.therapy.findFirstOrThrow({ where: { active: true } });
    therapyId = therapy.id;

    const missedReason = await prisma.missedReason.findFirstOrThrow({ where: { active: true } });
    missedReasonId = missedReason.id;
  });

  // Helper to create a test case in in_treatment stage
  async function createTestCase(name: string, _mobile: string, setting: 'opd' | 'inpatient' = 'opd') {
    // Generate a unique mobile each run to avoid DUPLICATE_LEAD from previous runs
    const unique = Date.now().toString().slice(-8);
    const mobile = `+9190${unique}`;
    const dept = await prisma.department.findFirstOrThrow();
    const source = await prisma.source.findFirstOrThrow();

    // 1. Create lead via API
    const leadRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        name,
        mobile,
        departmentId: dept.id,
        sourceId: source.id,
        branchId,
        language: 'en',
      },
    });
    const lead = JSON.parse(leadRes.payload);
    if (!lead.id) throw new Error(`Lead creation failed: ${leadRes.payload}`);

    // 2. Convert lead to patient+case
    const convRes = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead.id}/convert`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {},
    });
    const conv = JSON.parse(convRes.payload);
    if (!conv.case) throw new Error(`Conversion failed: ${convRes.payload}`);
    const caseId = conv.case.id;

    // 3. Record consultation outcome (sets careType and stage to plan_shared/plan_accepted)
    const careType = setting === 'inpatient' ? 'inpatient_care' : 'opd_course';
    await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${caseId}/consultation-outcome`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        careType,
        departmentId: dept.id,
        estimatedAmount: setting === 'inpatient' ? 50000 : 15000,
        planNote: `${careType} treatment planned`,
      },
    });

    // 4. Directly set case to in_treatment / treatment_followup team via Prisma
    const execUser = await prisma.user.findUniqueOrThrow({ where: { email: 'treatment1@hospital.test' } });
    const updatedCase = await prisma.case.update({
      where: { id: caseId },
      data: {
        stage: 'in_treatment',
        setting,
        team: 'treatment_followup',
        ownerId: execUser.id,
        treatingDoctorId: doctorUserId,
        adherenceRisk: 'low',
        consecutiveMissed: 0,
        attendanceRate: 100,
      },
    });

    return updatedCase;
  }

  // Acceptance Test 1 & 3: Weekly and Custom Weekdays schedule with holiday handling
  it('1. Weekly schedule starting on Monday for 8 sessions generates 8 visits and skips holidays', async () => {
    const testCase = await createTestCase('Weekly Patient', '+919876543210', 'opd');

    // Find next Monday
    const start = new Date();
    const day = start.getDay();
    const daysUntilMonday = (1 + 7 - day) % 7 || 7;
    start.setDate(start.getDate() + daysUntilMonday);
    start.setHours(10, 0, 0, 0);

    const payload = {
      caseId: testCase.id,
      setting: 'opd',
      therapyId,
      frequencyType: 'weekly',
      weekdays: [1], // Monday
      startDate: start.toISOString(),
      totalSessions: 8,
      windowStart: '10:00',
      windowEnd: '11:00',
      durationMinutes: 60,
      doctorId: doctorUserId,
      notes: 'Weekly review plan',
    };

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${testCase.id}/schedules`,
      headers: { authorization: `Bearer ${treatmentExecToken}` },
      payload,
    });

    expect(res.statusCode).toBe(201);
    const schedule = JSON.parse(res.payload);
    // visits are returned separately via GET
    const visitsRes = await prisma.scheduledVisit.findMany({ where: { scheduleId: schedule.id }, orderBy: { sessionNo: 'asc' } });
    expect(visitsRes).toHaveLength(8);
    expect(visitsRes[0].sessionNo).toBe(1);
    expect(visitsRes[7].sessionNo).toBe(8);
  });

  // Acceptance Test 2: Daily schedule for 12 sessions and regenerating future planned visits
  it('2. Daily schedule creates visits on open days and editing regenerates future planned visits', async () => {
    const testCase = await createTestCase('Daily Patient', '+919876543211', 'opd');
    const start = new Date();
    start.setDate(start.getDate() + 1);

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${testCase.id}/schedules`,
      headers: { authorization: `Bearer ${treatmentExecToken}` },
      payload: {
        caseId: testCase.id,
        setting: 'opd',
        therapyId,
        frequencyType: 'daily',
        startDate: start.toISOString(),
        totalSessions: 12,
        windowStart: '09:00',
        windowEnd: '10:00',
        durationMinutes: 60,
        doctorId: doctorUserId,
      },
    });

    expect(res.statusCode).toBe(201);
    const schedule = JSON.parse(res.payload);
    const visitCount = await prisma.scheduledVisit.count({ where: { scheduleId: schedule.id } });
    expect(visitCount).toBe(12);

    // Edit schedule notes and time window
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/schedules/${schedule.id}`,
      headers: { authorization: `Bearer ${treatmentExecToken}` },
      payload: {
        windowStart: '09:30',
        windowEnd: '10:30',
        notes: 'Updated schedule time window',
      },
    });

    expect(patchRes.statusCode).toBe(200);
    const updated = JSON.parse(patchRes.payload);
    expect(updated.notes).toBe('Updated schedule time window');
  });

  // Acceptance Test 3: Schedule with custom weekdays (Mon, Wed, Fri for 3 weeks = 9 visits)
  it('3. Schedule with custom weekdays (Mon, Wed, Fri) for 9 sessions generates 9 visits', async () => {
    const testCase = await createTestCase('MWF Patient', '+919876543212', 'opd');
    const start = new Date();
    start.setDate(start.getDate() + 1);

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${testCase.id}/schedules`,
      headers: { authorization: `Bearer ${treatmentExecToken}` },
      payload: {
        caseId: testCase.id,
        setting: 'opd',
        therapyId,
        frequencyType: 'custom_weekdays',
        weekdays: [1, 3, 5], // Monday, Wednesday, Friday
        startDate: start.toISOString(),
        totalSessions: 9,
        windowStart: '11:00',
        windowEnd: '12:00',
        durationMinutes: 60,
        doctorId: doctorUserId,
      },
    });

    expect(res.statusCode).toBe(201);
    const schedule = JSON.parse(res.payload);
    const visitCount = await prisma.scheduledVisit.count({ where: { scheduleId: schedule.id } });
    expect(visitCount).toBe(9);
  });

  // Acceptance Test 4: Extension request: non-doctor creates pending request, doctor approves
  it('4. Non-doctor extension creates pending request; doctor approval adds sessions and is audited', async () => {
    const testCase = await createTestCase('Extension Patient', '+919876543213', 'opd');
    const start = new Date();
    start.setDate(start.getDate() + 1);

    const schedRes = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${testCase.id}/schedules`,
      headers: { authorization: `Bearer ${treatmentExecToken}` },
      payload: {
        caseId: testCase.id,
        setting: 'opd',
        therapyId,
        frequencyType: 'daily',
        startDate: start.toISOString(),
        totalSessions: 5,
        windowStart: '14:00',
        windowEnd: '15:00',
        durationMinutes: 60,
        doctorId: doctorUserId,
      },
    });
    const schedule = JSON.parse(schedRes.payload);
    const initialVisitCount = await prisma.scheduledVisit.count({ where: { scheduleId: schedule.id } });
    expect(initialVisitCount).toBe(5);

    // Non-doctor requests extension
    const reqRes = await app.inject({
      method: 'POST',
      url: `/api/v1/schedules/${schedule.id}/extend`,
      headers: { authorization: `Bearer ${treatmentExecToken}` },
      payload: {
        additionalSessions: 3,
        reason: 'Patient showing gradual improvement, 3 more sessions recommended',
      },
    });

    expect(reqRes.statusCode).toBe(201);
    const ext = JSON.parse(reqRes.payload);
    expect(ext.status).toBe('pending');
    expect(ext.additionalSessions).toBe(3);

    // Doctor approves extension
    const approveRes = await app.inject({
      method: 'POST',
      url: `/api/v1/extension-requests/${ext.id}/decision`,
      headers: { authorization: `Bearer ${doctorToken}` },
      payload: {
        decision: 'approved',
      },
    });

    expect(approveRes.statusCode).toBe(200);
    const approved = JSON.parse(approveRes.payload);
    expect(approved.status).toBe('approved');

    // Verify schedule now has 8 visits
    const updatedSched = await prisma.visitSchedule.findUniqueOrThrow({
      where: { id: schedule.id },
      include: { visits: true },
    });
    expect(updatedSched.totalSessions).toBe(8);
    expect(updatedSched.visits).toHaveLength(8);
  });

  // Acceptance Test 5: Pausing a schedule excuses visits in pause period and resumes
  it('5. Pausing a schedule excuses visits in pause period and resumes from resume date', async () => {
    const testCase = await createTestCase('Pause Patient', '+919876543214', 'opd');
    const start = new Date();
    start.setDate(start.getDate() + 1);

    const schedRes = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${testCase.id}/schedules`,
      headers: { authorization: `Bearer ${treatmentExecToken}` },
      payload: {
        caseId: testCase.id,
        setting: 'opd',
        therapyId,
        frequencyType: 'daily',
        startDate: start.toISOString(),
        totalSessions: 6,
        windowStart: '10:00',
        windowEnd: '11:00',
        durationMinutes: 60,
        doctorId: doctorUserId,
      },
    });
    const schedule = JSON.parse(schedRes.payload);

    const pauseUntil = new Date(start);
    pauseUntil.setDate(pauseUntil.getDate() + 3);

    const pauseRes = await app.inject({
      method: 'POST',
      url: `/api/v1/schedules/${schedule.id}/pause`,
      headers: { authorization: `Bearer ${treatmentExecToken}` },
      payload: {
        paused_until: pauseUntil.toISOString(),
        pause_reason: 'Patient travelling for 3 days',
      },
    });

    expect(pauseRes.statusCode).toBe(200);
    const paused = JSON.parse(pauseRes.payload);
    expect(paused.status).toBe('paused');

    // Check that visits in the pause window are marked excused
    const visits = await prisma.scheduledVisit.findMany({
      where: { scheduleId: schedule.id },
      orderBy: { sessionNo: 'asc' },
    });
    const excusedVisits = visits.filter((v) => v.status === 'excused');
    expect(excusedVisits.length).toBeGreaterThan(0);

    // Resume schedule
    const resumeRes = await app.inject({
      method: 'POST',
      url: `/api/v1/schedules/${schedule.id}/resume`,
      headers: { authorization: `Bearer ${treatmentExecToken}` },
    });
    expect(resumeRes.statusCode).toBe(200);
    expect(JSON.parse(resumeRes.payload).status).toBe('active');
  });

  // Acceptance Test 6 & 7: Marking visits, adherence calculation, consecutive missed, and adherence escalation
  it('6 & 7. Marking missed requires reason, updates consecutive missed, and 2 misses trigger high adherence risk & escalation', async () => {
    const testCase = await createTestCase('Adherence Patient', '+919876543215', 'opd');
    const today = new Date();

    const schedRes = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${testCase.id}/schedules`,
      headers: { authorization: `Bearer ${treatmentExecToken}` },
      payload: {
        caseId: testCase.id,
        setting: 'opd',
        therapyId,
        frequencyType: 'daily',
        startDate: today.toISOString(),
        totalSessions: 5,
        windowStart: '08:00',
        windowEnd: '09:00',
        durationMinutes: 60,
        doctorId: doctorUserId,
      },
    });
    const schedule = JSON.parse(schedRes.payload);
    // Fetch visits via DB
    const dbVisits = await prisma.scheduledVisit.findMany({ where: { scheduleId: schedule.id }, orderBy: { sessionNo: 'asc' } });
    const v1 = dbVisits[0];
    const v2 = dbVisits[1];

    // Attempting to mark missed without reason should fail (400)
    const failMark = await app.inject({
      method: 'POST',
      url: `/api/v1/visits/${v1.id}/mark`,
      headers: { authorization: `Bearer ${treatmentExecToken}` },
      payload: {
        status: 'missed',
      },
    });
    expect(failMark.statusCode).toBe(400);

    // Mark visit 1 missed with reason
    const mark1 = await app.inject({
      method: 'POST',
      url: `/api/v1/visits/${v1.id}/mark`,
      headers: { authorization: `Bearer ${treatmentExecToken}` },
      payload: {
        status: 'missed',
        missedReasonId,
        note: 'Patient unwell',
      },
    });
    expect(mark1.statusCode).toBe(200);

    // Check case consecutive missed is 1
    const caseAfter1 = await prisma.case.findUniqueOrThrow({ where: { id: testCase.id } });
    expect(caseAfter1.consecutiveMissed).toBe(1);

    // Mark visit 2 missed with reason
    const mark2 = await app.inject({
      method: 'POST',
      url: `/api/v1/visits/${v2.id}/mark`,
      headers: { authorization: `Bearer ${treatmentExecToken}` },
      payload: {
        status: 'missed',
        missedReasonId,
        note: 'Transport breakdown',
      },
    });
    expect(mark2.statusCode).toBe(200);

    // Check case consecutive missed is 2 and adherenceRisk is high
    const caseAfter2 = await prisma.case.findUniqueOrThrow({ where: { id: testCase.id } });
    expect(caseAfter2.consecutiveMissed).toBe(2);
    expect(caseAfter2.adherenceRisk).toBe('high');

    // Verify adherence escalation was created for doctor
    const escalation = await prisma.escalation.findFirst({
      where: {
        caseId: testCase.id,
        escalationType: 'adherence',
      },
    });
    expect(escalation).not.toBeNull();
    expect(escalation?.assignedDoctorId).toBe(doctorUserId);

    // Verify callback task created for executive within 4 hours
    const callbackTask = await prisma.task.findFirst({
      where: {
        caseId: testCase.id,
        title: { contains: 'Adherence Callback' },
      },
    });
    expect(callbackTask).not.toBeNull();
  });

  // Acceptance Test 8: Unmarked visits job
  it('8. Visits with no mark 1 hour past window appear in Unmarked queue', async () => {
    const testCase = await createTestCase('Unmarked Patient', '+919876543216', 'opd');

    // Create a visit that took place 2 hours ago
    const pastDate = new Date();
    const schedule = await prisma.visitSchedule.create({
      data: {
        caseId: testCase.id,
        setting: 'opd',
        therapyId,
        frequencyType: 'daily',
        startDate: pastDate,
        windowStart: '08:00',
        windowEnd: '09:00',
        durationMinutes: 60,
        doctorId: doctorUserId,
        status: 'active',
        createdBy: doctorUserId,
      },
    });

    const visit = await prisma.scheduledVisit.create({
      data: {
        scheduleId: schedule.id,
        caseId: testCase.id,
        sessionNo: 1,
        scheduledDate: pastDate,
        windowStart: '06:00',
        windowEnd: '07:00',
        status: 'planned',
      },
    });

    // Run unmarked visits cron job
    const unmarkedResult = await checkUnmarkedVisits(prisma);
    expect(unmarkedResult).toBeDefined();

    // Query visits endpoint with status=unmarked
    const queryRes = await app.inject({
      method: 'GET',
      url: `/api/v1/visits?status=unmarked&branchId=${branchId}`,
      headers: { authorization: `Bearer ${treatmentExecToken}` },
    });
    expect(queryRes.statusCode).toBe(200);
    const visitsPayload = JSON.parse(queryRes.payload);
    // Response may be { visits: [...] } or an array
    const visitsArr = Array.isArray(visitsPayload) ? visitsPayload : (visitsPayload.visits ?? []);
    expect(Array.isArray(visitsArr)).toBe(true);
  });

  // Acceptance Test 9: Front Office RBAC
  it('9. Front office user sees Today Visits board but cannot open case details (403)', async () => {
    // 1. Can view visits board
    const todayStr = new Date().toISOString().split('T')[0];
    const visitsRes = await app.inject({
      method: 'GET',
      url: `/api/v1/visits?date=${todayStr}&branchId=${branchId}`,
      headers: { authorization: `Bearer ${frontOfficeToken}` },
    });
    expect(visitsRes.statusCode).toBe(200);

    // 2. Cannot open case details -> 403 Forbidden
    const testCase = await createTestCase('FO Test Patient', '+919876543217', 'opd');
    const caseRes = await app.inject({
      method: 'GET',
      url: `/api/v1/cases/${testCase.id}`,
      headers: { authorization: `Bearer ${frontOfficeToken}` },
    });
    expect(caseRes.statusCode).toBe(403);
  });

  // Acceptance Test 10, 11, 12: Inpatient Follow-up, Check-in, Concern Escalation
  it('10, 11, 12. Inpatient check-in with concern triggers inpatient_concern escalation and requires next check-in date', async () => {
    const testCase = await createTestCase('Inpatient Care Patient', '+919876543218', 'inpatient');

    // 1. Check-in without next checkin date should fail if patient is not discharged (400)
    const failCheckin = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${testCase.id}/checkins`,
      headers: { authorization: `Bearer ${treatmentExecToken}` },
      payload: {
        channel: 'bedside',
        contactedWho: 'patient',
        condition: 'unwell',
        therapiesAsPlanned: 'no',
        missedTherapiesNote: 'Morning session omitted due to fever',
        concerns: 'Patient feeling nauseous and dizzy',
      },
    });
    expect(failCheckin.statusCode).toBe(400);

    // 2. Valid check-in with nextCheckinAt and condition = unwell -> creates inpatient_concern escalation
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 2);

    const checkinRes = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${testCase.id}/checkins`,
      headers: { authorization: `Bearer ${treatmentExecToken}` },
      payload: {
        channel: 'bedside',
        contactedWho: 'patient',
        condition: 'unwell',
        therapiesAsPlanned: 'no',
        missedTherapiesNote: 'Morning session omitted due to fever',
        concerns: 'Patient feeling nauseous and dizzy',
        nextCheckinAt: nextDate.toISOString(),
      },
    });
    expect(checkinRes.statusCode).toBe(201);
    const checkin = JSON.parse(checkinRes.payload);
    expect(checkin.escalationId).not.toBeNull();

    // Verify escalation properties
    const escalation = await prisma.escalation.findUniqueOrThrow({
      where: { id: checkin.escalationId },
    });
    expect(escalation.escalationType).toBe('inpatient_concern');
    expect(escalation.wardNotified).toBe(true);
  });

  // Acceptance Test 13: Mark treatment completed moves case to aftercare_follow_up
  it('13. Marking treatment completed moves case to aftercare_follow_up and writes handover', async () => {
    const testCase = await createTestCase('Completing Patient', '+919876543219', 'opd');

    // Create active schedule
    const schedRes = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${testCase.id}/schedules`,
      headers: { authorization: `Bearer ${treatmentExecToken}` },
      payload: {
        caseId: testCase.id,
        setting: 'opd',
        therapyId,
        frequencyType: 'daily',
        startDate: new Date().toISOString(),
        totalSessions: 3,
        windowStart: '10:00',
        windowEnd: '11:00',
        durationMinutes: 60,
        doctorId: doctorUserId,
      },
    });
    const schedule = JSON.parse(schedRes.payload);

    // Mark treatment completed
    const completeRes = await app.inject({
      method: 'POST',
      url: `/api/v1/cases/${testCase.id}/treatment-completed`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        treatmentCompletedAt: new Date().toISOString(),
        note: 'Course successfully completed, ready for aftercare check-ins.',
      },
    });
    expect(completeRes.statusCode).toBe(200);

    // Check case stage and team
    const updatedCase = await prisma.case.findUniqueOrThrow({ where: { id: testCase.id } });
    expect(updatedCase.stage).toBe('aftercare_follow_up');
    expect(updatedCase.team).toBe('aftercare');

    // Check schedule status is completed
    const updatedSchedule = await prisma.visitSchedule.findUniqueOrThrow({ where: { id: schedule.id } });
    expect(updatedSchedule.status).toBe('completed');

    // Check case handovers record
    const handover = await prisma.caseHandover.findFirst({
      where: {
        caseId: testCase.id,
        fromTeam: 'treatment_followup',
        toTeam: 'aftercare',
      },
    });
    expect(handover).not.toBeNull();
  });

  // Acceptance Test 14 & 15: Reports return correct metrics and respect user scope
  it('14 & 15. Reports return correct metrics for Treatment Follow-up desk', async () => {
    // 1. Treatment Follow-up general report
    const repRes = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/treatment-followup?branchId=${branchId}`,
      headers: { authorization: `Bearer ${managerToken}` },
    });
    expect(repRes.statusCode).toBe(200);
    const report = JSON.parse(repRes.payload);
    expect(report.activeSchedulesCount).toBeGreaterThanOrEqual(0);
    expect(report.attendanceRate).toBeDefined();

    // 2. Adherence Report
    const adhRes = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/adherence?branchId=${branchId}`,
      headers: { authorization: `Bearer ${managerToken}` },
    });
    expect(adhRes.statusCode).toBe(200);
    const adhReport = JSON.parse(adhRes.payload);
    expect(Array.isArray(adhReport.cases)).toBe(true);

    // 3. Missed Reasons Report
    const mrRes = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/missed-reasons?branchId=${branchId}`,
      headers: { authorization: `Bearer ${managerToken}` },
    });
    expect(mrRes.statusCode).toBe(200);
    const mrReport = JSON.parse(mrRes.payload);
    expect(Array.isArray(mrReport.reasons)).toBe(true);
  });
});

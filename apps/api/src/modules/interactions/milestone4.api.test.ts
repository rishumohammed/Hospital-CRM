import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { prisma } from '../../database/client';
import { checkSlaBreaches } from '../../cron/jobs';
import { subMinutes, addDays } from 'date-fns';

describe('Milestone 4: Tasks, Interactions & Cadence Engine (Acceptance Tests 4, 5, 6)', () => {
  let app: FastifyInstance;
  let managerToken: string;
  let telecaller1Token: string;
  let branchId: number;
  let ayurvedaDeptId: number;
  let websiteSourceId: number;
  let callbackOutcomeId: number;
  let interestedNotReadyOutcomeId: number;
  let testLeadIds: number[] = [];

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Authenticate Telecaller Manager
    const mgrLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'manager@hospital.test', password: 'HospitalCRM@2026' },
    });
    managerToken = JSON.parse(mgrLogin.payload).accessToken;

    // Authenticate Support Telecaller 1
    const t1Login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'telecaller1@hospital.test', password: 'HospitalCRM@2026' },
    });
    telecaller1Token = JSON.parse(t1Login.payload).accessToken;

    // Picklist & Branch IDs
    const branch = await prisma.branch.findFirstOrThrow({ where: { code: 'MAIN' } });
    branchId = branch.id;

    const dept = await prisma.department.findFirstOrThrow();
    ayurvedaDeptId = dept.id;

    const source = await prisma.source.findFirstOrThrow();
    websiteSourceId = source.id;

    const cbOutcome = await prisma.callOutcome.findFirstOrThrow({
      where: { OR: [{ code: 'CALLBACK_REQUESTED' }, { code: 'callback_requested' }] },
    });
    callbackOutcomeId = cbOutcome.id;

    const inrOutcome = await prisma.callOutcome.findFirstOrThrow({
      where: { OR: [{ code: 'INTERESTED_NOT_READY' }, { code: 'interested_not_ready' }] },
    });
    interestedNotReadyOutcomeId = inrOutcome.id;
  });

  afterAll(async () => {
    if (testLeadIds.length > 0) {
      await prisma.notification.deleteMany({
        where: { link: { in: testLeadIds.map((id) => `/leads/${id}`) } },
      });
      await prisma.task.deleteMany({ where: { leadId: { in: testLeadIds } } });
      await prisma.interaction.deleteMany({ where: { leadId: { in: testLeadIds } } });
      await prisma.appointment.deleteMany({ where: { leadId: { in: testLeadIds } } });
      await prisma.lead.deleteMany({ where: { id: { in: testLeadIds } } });
    }
    await app.close();
  });

  // -------------------------------------------------------------
  // Acceptance Test 4:
  // "An open lead cannot be saved or have a call logged without a next action and due time."
  // -------------------------------------------------------------
  it('Acceptance Test 4: Open lead cannot have a call logged without next action and due time', async () => {
    // 1. Create a fresh open lead
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        name: 'M4 Test Lead 1',
        mobile: '+919811100001',
        departmentId: ayurvedaDeptId,
        sourceId: websiteSourceId,
        branchId,
        language: 'en',
        concern: 'Test concern for Acceptance Test 4',
      },
    });
    expect(createRes.statusCode).toBe(201);
    const lead = JSON.parse(createRes.payload);
    testLeadIds.push(lead.id);

    // 2. Attempt to log call with outcome CALLBACK_REQUESTED WITHOUT nextAction
    const failedCallRes = await app.inject({
      method: 'POST',
      url: '/api/v1/interactions/call',
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        leadId: lead.id,
        outcomeId: callbackOutcomeId,
        note: 'Patient asked to call back next week',
        overrideReason: 'Initial contact call',
      },
    });

    expect(failedCallRes.statusCode).toBe(400);
    const failedBody = JSON.parse(failedCallRes.payload);
    expect(failedBody.error.code).toBe('NEXT_ACTION_REQUIRED');

    // 3. Now log call WITH mandatory next action and due time
    const nextDue = addDays(new Date(), 2).toISOString();
    const successCallRes = await app.inject({
      method: 'POST',
      url: '/api/v1/interactions/call',
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        leadId: lead.id,
        outcomeId: callbackOutcomeId,
        note: 'Patient requested callback on Wednesday',
        overrideReason: 'Initial contact call',
        nextAction: {
          type: 'call',
          title: 'Follow-up callback as requested',
          dueAt: nextDue,
          priority: 'warm',
        },
      },
    });

    expect(successCallRes.statusCode).toBe(201);

    // Verify task was created in database
    const createdTask = await prisma.task.findFirst({
      where: { leadId: lead.id, title: 'Follow-up callback as requested' },
    });
    expect(createdTask).not.toBeNull();
    expect(createdTask?.status).toBe('open');
  });

  // -------------------------------------------------------------
  // Acceptance Test 5:
  // "Logging outcome Interested Not Ready creates tasks at day 2, 7, 14, and 30;
  // changing the lead to appointment_booked cancels those tasks and creates the reminder tasks."
  // -------------------------------------------------------------
  it('Acceptance Test 5: Interested Not Ready creates cadence tasks; booking appointment cancels them and schedules reminders', async () => {
    // 1. Create a fresh lead
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        name: 'M4 Test Lead 2 (Interested Not Ready)',
        mobile: '+919811100002',
        departmentId: ayurvedaDeptId,
        sourceId: websiteSourceId,
        branchId,
        language: 'en',
      },
    });
    expect(createRes.statusCode).toBe(201);
    const lead = JSON.parse(createRes.payload);
    testLeadIds.push(lead.id);

    // 2. Log call with outcome INTERESTED_NOT_READY
    const callRes = await app.inject({
      method: 'POST',
      url: '/api/v1/interactions/call',
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        leadId: lead.id,
        outcomeId: interestedNotReadyOutcomeId,
        note: 'Interested in treatment package, waiting for leave approval',
        overrideReason: 'First evaluation call',
      },
    });
    expect(callRes.statusCode).toBe(201);

    // Verify that cadence tasks were generated
    const cadenceTasks = await prisma.task.findMany({
      where: { leadId: lead.id, cadenceKey: 'lead.interested_not_ready' },
      orderBy: { cadenceStep: 'asc' },
    });

    // Check steps at day 2, 7, 14, 30 exist
    expect(cadenceTasks.length).toBeGreaterThanOrEqual(4);
    const day2Task = cadenceTasks.find((t) => t.cadenceStep === 1);
    const day7Task = cadenceTasks.find((t) => t.cadenceStep === 2);
    const day14Task = cadenceTasks.find((t) => t.cadenceStep === 3);
    const day30Task = cadenceTasks.find((t) => t.cadenceStep === 4);

    expect(day2Task?.status).toBe('open');
    expect(day7Task?.status).toBe('open');
    expect(day14Task?.status).toBe('open');
    expect(day30Task?.status).toBe('open');

    // 3. Book an appointment for this lead
    const appointmentTime = addDays(new Date(), 3).toISOString();
    const bookRes = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead.id}/book-appointment`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        doctorName: 'Dr. Suresh Kumar',
        startsAt: appointmentTime,
        note: 'Confirmed OPD consultation appointment',
      },
    });

    expect(bookRes.statusCode).toBe(201);
    const bookData = JSON.parse(bookRes.payload);
    expect(bookData.lead.status).toBe('appointment_booked');

    // 4. Verify that previous cadence tasks were CANCELLED
    const cancelledTasks = await prisma.task.findMany({
      where: { leadId: lead.id, cadenceKey: 'lead.interested_not_ready' },
    });
    for (const t of cancelledTasks) {
      expect(t.status).toBe('cancelled');
    }

    // 5. Verify appointment reminder tasks & missed-recovery task were created
    const reminderTasks = await prisma.task.findMany({
      where: { leadId: lead.id, status: 'open' },
    });

    const reminder24h = reminderTasks.find((t) => t.cadenceKey === 'appointment.reminders' && t.cadenceStep === 1);
    const reminder2h = reminderTasks.find((t) => t.cadenceKey === 'appointment.reminders' && t.cadenceStep === 2);
    const missedTask = reminderTasks.find((t) => t.cadenceKey === 'appointment.missed');

    expect(reminder24h).toBeDefined();
    expect(reminder2h).toBeDefined();
    expect(missedTask).toBeDefined();
  });

  // -------------------------------------------------------------
  // Acceptance Test 6:
  // "A second call to the same lead on the same day shows a warning,
  // and proceeding needs an override reason that is saved."
  // -------------------------------------------------------------
  it('Acceptance Test 6: Second call same day requires override reason and persists it', async () => {
    // 1. Create a lead
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        name: 'M4 Test Lead 3 (Contact Rules)',
        mobile: '+919811100003',
        departmentId: ayurvedaDeptId,
        sourceId: websiteSourceId,
        branchId,
        language: 'en',
      },
    });
    expect(createRes.statusCode).toBe(201);
    const lead = JSON.parse(createRes.payload);
    testLeadIds.push(lead.id);

    // 2. First call today
    const firstCallRes = await app.inject({
      method: 'POST',
      url: '/api/v1/interactions/call',
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        leadId: lead.id,
        outcomeId: callbackOutcomeId,
        note: 'First call placed at 10 AM',
        overrideReason: 'Initial outreach',
        nextAction: {
          type: 'call',
          title: 'Evening check',
          dueAt: addDays(new Date(), 1).toISOString(),
        },
      },
    });
    expect(firstCallRes.statusCode).toBe(201);

    // Preflight limits check endpoint
    const checkLimitsRes = await app.inject({
      method: 'GET',
      url: `/api/v1/interactions/check-limits?leadId=${lead.id}`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
    });
    expect(checkLimitsRes.statusCode).toBe(200);
    const limitsCheck = JSON.parse(checkLimitsRes.payload);
    expect(limitsCheck.callsTodayCount).toBe(1);
    expect(limitsCheck.requiresOverride).toBe(true);
    expect(limitsCheck.warnings.length).toBeGreaterThan(0);

    // 3. Second call today WITHOUT override reason -> MUST BE REJECTED
    const secondCallNoOverride = await app.inject({
      method: 'POST',
      url: '/api/v1/interactions/call',
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        leadId: lead.id,
        outcomeId: callbackOutcomeId,
        note: 'Attempting second call without override',
        nextAction: {
          type: 'call',
          title: 'Next action',
          dueAt: addDays(new Date(), 2).toISOString(),
        },
      },
    });
    expect(secondCallNoOverride.statusCode).toBe(422);
    const noOverrideBody = JSON.parse(secondCallNoOverride.payload);
    expect(noOverrideBody.error.code).toBe('OVERRIDE_REASON_REQUIRED');

    // 4. Second call WITH override reason -> SUCCEEDS and persists reason
    const overrideText = 'Patient sent WhatsApp asking to call back immediately with package details';
    const secondCallWithOverride = await app.inject({
      method: 'POST',
      url: '/api/v1/interactions/call',
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        leadId: lead.id,
        outcomeId: callbackOutcomeId,
        note: 'Second call conducted with patient permission',
        overrideReason: overrideText,
        nextAction: {
          type: 'call',
          title: 'Follow-up',
          dueAt: addDays(new Date(), 2).toISOString(),
        },
      },
    });
    expect(secondCallWithOverride.statusCode).toBe(201);
    const savedInteraction = JSON.parse(secondCallWithOverride.payload);
    expect(savedInteraction.overrideReason).toBe(overrideText);

    // Verify in DB
    const dbRecord = await prisma.interaction.findUnique({
      where: { id: savedInteraction.id },
    });
    expect(dbRecord?.overrideReason).toBe(overrideText);
  });

  // -------------------------------------------------------------
  // Scheduled Job: SLA Breach Alert
  // -------------------------------------------------------------
  it('Scheduled Job: Marks breached leads and creates notification for Telecaller Manager', async () => {
    // Create a lead with firstResponseDueAt in the past
    const pastLead = await prisma.lead.create({
      data: {
        name: 'M4 Breached Lead',
        mobile: '+919811100099',
        mobileNorm: '+919811100099',
        departmentId: ayurvedaDeptId,
        sourceId: websiteSourceId,
        branchId,
        status: 'new',
        firstResponseDueAt: subMinutes(new Date(), 10),
        slaBreached: false,
      },
    });
    testLeadIds.push(pastLead.id);

    // Run pure job function
    const jobResult = await checkSlaBreaches(prisma);
    expect(jobResult.breachedCount).toBeGreaterThanOrEqual(1);

    // Verify lead slaBreached updated
    const updated = await prisma.lead.findUnique({ where: { id: pastLead.id } });
    expect(updated?.slaBreached).toBe(true);

    // Verify notification was sent to manager
    const notif = await prisma.notification.findFirst({
      where: {
        link: `/leads/${pastLead.id}`,
        type: 'sla_breach',
      },
    });
    expect(notif).not.toBeNull();
  });

  // -------------------------------------------------------------
  // Task Management: Snooze limit rule
  // -------------------------------------------------------------
  it('Task snooze rule: allows 2 snoozes, blocks 3rd without manager role', async () => {
    // 1. Create a task
    const task = await prisma.task.create({
      data: {
        type: 'call',
        title: 'Task for snooze testing',
        dueAt: addDays(new Date(), 1),
        priority: 'warm',
        ownerId: 5, // telecaller1
        status: 'open',
        snoozeCount: 0,
      },
    });

    // Snooze 1
    const snooze1 = await app.inject({
      method: 'POST',
      url: `/api/v1/tasks/${task.id}/snooze`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: { newDueAt: addDays(new Date(), 2).toISOString(), reason: 'First snooze' },
    });
    expect(snooze1.statusCode).toBe(200);

    // Snooze 2
    const snooze2 = await app.inject({
      method: 'POST',
      url: `/api/v1/tasks/${task.id}/snooze`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: { newDueAt: addDays(new Date(), 3).toISOString(), reason: 'Second snooze' },
    });
    expect(snooze2.statusCode).toBe(200);

    // Snooze 3 by regular telecaller -> BLOCKED (403)
    const snooze3 = await app.inject({
      method: 'POST',
      url: `/api/v1/tasks/${task.id}/snooze`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: { newDueAt: addDays(new Date(), 4).toISOString(), reason: 'Third snooze' },
    });
    expect(snooze3.statusCode).toBe(403);

    // Snooze 3 by telecaller manager -> ALLOWED (200)
    const snoozeByManager = await app.inject({
      method: 'POST',
      url: `/api/v1/tasks/${task.id}/snooze`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { newDueAt: addDays(new Date(), 4).toISOString(), reason: 'Manager approved 3rd snooze' },
    });
    expect(snoozeByManager.statusCode).toBe(200);

    await prisma.task.delete({ where: { id: task.id } });
  });
});

import { FastifyPluginAsync } from 'fastify';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import { Permissions } from '@hospital-crm/shared';
import {
  createVisitScheduleSchema,
  updateVisitScheduleSchema,
  pauseScheduleSchema,
  createExtensionRequestSchema,
  decideExtensionRequestSchema,
  markVisitAttendanceSchema,
  rescheduleVisitSchema,
  shiftVisitsSchema,
  addExtraVisitSchema,
  createTreatmentCheckinSchema,
} from '@hospital-crm/shared';
import {
  getCaseSchedules,
  createCaseSchedule,
  updateSchedule,
  pauseSchedule,
  resumeSchedule,
  extendSchedule,
  decideExtensionRequest,
  listPendingExtensionRequests,
  completeSchedule,
  cancelSchedule,
  previewSchedule,
  shiftScheduleVisits,
  addExtraVisit,
  getVisits,
  markVisitAttendance,
  rescheduleVisit,
  createTreatmentCheckin,
  getCaseCheckins,
  getTherapies,
  createTherapy,
  updateTherapy,
  getMissedReasons,
  createMissedReason,
  updateMissedReason,
} from './treatment.service';

export const treatmentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.register(async (authGroup) => {
    authGroup.addHook('preHandler', authenticate);

    // ==========================================
    // 1. Visit Schedules
    // ==========================================

    // Preview visits dates before saving
    authGroup.post(
      '/schedules/preview',
      { preHandler: [requirePermission(Permissions.SCHEDULE_VIEW, 'schedule')] },
      async (req, reply) => {
        const result = await previewSchedule(req.body, req.user!);
        return reply.send(result);
      }
    );

    authGroup.get(
      '/schedules/preview',
      { preHandler: [requirePermission(Permissions.SCHEDULE_VIEW, 'schedule')] },
      async (req, reply) => {
        const result = await previewSchedule(req.query, req.user!);
        return reply.send(result);
      }
    );

    // Get all schedules for a case
    authGroup.get(
      '/cases/:id/schedules',
      { preHandler: [requirePermission(Permissions.SCHEDULE_VIEW, 'schedule')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const caseId = parseInt(id, 10);
        if (isNaN(caseId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Case ID must be an integer' },
          });
        }
        const schedules = await getCaseSchedules(caseId, req.user!);
        return reply.send({ schedules });
      }
    );

    // Create a new schedule for a case
    authGroup.post(
      '/cases/:id/schedules',
      { preHandler: [requirePermission(Permissions.SCHEDULE_MANAGE, 'schedule')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const caseId = parseInt(id, 10);
        if (isNaN(caseId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Case ID must be an integer' },
          });
        }

        const parseResult = createVisitScheduleSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid schedule payload',
              details: parseResult.error.format(),
            },
          });
        }

        const schedule = await createCaseSchedule(
          caseId,
          parseResult.data,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.status(201).send(schedule);
      }
    );

    // Update schedule
    authGroup.patch(
      '/schedules/:id',
      { preHandler: [requirePermission(Permissions.SCHEDULE_MANAGE, 'schedule')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const scheduleId = parseInt(id, 10);
        if (isNaN(scheduleId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Schedule ID must be an integer' },
          });
        }

        const parseResult = updateVisitScheduleSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid schedule update payload',
              details: parseResult.error.format(),
            },
          });
        }

        const updated = await updateSchedule(
          scheduleId,
          parseResult.data,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(updated);
      }
    );

    // Pause schedule
    authGroup.post(
      '/schedules/:id/pause',
      { preHandler: [requirePermission(Permissions.SCHEDULE_MANAGE, 'schedule')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const scheduleId = parseInt(id, 10);
        if (isNaN(scheduleId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Schedule ID must be an integer' },
          });
        }

        const parseResult = pauseScheduleSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid pause schedule payload',
              details: parseResult.error.format(),
            },
          });
        }

        const pauseUntil = (parseResult.data.paused_until || parseResult.data.pausedUntil)!;
        const pauseReason = (parseResult.data.pause_reason || parseResult.data.pauseReason)!;

        const updated = await pauseSchedule(
          scheduleId,
          { pauseUntil, pauseReason },
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(updated);
      }
    );

    // Resume schedule
    authGroup.post(
      '/schedules/:id/resume',
      { preHandler: [requirePermission(Permissions.SCHEDULE_MANAGE, 'schedule')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const scheduleId = parseInt(id, 10);
        if (isNaN(scheduleId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Schedule ID must be an integer' },
          });
        }

        const updated = await resumeSchedule(
          scheduleId,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(updated);
      }
    );

    // Extend schedule (Doctor approves directly, non-doctor creates pending request)
    authGroup.post(
      '/schedules/:id/extend',
      { preHandler: [requirePermission(Permissions.SCHEDULE_MANAGE, 'schedule')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const scheduleId = parseInt(id, 10);
        if (isNaN(scheduleId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Schedule ID must be an integer' },
          });
        }

        const parseResult = createExtensionRequestSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid extend schedule payload',
              details: parseResult.error.format(),
            },
          });
        }

        const additionalSessions =
          parseResult.data.additional_sessions !== undefined
            ? (parseResult.data.additional_sessions ?? undefined)
            : (parseResult.data.additionalSessions ?? undefined);

        const newEndDate = parseResult.data.new_end_date || parseResult.data.newEndDate || undefined;

        const result = await extendSchedule(
          scheduleId,
          {
            additionalSessions,
            newEndDate,
            reason: parseResult.data.reason,
          },
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        const isCreated = result && 'pending' in result && result.pending;
        const statusCode = isCreated ? 201 : 200;
        const payload = (result && 'request' in result && result.request) ? result.request : result;
        return reply.status(statusCode).send(payload);
      }
    );

    // Complete schedule
    authGroup.post(
      '/schedules/:id/complete',
      { preHandler: [requirePermission(Permissions.SCHEDULE_MANAGE, 'schedule')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const scheduleId = parseInt(id, 10);
        if (isNaN(scheduleId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Schedule ID must be an integer' },
          });
        }

        const updated = await completeSchedule(
          scheduleId,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(updated);
      }
    );

    // Cancel schedule
    authGroup.post(
      '/schedules/:id/cancel',
      { preHandler: [requirePermission(Permissions.SCHEDULE_MANAGE, 'schedule')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const scheduleId = parseInt(id, 10);
        if (isNaN(scheduleId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Schedule ID must be an integer' },
          });
        }

        const updated = await cancelSchedule(
          scheduleId,
          req.body as any,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(updated);
      }
    );

    // Shift schedule visits by N days
    authGroup.post(
      '/schedules/:id/shift',
      { preHandler: [requirePermission(Permissions.SCHEDULE_MANAGE, 'schedule')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const scheduleId = parseInt(id, 10);
        if (isNaN(scheduleId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Schedule ID must be an integer' },
          });
        }

        const parseResult = shiftVisitsSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid shift schedule payload',
              details: parseResult.error.format(),
            },
          });
        }

        const result = await shiftScheduleVisits(
          scheduleId,
          parseResult.data,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(result);
      }
    );

    // Add extra visit to schedule
    authGroup.post(
      '/schedules/:id/add-visit',
      { preHandler: [requirePermission(Permissions.SCHEDULE_MANAGE, 'schedule')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const scheduleId = parseInt(id, 10);
        if (isNaN(scheduleId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Schedule ID must be an integer' },
          });
        }

        const parseResult = addExtraVisitSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid add extra visit payload',
              details: parseResult.error.format(),
            },
          });
        }

        const scheduledDate = (parseResult.data.scheduled_date || parseResult.data.scheduledDate)!;
        const windowStart = parseResult.data.window_start || parseResult.data.windowStart;
        const windowEnd = parseResult.data.window_end || parseResult.data.windowEnd;

        const result = await addExtraVisit(
          scheduleId,
          {
            scheduledDate,
            windowStart,
            windowEnd,
            note: parseResult.data.note || undefined,
          },
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.status(201).send(result);
      }
    );

    // ==========================================
    // 2. Extension Requests
    // ==========================================

    authGroup.get(
      '/extension-requests',
      { preHandler: [requirePermission(Permissions.SCHEDULE_VIEW, 'schedule')] },
      async (req, reply) => {
        const requests = await listPendingExtensionRequests(req.user!, req.query);
        return reply.send({ requests });
      }
    );

    authGroup.post(
      '/extension-requests/:id/decision',
      { preHandler: [requirePermission(Permissions.SCHEDULE_APPROVE_EXTENSION, 'schedule')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const requestId = parseInt(id, 10);
        if (isNaN(requestId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Request ID must be an integer' },
          });
        }

        const parseResult = decideExtensionRequestSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid decision payload',
              details: parseResult.error.format(),
            },
          });
        }

        const result = await decideExtensionRequest(
          requestId,
          {
            decision: parseResult.data.decision,
            rejectionReason: parseResult.data.rejection_reason || parseResult.data.rejectionReason || undefined,
          },
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(result);
      }
    );

    // ==========================================
    // 3. Scheduled Visits & Attendance
    // ==========================================

    // List visits (Today's board, queues, unmarked, etc.)
    authGroup.get(
      '/visits',
      { preHandler: [requirePermission(Permissions.VISIT_VIEW, 'visit')] },
      async (req, reply) => {
        const visits = await getVisits(req.query, req.user!);
        return reply.send({ visits });
      }
    );

    // Mark visit attendance (attended or missed with reason)
    authGroup.post(
      '/visits/:id/mark',
      { preHandler: [requirePermission(Permissions.VISIT_MARK, 'visit')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const visitId = parseInt(id, 10);
        if (isNaN(visitId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Visit ID must be an integer' },
          });
        }

        const parseResult = markVisitAttendanceSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid mark attendance payload',
              details: parseResult.error.format(),
            },
          });
        }

        const missedReasonId =
          parseResult.data.missed_reason_id !== undefined
            ? (parseResult.data.missed_reason_id ?? undefined)
            : (parseResult.data.missedReasonId ?? undefined);

        const result = await markVisitAttendance(
          visitId,
          {
            status: parseResult.data.status,
            missedReasonId,
            note: parseResult.data.note || undefined,
          },
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(result);
      }
    );

    // Reschedule a single visit
    authGroup.post(
      '/visits/:id/reschedule',
      { preHandler: [requirePermission(Permissions.VISIT_MARK, 'visit')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const visitId = parseInt(id, 10);
        if (isNaN(visitId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Visit ID must be an integer' },
          });
        }

        const parseResult = rescheduleVisitSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid reschedule visit payload',
              details: parseResult.error.format(),
            },
          });
        }

        const newDate = (parseResult.data.new_date || parseResult.data.newDate)!;
        const windowStart = parseResult.data.window_start || parseResult.data.windowStart;
        const windowEnd = parseResult.data.window_end || parseResult.data.windowEnd;

        const result = await rescheduleVisit(
          visitId,
          {
            newDate,
            windowStart,
            windowEnd,
            reason: parseResult.data.reason,
          },
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(result);
      }
    );

    // ==========================================
    // 4. In-Patient Check-ins
    // ==========================================

    authGroup.post(
      '/cases/:id/checkins',
      { preHandler: [requirePermission(Permissions.CHECKIN_CREATE, 'checkin')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const caseId = parseInt(id, 10);
        if (isNaN(caseId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Case ID must be an integer' },
          });
        }

        const parseResult = createTreatmentCheckinSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid check-in payload',
              details: parseResult.error.format(),
            },
          });
        }

        const checkin = await createTreatmentCheckin(
          caseId,
          parseResult.data,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.status(201).send(checkin);
      }
    );

    authGroup.get(
      '/cases/:id/checkins',
      { preHandler: [requirePermission(Permissions.CASE_VIEW, 'case')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const caseId = parseInt(id, 10);
        if (isNaN(caseId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Case ID must be an integer' },
          });
        }

        const checkins = await getCaseCheckins(caseId, req.user!);
        return reply.send({ checkins });
      }
    );

    // ==========================================
    // 5. Picklists: Therapies & Missed Reasons
    // ==========================================

    authGroup.get('/therapies', async (req, reply) => {
      const activeOnly = (req.query as any)?.active === 'true';
      const therapies = await getTherapies(activeOnly);
      return reply.send({ therapies });
    });

    authGroup.post(
      '/therapies',
      { preHandler: [requirePermission(Permissions.SETTINGS_MANAGE)] },
      async (req, reply) => {
        const created = await createTherapy(req.body as any);
        return reply.status(201).send(created);
      }
    );

    authGroup.patch(
      '/therapies/:id',
      { preHandler: [requirePermission(Permissions.SETTINGS_MANAGE)] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const updated = await updateTherapy(parseInt(id, 10), req.body);
        return reply.send(updated);
      }
    );

    authGroup.get('/missed-reasons', async (req, reply) => {
      const activeOnly = (req.query as any)?.active === 'true';
      const missedReasons = await getMissedReasons(activeOnly);
      return reply.send({ missedReasons });
    });

    authGroup.post(
      '/missed-reasons',
      { preHandler: [requirePermission(Permissions.SETTINGS_MANAGE)] },
      async (req, reply) => {
        const created = await createMissedReason(req.body as any);
        return reply.status(201).send(created);
      }
    );

    authGroup.patch(
      '/missed-reasons/:id',
      { preHandler: [requirePermission(Permissions.SETTINGS_MANAGE)] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const updated = await updateMissedReason(parseInt(id, 10), req.body);
        return reply.send(updated);
      }
    );
  });
};

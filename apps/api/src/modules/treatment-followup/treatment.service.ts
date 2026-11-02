import { prisma } from '../../database/client';
import { UserContext, scopeWhere, hasPermission } from '../rbac/scope';
import { Permissions, Roles, Teams, VisitStatuses, ScheduleStatuses, CareTypes, CaseStages } from '@hospital-crm/shared';
import { recordAuditLog } from '../audit/audit.service';
import { addDays, addHours, parseISO } from 'date-fns';
import {
  generateScheduleVisits,
  regenerateFutureVisits,
  calculateAdherenceMetrics,
  formatDate,
  parseLocalDate,
  BranchScheduleConfig,
} from './schedule.engine';

/**
 * Loads branch holidays and business hours config
 */
export async function getBranchScheduleConfig(branchId: number): Promise<BranchScheduleConfig> {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
  });

  const businessHours = (branch?.businessHours as any) || {};
  const openDays = Array.isArray(businessHours.days) && businessHours.days.length > 0
    ? businessHours.days
    : [1, 2, 3, 4, 5, 6];

  // Fetch branch_holidays setting
  const holidaySetting = await prisma.setting.findUnique({
    where: { key: 'branch_holidays' },
  });

  const rawHolidays = (holidaySetting?.value as any) || [];
  const holidays: string[] = [];

  if (Array.isArray(rawHolidays)) {
    for (const h of rawHolidays) {
      if (typeof h === 'string') {
        holidays.push(h);
      } else if (h && typeof h === 'object' && h.date) {
        if (!h.branchId || h.branchId === branchId) {
          holidays.push(h.date);
        }
      }
    }
  }

  return { openDays, holidays };
}

/**
 * Recomputes and updates adherence metrics on a Case
 */
export async function recomputeCaseAdherence(caseId: number, tx: any = prisma) {
  const patientCase = await tx.case.findUnique({
    where: { id: caseId },
    include: {
      scheduledVisits: {
        select: {
          scheduledDate: true,
          status: true,
        },
      },
    },
  });

  if (!patientCase) return null;

  // Fetch adherence thresholds from setting
  const thresholdSetting = await tx.setting.findUnique({
    where: { key: 'adherence_thresholds' },
  });
  const thresholds = (thresholdSetting?.value as any) || { mediumRiskRate: 80, highRiskRate: 60 };

  const metrics = calculateAdherenceMetrics(patientCase.scheduledVisits, thresholds);

  const updated = await tx.case.update({
    where: { id: caseId },
    data: {
      attendanceRate: metrics.attendanceRate,
      consecutiveMissed: metrics.consecutiveMissed,
      lastAttendedAt: metrics.lastAttendedAt,
      nextVisitAt: metrics.nextVisitAt,
      adherenceRisk: metrics.adherenceRisk,
      updatedAt: new Date(),
    },
  });

  return { metrics, updated };
}

/**
 * Previews visits for a potential schedule without persisting
 */
export async function previewSchedule(input: any, user: UserContext) {
  const branchId = input.branchId || user.branchIds[0] || 1;
  const config = await getBranchScheduleConfig(branchId);

  const dates = generateScheduleVisits({
    startDate: input.startDate,
    endDate: input.endDate,
    totalSessions: input.totalSessions,
    frequencyType: input.frequencyType,
    intervalN: input.intervalN,
    weekdays: input.weekdays,
    customDates: input.customDates,
    windowStart: input.windowStart || '09:00',
    windowEnd: input.windowEnd || '10:00',
    config,
  });

  return {
    totalGenerated: dates.length,
    visits: dates,
  };
}

/**
 * Gets all visit schedules for a case
 */
export async function getCaseSchedules(caseId: number, user: UserContext) {
  const patientCase = await prisma.case.findFirst({
    where: {
      id: caseId,
      archivedAt: null,
      ...scopeWhere(user, 'case', Permissions.CASE_VIEW),
    },
  });

  if (!patientCase) {
    const exists = await prisma.case.findUnique({ where: { id: caseId } });
    if (exists) {
      const err = new Error('Forbidden: Out of scope access');
      (err as any).statusCode = 403;
      (err as any).code = 'FORBIDDEN';
      throw err;
    }
    const err = new Error('Case not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  return prisma.visitSchedule.findMany({
    where: { caseId },
    include: {
      therapy: true,
      doctor: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true } },
      extensionRequests: {
        orderBy: { createdAt: 'desc' },
      },
      visits: {
        orderBy: { sessionNo: 'asc' },
        include: {
          marker: { select: { id: true, name: true } },
          missedReason: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Creates a new visit schedule for a case and generates visits
 */
export async function createCaseSchedule(
  caseId: number,
  input: any,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const patientCase = await prisma.case.findFirst({
    where: {
      id: caseId,
      archivedAt: null,
      ...scopeWhere(user, 'case', Permissions.CASE_EDIT),
    },
    include: {
      patient: true,
      branch: true,
      lead: true,
    },
  });

  if (!patientCase) {
    const exists = await prisma.case.findUnique({ where: { id: caseId } });
    if (exists) {
      const err = new Error('Forbidden: Out of scope access');
      (err as any).statusCode = 403;
      (err as any).code = 'FORBIDDEN';
      throw err;
    }
    const err = new Error('Case not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  const config = await getBranchScheduleConfig(patientCase.branchId);
  const now = new Date();

  // Generate visits
  const generated = generateScheduleVisits({
    startDate: input.startDate,
    endDate: input.endDate,
    totalSessions: input.totalSessions,
    frequencyType: input.frequencyType,
    intervalN: input.intervalN,
    weekdays: input.weekdays,
    customDates: input.customDates,
    windowStart: input.windowStart || '09:00',
    windowEnd: input.windowEnd || '10:00',
    config,
  });

  const doctorId = input.doctorId || patientCase.treatingDoctorId || null;
  const setting = input.setting || (patientCase.careType === CareTypes.IN_PATIENT ? 'inpatient' : 'opd');

  const result = await prisma.$transaction(async (tx: any) => {
    // 1. Create schedule
    const schedule = await tx.visitSchedule.create({
      data: {
        caseId,
        setting,
        therapyId: input.therapyId,
        frequencyType: input.frequencyType,
        intervalN: input.intervalN ?? null,
        weekdays: input.weekdays !== undefined ? input.weekdays : undefined,
        customDates: input.customDates !== undefined ? input.customDates : undefined,
        startDate: parseLocalDate(input.startDate),
        endDate: input.endDate ? parseLocalDate(input.endDate) : null,
        totalSessions: input.totalSessions || generated.length,
        windowStart: input.windowStart || '09:00',
        windowEnd: input.windowEnd || '10:00',
        durationMinutes: input.durationMinutes || 60,
        doctorId,
        notes: input.notes || null,
        status: ScheduleStatuses.ACTIVE,
        createdBy: user.id,
      },
      include: {
        therapy: true,
      },
    });

    // 2. Bulk create scheduled visits
    if (generated.length > 0) {
      await tx.scheduledVisit.createMany({
        data: generated.map((g) => ({
          scheduleId: schedule.id,
          caseId,
          sessionNo: g.sessionNo,
          scheduledDate: parseLocalDate(g.scheduledDate),
          windowStart: g.windowStart,
          windowEnd: g.windowEnd,
          status: g.status,
          movedFromDate: g.movedFromDate ? parseLocalDate(g.movedFromDate) : null,
          movedReason: g.movedReason || null,
        })),
      });
    }

    // 3. Section 2 Transition Flow:
    // "From the doctor to Treatment Follow-up: when a case with care_type of opd_course or procedure
    // reaches plan_accepted and a visit schedule is saved, it enters the queue with setting = opd."
    let caseUpdateData: any = {
      setting,
      updatedAt: now,
    };

    const isOpdOrProcedure =
      patientCase.careType === CareTypes.OPD_COURSE || patientCase.careType === CareTypes.PROCEDURE;

    if (isOpdOrProcedure && patientCase.team !== Teams.TREATMENT_FOLLOWUP) {
      caseUpdateData.team = Teams.TREATMENT_FOLLOWUP;
      caseUpdateData.stage = CaseStages.IN_TREATMENT;

      // Assign round-robin treatment follow-up executive if current owner is doctor or unassigned
      const execUser = await tx.user.findFirst({
        where: {
          status: 'active',
          available: true,
          role: { code: Roles.TREATMENT_FOLLOWUP_EXECUTIVE },
          userBranches: { some: { branchId: patientCase.branchId } },
        },
        select: { id: true },
      });

      if (execUser) {
        caseUpdateData.ownerId = execUser.id;
      }

      // Record handover
      await tx.caseHandover.create({
        data: {
          caseId,
          fromTeam: patientCase.team || 'doctor',
          toTeam: Teams.TREATMENT_FOLLOWUP,
          fromUserId: user.id,
          toUserId: caseUpdateData.ownerId || null,
          note: `Visit schedule created for ${schedule.therapy.labelEn}. Transferred to Treatment Follow-up Desk.`,
          at: now,
        },
      });
    }

    if (generated.length > 0) {
      caseUpdateData.nextVisitAt = parseLocalDate(generated[0].scheduledDate);
    }

    await tx.case.update({
      where: { id: caseId },
      data: caseUpdateData,
    });

    // 4. Section 6: Create initial reminder tasks for the first 14 days (if patient does not have doNotContact)
    if (!patientCase.lead?.doNotContact) {
      const fourteenDaysOut = addDays(now, 14);
      for (const g of generated) {
        const visitDate = parseLocalDate(g.scheduledDate);
        if (visitDate <= fourteenDaysOut && visitDate >= now) {
          // Evening before reminder (17:00 local time)
          const eveningBefore = addDays(visitDate, -1);
          eveningBefore.setHours(17, 0, 0, 0);

          if (eveningBefore > now) {
            await tx.task.create({
              data: {
                caseId,
                cadenceKey: 'visit.reminder',
                cadenceStep: 1,
                title: `Reminder: Session ${g.sessionNo} tomorrow (${schedule.therapy.labelEn})`,
                type: 'reminder',
                priority: 'warm',
                dueAt: eveningBefore,
                status: 'open',
                ownerId: caseUpdateData.ownerId || patientCase.ownerId,
              },
            });
          }
        }
      }
    }

    // 5. Check for course.midpoint_check and course.end_prepare cadence tasks
    if (generated.length >= 4) {
      const midpointIndex = Math.floor(generated.length / 2) - 1;
      const midpointDate = parseLocalDate(generated[midpointIndex].scheduledDate);
      await tx.task.create({
        data: {
          caseId,
          cadenceKey: 'course.midpoint_check',
          cadenceStep: 1,
          title: `Midpoint Check-in: Session ${midpointIndex + 1}/${generated.length} (${patientCase.patient.name})`,
          type: 'call',
          priority: 'warm',
          dueAt: midpointDate,
          status: 'open',
          ownerId: caseUpdateData.ownerId || patientCase.ownerId,
        },
      });

      const endPrepareIndex = Math.max(0, generated.length - 2);
      const endPrepareDate = parseLocalDate(generated[endPrepareIndex].scheduledDate);
      await tx.task.create({
        data: {
          caseId,
          cadenceKey: 'course.end_prepare',
          cadenceStep: 1,
          title: `Course End Preparation: 2 sessions remain (${patientCase.patient.name})`,
          type: 'call',
          priority: 'warm',
          dueAt: endPrepareDate,
          status: 'open',
          ownerId: caseUpdateData.ownerId || patientCase.ownerId,
        },
      });
    }

    return schedule;
  });

  await recordAuditLog({
    userId: user.id,
    action: 'SCHEDULE_CREATED',
    entity: 'schedule',
    entityId: result.id,
    after: { caseId, therapyId: input.therapyId, totalSessions: generated.length },
    ip,
    userAgent,
  });

  return result;
}

/**
 * Updates schedule parameters and regenerates future visits
 */
export async function updateSchedule(
  scheduleId: number,
  input: any,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const schedule = await prisma.visitSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      case: { include: { branch: true } },
      visits: { orderBy: { sessionNo: 'asc' } },
    },
  });

  if (!schedule) {
    const err = new Error('Schedule not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  const todayStr = formatDate(new Date());
  const config = await getBranchScheduleConfig(schedule.case.branchId);

  const { keptVisits, newVisits } = regenerateFutureVisits(
    schedule.visits.map((v) => ({
      id: v.id,
      sessionNo: v.sessionNo,
      scheduledDate: formatDate(v.scheduledDate),
      status: v.status,
      windowStart: v.windowStart,
      windowEnd: v.windowEnd,
      movedFromDate: v.movedFromDate ? formatDate(v.movedFromDate) : null,
      movedReason: v.movedReason,
    })),
    {
      startDate: input.startDate || schedule.startDate,
      endDate: input.endDate !== undefined ? input.endDate : schedule.endDate,
      totalSessions: input.totalSessions !== undefined ? input.totalSessions : schedule.totalSessions,
      frequencyType: input.frequencyType || schedule.frequencyType,
      intervalN: input.intervalN !== undefined ? input.intervalN : schedule.intervalN,
      weekdays: input.weekdays !== undefined ? input.weekdays : (schedule.weekdays as any),
      windowStart: input.windowStart || schedule.windowStart,
      windowEnd: input.windowEnd || schedule.windowEnd,
      config,
    },
    todayStr
  );

  const result = await prisma.$transaction(async (tx: any) => {
    // 1. Delete future planned visits that are not in keptVisits
    const keptIds = keptVisits.map((k) => k.id).filter(Boolean);
    await tx.scheduledVisit.deleteMany({
      where: {
        scheduleId,
        id: { notIn: keptIds as number[] },
      },
    });

    // 2. Insert regenerated future visits
    if (newVisits.length > 0) {
      await tx.scheduledVisit.createMany({
        data: newVisits.map((n) => ({
          scheduleId,
          caseId: schedule.caseId,
          sessionNo: n.sessionNo,
          scheduledDate: parseLocalDate(n.scheduledDate),
          windowStart: n.windowStart,
          windowEnd: n.windowEnd,
          status: n.status,
          movedFromDate: n.movedFromDate ? parseLocalDate(n.movedFromDate) : null,
          movedReason: n.movedReason || null,
        })),
      });
    }

    // 3. Update schedule record
    const updated = await tx.visitSchedule.update({
      where: { id: scheduleId },
      data: {
        therapyId: input.therapyId ?? schedule.therapyId,
        frequencyType: input.frequencyType ?? schedule.frequencyType,
        intervalN: input.intervalN !== undefined ? input.intervalN : schedule.intervalN,
        weekdays: input.weekdays !== undefined ? input.weekdays : schedule.weekdays,
        windowStart: input.windowStart ?? schedule.windowStart,
        windowEnd: input.windowEnd ?? schedule.windowEnd,
        durationMinutes: input.durationMinutes ?? schedule.durationMinutes,
        doctorId: input.doctorId !== undefined ? input.doctorId : schedule.doctorId,
        notes: input.notes !== undefined ? input.notes : schedule.notes,
        totalSessions: input.totalSessions !== undefined ? input.totalSessions : schedule.totalSessions,
        updatedAt: new Date(),
      },
    });

    await recomputeCaseAdherence(schedule.caseId, tx);

    return updated;
  });

  await recordAuditLog({
    userId: user.id,
    action: 'SCHEDULE_UPDATED',
    entity: 'schedule',
    entityId: scheduleId,
    before: { totalSessions: schedule.totalSessions, frequencyType: schedule.frequencyType },
    after: { totalSessions: result.totalSessions, frequencyType: result.frequencyType },
    ip,
    userAgent,
  });

  return result;
}

/**
 * Pauses a visit schedule and marks planned visits in pause period as excused
 */
export async function pauseSchedule(
  scheduleId: number,
  input: { pauseUntil: string | Date; pauseReason: string },
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const schedule = await prisma.visitSchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!schedule) {
    const err = new Error('Schedule not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  const pauseUntilDate = parseLocalDate(input.pauseUntil);
  const now = new Date();

  const result = await prisma.$transaction(async (tx: any) => {
    // 1. Update schedule status
    const updated = await tx.visitSchedule.update({
      where: { id: scheduleId },
      data: {
        status: ScheduleStatuses.PAUSED,
        pausedUntil: pauseUntilDate,
        pauseReason: input.pauseReason,
        updatedAt: now,
      },
    });

    // 2. Mark planned visits within the pause period as 'excused'
    await tx.scheduledVisit.updateMany({
      where: {
        scheduleId,
        status: VisitStatuses.PLANNED,
        scheduledDate: { lte: pauseUntilDate },
      },
      data: {
        status: VisitStatuses.EXCUSED,
        note: `Excused: Schedule paused until ${formatDate(pauseUntilDate)}. Reason: ${input.pauseReason}`,
        markedBy: user.id,
        markedAt: now,
        updatedAt: now,
      },
    });

    // 3. Cancel open reminder tasks for this schedule's case during pause period
    await tx.task.updateMany({
      where: {
        caseId: schedule.caseId,
        cadenceKey: 'visit.reminder',
        status: 'open',
        dueAt: { lte: pauseUntilDate },
      },
      data: {
        status: 'cancelled',
        updatedAt: now,
      },
    });

    await recomputeCaseAdherence(schedule.caseId, tx);

    return updated;
  });

  await recordAuditLog({
    userId: user.id,
    action: 'SCHEDULE_PAUSED',
    entity: 'schedule',
    entityId: scheduleId,
    after: { pausedUntil: input.pauseUntil, pauseReason: input.pauseReason },
    ip,
    userAgent,
  });

  return result;
}

/**
 * Resumes a paused schedule from the resume date
 */
export async function resumeSchedule(
  scheduleId: number,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const schedule = await prisma.visitSchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!schedule) {
    const err = new Error('Schedule not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  const now = new Date();

  const updated = await prisma.$transaction(async (tx: any) => {
    const res = await tx.visitSchedule.update({
      where: { id: scheduleId },
      data: {
        status: ScheduleStatuses.ACTIVE,
        pausedUntil: null,
        pauseReason: null,
        updatedAt: now,
      },
    });

    await recomputeCaseAdherence(schedule.caseId, tx);
    return res;
  });

  await recordAuditLog({
    userId: user.id,
    action: 'SCHEDULE_RESUMED',
    entity: 'schedule',
    entityId: scheduleId,
    ip,
    userAgent,
  });

  return updated;
}

/**
 * Requests or directly approves an extension to a visit schedule
 */
export async function extendSchedule(
  scheduleId: number,
  input: { additionalSessions?: number; newEndDate?: string | Date; reason: string },
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const schedule = await prisma.visitSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      case: { include: { branch: true } },
      visits: { orderBy: { sessionNo: 'desc' }, take: 1 },
    },
  });

  if (!schedule) {
    const err = new Error('Schedule not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  const isTreatingDoctor = schedule.doctorId === user.id || schedule.case.treatingDoctorId === user.id;
  const hasApprovePerm = hasPermission(user, Permissions.SCHEDULE_APPROVE_EXTENSION);
  const canDirectlyApprove = isTreatingDoctor && hasApprovePerm;

  const now = new Date();

  if (canDirectlyApprove) {
    // Direct approval by doctor
    const config = await getBranchScheduleConfig(schedule.case.branchId);
    const lastVisit = schedule.visits[0];
    const startDateForNew = lastVisit ? addDays(lastVisit.scheduledDate, 1) : schedule.startDate;
    const startSessionNo = lastVisit ? lastVisit.sessionNo + 1 : 1;

    const newVisits = generateScheduleVisits({
      startDate: startDateForNew,
      totalSessions: input.additionalSessions || 1,
      frequencyType: schedule.frequencyType,
      intervalN: schedule.intervalN,
      weekdays: schedule.weekdays as any,
      windowStart: schedule.windowStart,
      windowEnd: schedule.windowEnd,
      config,
      startSessionNo,
    });

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create approved request
      const reqRecord = await tx.scheduleExtensionRequest.create({
        data: {
          scheduleId,
          requestedBy: user.id,
          additionalSessions: input.additionalSessions || null,
          newEndDate: input.newEndDate ? parseLocalDate(input.newEndDate) : null,
          reason: input.reason,
          status: 'approved',
          decidedBy: user.id,
          decidedAt: now,
        },
      });

      // 2. Insert new visits
      if (newVisits.length > 0) {
        await tx.scheduledVisit.createMany({
          data: newVisits.map((v) => ({
            scheduleId,
            caseId: schedule.caseId,
            sessionNo: v.sessionNo,
            scheduledDate: parseLocalDate(v.scheduledDate),
            windowStart: v.windowStart,
            windowEnd: v.windowEnd,
            status: v.status,
            movedFromDate: v.movedFromDate ? parseLocalDate(v.movedFromDate) : null,
            movedReason: v.movedReason || null,
          })),
        });
      }

      // 3. Update schedule total sessions
      await tx.visitSchedule.update({
        where: { id: scheduleId },
        data: {
          totalSessions: (schedule.totalSessions || 0) + (input.additionalSessions || newVisits.length),
          endDate: input.newEndDate ? parseLocalDate(input.newEndDate) : schedule.endDate,
          updatedAt: now,
        },
      });

      await recomputeCaseAdherence(schedule.caseId, tx);

      return reqRecord;
    });

    await recordAuditLog({
      userId: user.id,
      action: 'SCHEDULE_EXTENSION_APPROVED',
      entity: 'schedule',
      entityId: scheduleId,
      after: { additionalSessions: input.additionalSessions, approvedDirectly: true },
      ip,
      userAgent,
    });

    return { approved: true, request: result };
  } else {
    // Non-doctor creates pending request for doctor review
    const pendingReq = await prisma.scheduleExtensionRequest.create({
      data: {
        scheduleId,
        requestedBy: user.id,
        additionalSessions: input.additionalSessions || null,
        newEndDate: input.newEndDate ? parseLocalDate(input.newEndDate) : null,
        reason: input.reason,
        status: 'pending',
      },
      include: {
        schedule: { include: { case: { include: { patient: true } } } },
      },
    });

    // Notify treating doctor
    if (schedule.doctorId) {
      await prisma.notification.create({
        data: {
          userId: schedule.doctorId,
          type: 'extension_request',
          title: `Schedule Extension Request: ${pendingReq.schedule.case.patient.name}`,
          body: `Extension requested: +${input.additionalSessions || 'custom'} sessions. Reason: ${input.reason}`,
          link: '/doctor',
        },
      });
    }

    await recordAuditLog({
      userId: user.id,
      action: 'SCHEDULE_EXTENSION_REQUESTED',
      entity: 'schedule_extension_request',
      entityId: pendingReq.id,
      after: { scheduleId, additionalSessions: input.additionalSessions, reason: input.reason },
      ip,
      userAgent,
    });

    return { approved: false, pending: true, request: pendingReq };
  }
}

/**
 * Doctor approves or rejects a pending schedule extension request
 */
export async function decideExtensionRequest(
  requestId: number,
  input: { decision: 'approved' | 'rejected'; rejectionReason?: string },
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const reqRecord = await prisma.scheduleExtensionRequest.findUnique({
    where: { id: requestId },
    include: {
      schedule: {
        include: {
          case: { include: { branch: true } },
          visits: { orderBy: { sessionNo: 'desc' }, take: 1 },
        },
      },
    },
  });

  if (!reqRecord) {
    const err = new Error('Extension request not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  const now = new Date();

  if (input.decision === 'rejected') {
    const updated = await prisma.scheduleExtensionRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        decidedBy: user.id,
        decidedAt: now,
        rejectionReason: input.rejectionReason || null,
        updatedAt: now,
      },
    });

    await recordAuditLog({
      userId: user.id,
      action: 'SCHEDULE_EXTENSION_REJECTED',
      entity: 'schedule_extension_request',
      entityId: requestId,
      after: { decision: 'rejected', reason: input.rejectionReason },
      ip,
      userAgent,
    });

    return updated;
  }

  // Approved
  const schedule = reqRecord.schedule;
  const config = await getBranchScheduleConfig(schedule.case.branchId);
  const lastVisit = schedule.visits[0];
  const startDateForNew = lastVisit ? addDays(lastVisit.scheduledDate, 1) : schedule.startDate;
  const startSessionNo = lastVisit ? lastVisit.sessionNo + 1 : 1;

  const newVisits = generateScheduleVisits({
    startDate: startDateForNew,
    totalSessions: reqRecord.additionalSessions || 1,
    frequencyType: schedule.frequencyType,
    intervalN: schedule.intervalN,
    weekdays: schedule.weekdays as any,
    windowStart: schedule.windowStart,
    windowEnd: schedule.windowEnd,
    config,
    startSessionNo,
  });

  const result = await prisma.$transaction(async (tx: any) => {
    const updatedReq = await tx.scheduleExtensionRequest.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        decidedBy: user.id,
        decidedAt: now,
        updatedAt: now,
      },
    });

    if (newVisits.length > 0) {
      await tx.scheduledVisit.createMany({
        data: newVisits.map((v) => ({
          scheduleId: schedule.id,
          caseId: schedule.caseId,
          sessionNo: v.sessionNo,
          scheduledDate: parseLocalDate(v.scheduledDate),
          windowStart: v.windowStart,
          windowEnd: v.windowEnd,
          status: v.status,
          movedFromDate: v.movedFromDate ? parseLocalDate(v.movedFromDate) : null,
          movedReason: v.movedReason || null,
        })),
      });
    }

    await tx.visitSchedule.update({
      where: { id: schedule.id },
      data: {
        totalSessions: (schedule.totalSessions || 0) + (reqRecord.additionalSessions || newVisits.length),
        endDate: reqRecord.newEndDate ? parseLocalDate(reqRecord.newEndDate) : schedule.endDate,
        updatedAt: now,
      },
    });

    await recomputeCaseAdherence(schedule.caseId, tx);

    return updatedReq;
  });

  await recordAuditLog({
    userId: user.id,
    action: 'SCHEDULE_EXTENSION_APPROVED',
    entity: 'schedule_extension_request',
    entityId: requestId,
    after: { decision: 'approved', additionalSessions: reqRecord.additionalSessions },
    ip,
    userAgent,
  });

  return result;
}

/**
 * Lists pending extension requests (for doctors or center heads)
 */
export async function listPendingExtensionRequests(user: UserContext, query: any = {}) {
  const where: any = {
    status: query.status || 'pending',
  };

  if (user.roleCode === Roles.DOCTOR) {
    where.schedule = { doctorId: user.id };
  } else if (user.roleCode !== Roles.OWNER && user.roleCode !== Roles.ADMIN) {
    where.schedule = {
      case: { branchId: { in: user.branchIds } },
    };
  }

  return prisma.scheduleExtensionRequest.findMany({
    where,
    include: {
      schedule: {
        include: {
          therapy: true,
          case: { include: { patient: true, branch: true } },
        },
      },
      requester: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Reschedules a single scheduled visit to a new date and time window
 */
export async function rescheduleVisit(
  visitId: number,
  input: { newDate: string | Date; windowStart?: string; windowEnd?: string; reason?: string },
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const visit = await prisma.scheduledVisit.findUnique({
    where: { id: visitId },
    include: { schedule: true, case: true },
  });

  if (!visit) {
    const err = new Error('Visit not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  const targetDate = parseLocalDate(input.newDate);
  const now = new Date();

  const updated = await prisma.$transaction(async (tx: any) => {
    const res = await tx.scheduledVisit.update({
      where: { id: visitId },
      data: {
        scheduledDate: targetDate,
        windowStart: input.windowStart || visit.windowStart,
        windowEnd: input.windowEnd || visit.windowEnd,
        movedFromDate: visit.scheduledDate,
        movedReason: input.reason || 'Rescheduled by user',
        rescheduledTo: targetDate,
        status: VisitStatuses.PLANNED,
        markedBy: user.id,
        markedAt: now,
        note: input.reason || visit.note,
        updatedAt: now,
      },
    });

    await recomputeCaseAdherence(visit.caseId, tx);
    return res;
  });

  await recordAuditLog({
    userId: user.id,
    action: 'VISIT_RESCHEDULED',
    entity: 'visit',
    entityId: visitId,
    before: { scheduledDate: visit.scheduledDate },
    after: { scheduledDate: targetDate, reason: input.reason },
    ip,
    userAgent,
  });

  return updated;
}

/**
 * Shifts all later planned visits by N days
 */
export async function shiftScheduleVisits(
  scheduleId: number,
  input: { fromDate?: string | Date; days: number; reason?: string },
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const schedule = await prisma.visitSchedule.findUnique({
    where: { id: scheduleId },
    include: { case: { include: { branch: true } } },
  });

  if (!schedule) {
    const err = new Error('Schedule not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  const fromDate = input.fromDate ? parseLocalDate(input.fromDate) : new Date();
  const config = await getBranchScheduleConfig(schedule.case.branchId);

  const visitsToShift = await prisma.scheduledVisit.findMany({
    where: {
      scheduleId,
      status: VisitStatuses.PLANNED,
      scheduledDate: { gte: fromDate },
    },
    orderBy: { sessionNo: 'asc' },
  });

  const now = new Date();

  await prisma.$transaction(async (tx: any) => {
    for (const v of visitsToShift) {
      const shifted = addDays(v.scheduledDate, input.days);
      await tx.scheduledVisit.update({
        where: { id: v.id },
        data: {
          scheduledDate: shifted,
          movedFromDate: v.scheduledDate,
          movedReason: input.reason || `Schedule shifted by ${input.days} days`,
          updatedAt: now,
        },
      });
    }

    await recomputeCaseAdherence(schedule.caseId, tx);
  });

  await recordAuditLog({
    userId: user.id,
    action: 'SCHEDULE_SHIFTED',
    entity: 'schedule',
    entityId: scheduleId,
    after: { days: input.days, shiftedVisitsCount: visitsToShift.length },
    ip,
    userAgent,
  });

  return { shiftedCount: visitsToShift.length };
}

/**
 * Adds an extra session to an existing visit schedule
 */
export async function addExtraVisit(
  scheduleId: number,
  input: { scheduledDate: string | Date; windowStart?: string; windowEnd?: string; note?: string },
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const schedule = await prisma.visitSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      visits: { orderBy: { sessionNo: 'desc' }, take: 1 },
    },
  });

  if (!schedule) {
    const err = new Error('Schedule not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  const lastVisit = schedule.visits[0];
  const nextSessionNo = lastVisit ? lastVisit.sessionNo + 1 : 1;
  const targetDate = parseLocalDate(input.scheduledDate);
  const now = new Date();

  const newVisit = await prisma.$transaction(async (tx: any) => {
    const created = await tx.scheduledVisit.create({
      data: {
        scheduleId,
        caseId: schedule.caseId,
        sessionNo: nextSessionNo,
        scheduledDate: targetDate,
        windowStart: input.windowStart || schedule.windowStart,
        windowEnd: input.windowEnd || schedule.windowEnd,
        status: VisitStatuses.PLANNED,
        note: input.note || 'Extra visit added',
      },
    });

    await tx.visitSchedule.update({
      where: { id: scheduleId },
      data: {
        totalSessions: (schedule.totalSessions || 0) + 1,
        updatedAt: now,
      },
    });

    await recomputeCaseAdherence(schedule.caseId, tx);

    return created;
  });

  await recordAuditLog({
    userId: user.id,
    action: 'VISIT_EXTRA_ADDED',
    entity: 'visit',
    entityId: newVisit.id,
    after: { scheduleId, sessionNo: nextSessionNo, scheduledDate: targetDate },
    ip,
    userAgent,
  });

  return newVisit;
}

/**
 * Completes a visit schedule
 */
export async function completeSchedule(
  scheduleId: number,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const schedule = await prisma.visitSchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!schedule) {
    const err = new Error('Schedule not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  const now = new Date();
  const updated = await prisma.visitSchedule.update({
    where: { id: scheduleId },
    data: {
      status: ScheduleStatuses.COMPLETED,
      updatedAt: now,
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: 'SCHEDULE_COMPLETED',
    entity: 'schedule',
    entityId: scheduleId,
    ip,
    userAgent,
  });

  return updated;
}

/**
 * Cancels a visit schedule and its planned visits
 */
export async function cancelSchedule(
  scheduleId: number,
  input: { reason?: string },
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const schedule = await prisma.visitSchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!schedule) {
    const err = new Error('Schedule not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  const now = new Date();

  const updated = await prisma.$transaction(async (tx: any) => {
    const res = await tx.visitSchedule.update({
      where: { id: scheduleId },
      data: {
        status: ScheduleStatuses.CANCELLED,
        pauseReason: input.reason || 'Schedule cancelled',
        updatedAt: now,
      },
    });

    await tx.scheduledVisit.updateMany({
      where: {
        scheduleId,
        status: VisitStatuses.PLANNED,
      },
      data: {
        status: VisitStatuses.CANCELLED,
        note: input.reason || 'Schedule cancelled',
        updatedAt: now,
      },
    });

    await recomputeCaseAdherence(schedule.caseId, tx);
    return res;
  });

  await recordAuditLog({
    userId: user.id,
    action: 'SCHEDULE_CANCELLED',
    entity: 'schedule',
    entityId: scheduleId,
    after: { reason: input.reason },
    ip,
    userAgent,
  });

  return updated;
}

/**
 * Gets visits board and queue lists with strict role scoping
 */
export async function getVisits(query: any, user: UserContext) {
  const isFrontOffice = user.roleCode === Roles.FRONT_OFFICE;
  const where: any = {};

  // Front office role: strictly branch today's visits ONLY
  if (isFrontOffice) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    where.scheduledDate = {
      gte: today,
      lt: tomorrow,
    };
    where.case = { branchId: { in: user.branchIds } };

    // Front office sees minimal fields: patient name, time, therapy, branch
    return prisma.scheduledVisit.findMany({
      where,
      select: {
        id: true,
        sessionNo: true,
        scheduledDate: true,
        windowStart: true,
        windowEnd: true,
        status: true,
        case: {
          select: {
            id: true,
            patient: { select: { name: true } },
            branch: { select: { id: true, name: true } },
          },
        },
        schedule: {
          select: {
            id: true,
            therapy: { select: { id: true, labelEn: true, labelMl: true } },
          },
        },
      },
      orderBy: { windowStart: 'asc' },
    });
  }

  // Full scoping for other roles
  if (query.date) {
    const d = parseLocalDate(query.date);
    const nextD = addDays(d, 1);
    where.scheduledDate = { gte: d, lt: nextD };
  }

  if (query.status) {
    if (query.status === 'unmarked') {
      where.status = VisitStatuses.PLANNED;
    } else {
      where.status = query.status;
    }
  }

  if (query.branchId) {
    where.case = { ...where.case, branchId: parseInt(query.branchId, 10) };
  } else if (user.roleCode !== Roles.OWNER && user.roleCode !== Roles.ADMIN) {
    where.case = { ...where.case, branchId: { in: user.branchIds } };
  }

  if (query.ownerId) {
    where.case = { ...where.case, ownerId: parseInt(query.ownerId, 10) };
  } else if (user.roleCode === Roles.TREATMENT_FOLLOWUP_EXECUTIVE && query.scope === 'own') {
    where.case = { ...where.case, ownerId: user.id };
  }

  if (user.roleCode === Roles.DOCTOR) {
    where.case = {
      ...where.case,
      OR: [{ ownerId: user.id }, { treatingDoctorId: user.id }],
    };
  }

  return prisma.scheduledVisit.findMany({
    where,
    include: {
      case: {
        include: {
          patient: true,
          branch: true,
          owner: { select: { id: true, name: true, email: true } },
          treatingDoctor: { select: { id: true, name: true, email: true } },
        },
      },
      schedule: {
        include: {
          therapy: true,
        },
      },
      missedReason: true,
      marker: { select: { id: true, name: true } },
    },
    orderBy: [{ scheduledDate: 'asc' }, { windowStart: 'asc' }],
  });
}

/**
 * Marks attendance for a visit (attended or missed with reason)
 */
export async function markVisitAttendance(
  visitId: number,
  input: { status: 'attended' | 'missed' | 'not_attended'; missedReasonId?: number; note?: string },
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const visit = await prisma.scheduledVisit.findUnique({
    where: { id: visitId },
    include: {
      schedule: { include: { therapy: true } },
      case: { include: { patient: true, branch: true } },
    },
  });

  if (!visit) {
    const err = new Error('Visit not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  // Front office permission check: only branch visits
  if (user.roleCode === Roles.FRONT_OFFICE && !user.branchIds.includes(visit.case.branchId)) {
    const err = new Error('Forbidden: Out of branch visit');
    (err as any).statusCode = 403;
    (err as any).code = 'FORBIDDEN';
    throw err;
  }

  const finalStatus = input.status === 'not_attended' ? VisitStatuses.MISSED : input.status;

  // Validation: Missed requires missedReasonId (except front office single-tap "not_attended")
  if (finalStatus === VisitStatuses.MISSED && user.roleCode !== Roles.FRONT_OFFICE && !input.missedReasonId) {
    const err = new Error('Missed reason is required when marking a visit missed');
    (err as any).statusCode = 400;
    (err as any).code = 'MISSED_REASON_REQUIRED';
    throw err;
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx: any) => {
    // 1. Update visit
    const updatedVisit = await tx.scheduledVisit.update({
      where: { id: visitId },
      data: {
        status: finalStatus,
        markedBy: user.id,
        markedAt: now,
        missedReasonId: input.missedReasonId || null,
        note: input.note || null,
        updatedAt: now,
      },
      include: {
        missedReason: true,
        marker: { select: { id: true, name: true } },
      },
    });

    // 2. Atomically recompute case adherence metrics
    const adherenceResult = await recomputeCaseAdherence(visit.caseId, tx);
    const metrics = adherenceResult?.metrics || { consecutiveMissed: 0, attendanceRate: 100 };
    const updatedCase = adherenceResult?.updated;

    // 3. Section 6: If missed, create missed recovery task 1 hour after window end
    if (finalStatus === VisitStatuses.MISSED) {
      // Calculate due time: 1 hour after windowEnd
      const visitDate = parseLocalDate(visit.scheduledDate);
      const [endH, endM] = visit.windowEnd.split(':').map((x) => parseInt(x, 10));
      visitDate.setHours((endH || 11) + 1, endM || 0, 0, 0);

      await tx.task.create({
        data: {
          caseId: visit.caseId,
          cadenceKey: 'visit.missed_recovery',
          cadenceStep: 1,
          title: `Missed Visit Recovery: ${visit.case.patient.name} (Session ${visit.sessionNo})`,
          type: 'call',
          priority: 'hot',
          dueAt: visitDate > now ? visitDate : addHours(now, 1),
          status: 'open',
          ownerId: visit.case.ownerId,
        },
      });

      // 4. Section 6 & 8: If consecutive missed reaches 2:
      // Create adherence escalation to treating doctor & executive 4-hour callback task
      if (metrics.consecutiveMissed >= 2) {
        const docId = visit.schedule.doctorId || visit.case.treatingDoctorId;

        // Create escalation
        const esc = await tx.escalation.create({
          data: {
            caseId: visit.caseId,
            raisedBy: user.id,
            reason: `High Adherence Risk: Patient ${visit.case.patient.name} has missed ${metrics.consecutiveMissed} consecutive visits (${visit.schedule.therapy.labelEn}).`,
            escalationType: 'adherence',
            assignedDoctorId: docId || null,
            dueAt: addHours(now, 24), // 24-hour SLA
            status: 'pending',
          },
        });

        // Notify doctor
        if (docId) {
          await tx.notification.create({
            data: {
              userId: docId,
              type: 'escalation',
              title: `🚨 Adherence Escalation: ${visit.case.patient.name}`,
              body: `Patient missed 2 consecutive sessions. Doctor decision required within 24h.`,
              link: '/doctor',
            },
          });
        }

        // Executive 4-hour callback task
        await tx.task.create({
          data: {
            caseId: visit.caseId,
            cadenceKey: 'visit.second_miss_escalation',
            cadenceStep: 1,
            title: `Urgent Adherence Callback: 2 consecutive missed visits (${visit.case.patient.name})`,
            type: 'call',
            priority: 'hot',
            dueAt: addHours(now, 4),
            status: 'open',
            ownerId: visit.case.ownerId,
          },
        });
      }
    }

    // 5. Record interaction
    await tx.interaction.create({
      data: {
        type: 'status_change',
        direction: 'inbound',
        userId: user.id,
        caseId: visit.caseId,
        note: `Visit session ${visit.sessionNo} marked ${finalStatus.toUpperCase()}.${input.note ? ' Note: ' + input.note : ''}`,
        occurredAt: now,
      },
    });

    return { visit: updatedVisit, case: updatedCase };
  });

  await recordAuditLog({
    userId: user.id,
    action: 'VISIT_ATTENDANCE_MARKED',
    entity: 'visit',
    entityId: visitId,
    after: { status: finalStatus, missedReasonId: input.missedReasonId },
    ip,
    userAgent,
  });

  return result;
}

/**
 * Creates an in-patient treatment check-in
 */
export async function createTreatmentCheckin(
  caseId: number,
  input: any,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const patientCase = await prisma.case.findFirst({
    where: {
      id: caseId,
      archivedAt: null,
      ...scopeWhere(user, 'case', Permissions.CASE_EDIT),
    },
    include: {
      patient: true,
      branch: true,
    },
  });

  if (!patientCase) {
    const exists = await prisma.case.findUnique({ where: { id: caseId } });
    if (exists) {
      const err = new Error('Forbidden: Out of scope access');
      (err as any).statusCode = 403;
      (err as any).code = 'FORBIDDEN';
      throw err;
    }
    const err = new Error('Case not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  // Section 7: "A check-in cannot be closed without a next check-in date or a note that the patient was discharged."
  if (!input.nextCheckinAt && !input.patientDischarged) {
    const err = new Error('Next check-in date is required unless the patient was discharged');
    (err as any).statusCode = 400;
    (err as any).code = 'NEXT_CHECKIN_REQUIRED';
    throw err;
  }

  const now = new Date();
  const nextCheckinDate = input.nextCheckinAt ? new Date(input.nextCheckinAt) : null;
  const dischargeDate = input.expectedDischargeDate ? parseLocalDate(input.expectedDischargeDate) : null;

  const shouldEscalate =
    input.escalate === true ||
    input.condition === 'unwell' ||
    input.therapiesAsPlanned === 'no' ||
    Boolean(input.concerns && input.concerns.trim().length > 0);

  const result = await prisma.$transaction(async (tx: any) => {
    let escalationId: number | null = null;

    // 1. Create escalation if unwell / no therapies / concerns raised
    if (shouldEscalate) {
      const docId = patientCase.treatingDoctorId;
      const esc = await tx.escalation.create({
        data: {
          caseId,
          raisedBy: user.id,
          reason: `In-Patient Concern: Condition=${input.condition}, Therapies=${input.therapiesAsPlanned}. ${input.concerns || ''}`,
          escalationType: 'inpatient_concern',
          assignedDoctorId: docId || null,
          wardNotified: true,
          dueAt: addHours(now, 1), // 1-hour SLA
          status: 'pending',
        },
      });
      escalationId = esc.id;

      // Notify doctor & ward
      if (docId) {
        await tx.notification.create({
          data: {
            userId: docId,
            type: 'escalation',
            title: `🚨 Urgent In-Patient Concern: ${patientCase.patient.name}`,
            body: `Condition: ${input.condition}. Ward notified. 1-hour decision SLA.`,
            link: '/doctor',
          },
        });
      }
    }

    // 2. If billing concerns, create task for Admission Desk
    if (input.billingConcern) {
      await tx.task.create({
        data: {
          caseId,
          cadenceKey: 'inpatient.billing_concern',
          cadenceStep: 1,
          title: `Billing Concern Follow-up: ${patientCase.patient.name}`,
          type: 'call',
          priority: 'hot',
          dueAt: addHours(now, 24),
          status: 'open',
          ownerId: patientCase.ownerId,
        },
      });
    }

    // 3. Create check-in record
    const checkin = await tx.treatmentCheckin.create({
      data: {
        caseId,
        userId: user.id,
        channel: input.channel || 'bedside',
        contactedWho: input.contactedWho || 'patient',
        condition: input.condition || 'comfortable',
        therapiesAsPlanned: input.therapiesAsPlanned || 'yes',
        missedTherapiesNote: input.missedTherapiesNote || null,
        concerns: input.concerns || null,
        billingConcern: Boolean(input.billingConcern),
        expectedDischargeDate: dischargeDate,
        nextCheckinAt: nextCheckinDate,
        escalationId,
        occurredAt: now,
      },
      include: {
        escalation: true,
        user: { select: { id: true, name: true, role: true } },
      },
    });

    // 4. Update case expected discharge date if provided
    if (dischargeDate) {
      await tx.case.update({
        where: { id: caseId },
        data: {
          expectedDischargeDate: dischargeDate,
          updatedAt: now,
        },
      });
    }

    // 5. Schedule next check-in task if nextCheckinDate is specified
    if (nextCheckinDate && nextCheckinDate > now) {
      await tx.task.create({
        data: {
          caseId,
          cadenceKey: 'inpatient.checkin',
          cadenceStep: 1,
          title: `In-Patient Check-in: ${patientCase.patient.name} (${input.channel === 'bedside' ? 'Bedside' : 'Call'})`,
          type: input.channel === 'bedside' ? 'review' : 'call',
          priority: 'warm',
          dueAt: nextCheckinDate,
          status: 'open',
          ownerId: patientCase.ownerId,
        },
      });
    }

    // 6. Record interaction
    await tx.interaction.create({
      data: {
        type: 'treatment_checkin',
        direction: 'inbound',
        userId: user.id,
        caseId,
        note: `Treatment check-in (${input.channel}). Condition: ${input.condition}. Therapies as planned: ${input.therapiesAsPlanned}.${escalationId ? ' [ESCALATED - 1h SLA]' : ''}`,
        occurredAt: now,
      },
    });

    return checkin;
  });

  await recordAuditLog({
    userId: user.id,
    action: 'CHECKIN_CREATED',
    entity: 'checkin',
    entityId: result.id,
    after: { caseId, condition: input.condition, escalationId: result.escalationId },
    ip,
    userAgent,
  });

  return result;
}

/**
 * Gets check-ins for a case
 */
export async function getCaseCheckins(caseId: number, user: UserContext) {
  const patientCase = await prisma.case.findFirst({
    where: {
      id: caseId,
      archivedAt: null,
      ...scopeWhere(user, 'case', Permissions.CASE_VIEW),
    },
  });

  if (!patientCase) {
    const exists = await prisma.case.findUnique({ where: { id: caseId } });
    if (exists) {
      const err = new Error('Forbidden: Out of scope access');
      (err as any).statusCode = 403;
      (err as any).code = 'FORBIDDEN';
      throw err;
    }
    const err = new Error('Case not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  return prisma.treatmentCheckin.findMany({
    where: { caseId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      escalation: true,
    },
    orderBy: { occurredAt: 'desc' },
  });
}

/**
 * Picklists: Therapies
 */
export async function getTherapies(activeOnly: boolean = false) {
  return prisma.therapy.findMany({
    where: activeOnly ? { active: true } : {},
    orderBy: { sort: 'asc' },
  });
}

export async function createTherapy(input: { code: string; labelEn: string; labelMl: string; sort?: number }) {
  return prisma.therapy.create({
    data: {
      code: input.code,
      labelEn: input.labelEn,
      labelMl: input.labelMl,
      sort: input.sort ?? 0,
      active: true,
    },
  });
}

export async function updateTherapy(id: number, input: any) {
  return prisma.therapy.update({
    where: { id },
    data: { ...input, updatedAt: new Date() },
  });
}

/**
 * Picklists: Missed Reasons
 */
export async function getMissedReasons(activeOnly: boolean = false) {
  return prisma.missedReason.findMany({
    where: activeOnly ? { active: true } : {},
    orderBy: { sort: 'asc' },
  });
}

export async function createMissedReason(input: { code: string; labelEn: string; labelMl: string; sort?: number }) {
  return prisma.missedReason.create({
    data: {
      code: input.code,
      labelEn: input.labelEn,
      labelMl: input.labelMl,
      sort: input.sort ?? 0,
      active: true,
    },
  });
}

export async function updateMissedReason(id: number, input: any) {
  return prisma.missedReason.update({
    where: { id },
    data: { ...input, updatedAt: new Date() },
  });
}

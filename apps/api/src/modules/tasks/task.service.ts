import { prisma } from '../../database/client';
import { UserContext, scopeWhere } from '../rbac/scope';
import { Permissions, maskPhoneNumber } from '@hospital-crm/shared';
import { toZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay } from 'date-fns';

export interface TaskFilterOptions {
  team?: 'support' | 'admission' | 'aftercare';
  status?: 'open' | 'done' | 'cancelled' | 'snoozed' | 'all';
  due?: 'overdue' | 'today' | 'upcoming';
  ownerId?: number;
  leadId?: number;
  caseId?: number;
  page?: number;
  pageSize?: number;
}

/**
 * Lists tasks matching filters and RBAC scope, masking phones if required.
 */
export async function listTasks(filter: TaskFilterOptions, user: UserContext) {
  const scopedFilter = scopeWhere(user as any, 'task', Permissions.TASK_VIEW);
  const where: any = {
    AND: [scopedFilter],
  };

  const now = new Date();
  const timezone = 'Asia/Kolkata';
  const zonedNow = toZonedTime(now, timezone);

  // Status Filter (default 'open')
  const status = filter.status || 'open';
  if (status !== 'all') {
    where.AND.push({ status });
  }

  // Due Timing Filter
  if (filter.due === 'overdue') {
    where.AND.push({
      dueAt: { lt: now },
      status: 'open',
    });
  } else if (filter.due === 'today') {
    const { fromZonedTime } = require('date-fns-tz');
    const startOfToday = fromZonedTime(startOfDay(zonedNow), timezone);
    const endOfToday = fromZonedTime(endOfDay(zonedNow), timezone);

    where.AND.push({
      dueAt: { gte: startOfToday, lte: endOfToday },
      status: 'open',
    });
  } else if (filter.due === 'upcoming') {
    const { fromZonedTime } = require('date-fns-tz');
    const endOfToday = fromZonedTime(endOfDay(zonedNow), timezone);

    where.AND.push({
      dueAt: { gt: endOfToday },
      status: 'open',
    });
  }

  // Team Filter
  if (filter.team === 'support') {
    where.AND.push({ leadId: { not: null } });
  } else if (filter.team === 'admission') {
    where.AND.push({
      case: {
        OR: [{ team: 'admission' }, { advisedAdmission: true }],
      },
    });
  } else if (filter.team === 'aftercare') {
    where.AND.push({
      case: {
        OR: [{ team: 'aftercare' }, { stage: 'aftercare_follow_up' }],
      },
    });
  }

  // Direct entity or owner filters
  if (filter.ownerId) {
    where.AND.push({ ownerId: filter.ownerId });
  }
  if (filter.leadId) {
    where.AND.push({ leadId: filter.leadId });
  }
  if (filter.caseId) {
    where.AND.push({ caseId: filter.caseId });
  }

  const page = filter.page && filter.page > 0 ? filter.page : 1;
  const pageSize = filter.pageSize && filter.pageSize > 0 ? Math.min(filter.pageSize, 100) : 50;
  const skip = (page - 1) * pageSize;

  const [total, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { dueAt: 'asc' },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        completedUser: { select: { id: true, name: true } },
        lead: {
          select: {
            id: true,
            name: true,
            mobile: true,
            mobileNorm: true,
            language: true,
            concern: true,
            status: true,
            priority: true,
            consentCalls: true,
            consentWhatsapp: true,
            consentSms: true,
            firstResponseDueAt: true,
            firstResponseAt: true,
            slaBreached: true,
            department: { select: { id: true, code: true, labelEn: true, labelMl: true } },
            source: { select: { id: true, code: true, labelEn: true, labelMl: true } },
          },
        },
        case: {
          select: {
            id: true,
            stage: true,
            careType: true,
            patient: { select: { id: true, patientCode: true, name: true, mobileNorm: true } },
            department: { select: { id: true, code: true, labelEn: true, labelMl: true } },
          },
        },
      },
    }),
  ]);

  // Mask phone numbers if user role specifies phone masking
  const shouldMask = user.maskPhone;
  const sanitizedTasks = tasks.map((task) => {
    if (task.lead) {
      return {
        ...task,
        lead: {
          ...task.lead,
          mobile: shouldMask ? maskPhoneNumber(task.lead.mobile) : task.lead.mobile,
          mobileNorm: shouldMask ? maskPhoneNumber(task.lead.mobileNorm) : task.lead.mobileNorm,
        },
      };
    }
    if (task.case?.patient) {
      return {
        ...task,
        case: {
          ...task.case,
          patient: {
            ...task.case.patient,
            mobileNorm: shouldMask ? maskPhoneNumber(task.case.patient.mobileNorm) : task.case.patient.mobileNorm,
          },
        },
      };
    }
    return task;
  });

  return {
    data: sanitizedTasks,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Creates an ad-hoc task.
 */
export async function createTask(input: any, user: UserContext) {
  const task = await prisma.task.create({
    data: {
      type: input.type,
      title: input.title,
      dueAt: new Date(input.dueAt),
      priority: input.priority || 'warm',
      ownerId: input.ownerId || user.id,
      leadId: input.leadId || null,
      caseId: input.caseId || null,
      status: 'open',
    },
  });

  return task;
}

/**
 * Completes a task.
 */
export async function completeTask(taskId: number, user: UserContext) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'Task not found' };
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'done',
      completedAt: new Date(),
      completedBy: user.id,
    },
  });

  return updated;
}

/**
 * Snoozes a task. If snoozed > 2 times, requires manager role or approval.
 */
export async function snoozeTask(
  taskId: number,
  input: { newDueAt: string; reason: string },
  user: UserContext
) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'Task not found' };
  }

  const isManagerOrAdmin = ['telecaller_manager', 'center_head', 'owner', 'admin'].includes(user.roleCode);

  if (task.snoozeCount >= 2 && !isManagerOrAdmin) {
    throw {
      statusCode: 403,
      code: 'MANAGER_APPROVAL_REQUIRED',
      message: 'Snoozing a task more than 2 times requires manager approval.',
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.task.update({
      where: { id: taskId },
      data: {
        dueAt: new Date(input.newDueAt),
        snoozeCount: { increment: 1 },
        status: 'snoozed',
      },
    });

    // Record interaction note
    await tx.interaction.create({
      data: {
        type: 'note',
        direction: 'inbound',
        userId: user.id,
        leadId: task.leadId,
        caseId: task.caseId,
        note: `Task "${task.title}" snoozed until ${input.newDueAt}. Reason: ${input.reason}`,
        occurredAt: new Date(),
      },
    });

    return t;
  });

  return updated;
}

/**
 * Reschedules a task to a new due time.
 */
export async function rescheduleTask(
  taskId: number,
  input: { newDueAt: string; reason: string },
  user: UserContext
) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'Task not found' };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.task.update({
      where: { id: taskId },
      data: {
        dueAt: new Date(input.newDueAt),
        status: 'open',
      },
    });

    await tx.interaction.create({
      data: {
        type: 'note',
        direction: 'inbound',
        userId: user.id,
        leadId: task.leadId,
        caseId: task.caseId,
        note: `Task "${task.title}" rescheduled to ${input.newDueAt}. Reason: ${input.reason}`,
        occurredAt: new Date(),
      },
    });

    return t;
  });

  return updated;
}

/**
 * Reassigns a task to a new owner.
 */
export async function reassignTask(
  taskId: number,
  input: { newOwnerId: number; reason?: string },
  user: UserContext
) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'Task not found' };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.task.update({
      where: { id: taskId },
      data: {
        ownerId: input.newOwnerId,
      },
    });

    await tx.interaction.create({
      data: {
        type: 'note',
        direction: 'inbound',
        userId: user.id,
        leadId: task.leadId,
        caseId: task.caseId,
        note: `Task "${task.title}" reassigned to user #${input.newOwnerId}. Reason: ${input.reason || 'None'}`,
        occurredAt: new Date(),
      },
    });

    return t;
  });

  return updated;
}

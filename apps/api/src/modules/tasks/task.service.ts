import { prisma } from '../../database/client';
import { UserContext, scopeWhere } from '../rbac/scope';
import { Permissions, maskPhoneNumber, normalizePhoneNumber } from '@hospital-crm/shared';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay } from 'date-fns';

export interface TaskFilterOptions {
  team?: 'support' | 'admission' | 'aftercare' | 'product';
  category?: 'all' | 'enquiry' | 'appointment' | 'today_visits' | 'post_visit';
  status?: 'open' | 'done' | 'cancelled' | 'snoozed' | 'all';
  due?: 'overdue' | 'today' | 'upcoming' | 'appointments' | 'appointment_followups' | 'today_visits';
  priority?: 'hot' | 'warm' | 'cold';
  ownerId?: number;
  leadId?: number;
  caseId?: number;
  search?: string;
  nextStepOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export function buildTaskSearchWhere(search: string) {
  const s = search.trim();
  const cleanDigits = s.replace(/\D/g, '');
  const normalizedTerm = normalizePhoneNumber(s);

  const orClauses: any[] = [
    { title: { contains: s } },
    { lead: { name: { contains: s } } },
    { lead: { concern: { contains: s } } },
    { lead: { mobile: { contains: s } } },
    { lead: { mobileNorm: { contains: s } } },
    { case: { patient: { name: { contains: s } } } },
    { case: { patient: { patientCode: { contains: s } } } },
    { case: { patient: { mobileNorm: { contains: s } } } },
  ];

  if (normalizedTerm) {
    orClauses.push({ lead: { mobileNorm: { contains: normalizedTerm } } });
    orClauses.push({ case: { patient: { mobileNorm: { contains: normalizedTerm } } } });
  }

  if (cleanDigits && cleanDigits.length >= 3 && cleanDigits !== s) {
    orClauses.push({ lead: { mobile: { contains: cleanDigits } } });
    orClauses.push({ lead: { mobileNorm: { contains: cleanDigits } } });
    orClauses.push({ case: { patient: { mobileNorm: { contains: cleanDigits } } } });
  }

  const numericId = parseInt(s.replace(/^#/, ''), 10);
  if (!isNaN(numericId) && numericId > 0 && String(numericId) === s.replace(/^#/, '')) {
    orClauses.push({ id: numericId });
    orClauses.push({ caseId: numericId });
    orClauses.push({ leadId: numericId });
  }

  return { OR: orClauses };
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

  // Ensure follow-up tasks are linked to an active lead or case (exclude orphaned records)
  if (!filter.leadId && !filter.caseId) {
    where.AND.push({
      OR: [
        { leadId: { not: null } },
        { caseId: { not: null } },
      ],
    });
  }

  // Exclude initial first-touch inquiry call tasks from follow-ups (only actual follow-ups and scheduled callbacks)
  where.AND.push({
    NOT: {
      title: { startsWith: 'Inquiry Call:' },
    },
  });

  // Due Timing Filter
  if (filter.due === 'overdue') {
    where.AND.push({
      dueAt: { lt: now },
      status: 'open',
    });
  } else if (filter.due === 'today') {
    const startOfToday = fromZonedTime(startOfDay(zonedNow), timezone);
    const endOfToday = fromZonedTime(endOfDay(zonedNow), timezone);

    where.AND.push({
      dueAt: { gte: startOfToday, lte: endOfToday },
      status: 'open',
    });
  } else if (filter.due === 'upcoming') {
    const endOfToday = fromZonedTime(endOfDay(zonedNow), timezone);

    where.AND.push({
      dueAt: { gt: endOfToday },
      status: 'open',
    });
  } else if (filter.due === 'appointment_followups' || filter.due === 'appointments') {
    where.AND.push({
      status: 'open',
      OR: [
        { cadenceKey: { startsWith: 'appointment' } },
        { title: { contains: 'Appointment' } },
        { lead: { status: 'appointment_booked' } },
      ],
    });
  } else if (filter.due === 'today_visits') {
    const startOfToday = fromZonedTime(startOfDay(zonedNow), timezone);
    const endOfToday = fromZonedTime(endOfDay(zonedNow), timezone);

    where.AND.push({
      status: 'open',
      OR: [
        {
          lead: {
            appointments: {
              some: {
                startsAt: { gte: startOfToday, lte: endOfToday },
                status: { not: 'cancelled' },
              },
            },
          },
        },
        {
          case: {
            appointments: {
              some: {
                startsAt: { gte: startOfToday, lte: endOfToday },
                status: { not: 'cancelled' },
              },
            },
          },
        },
      ],
    });
  }

  // Team Filter
  if (filter.team === 'support') {
    where.AND.push({
      leadId: { not: null },
      lead: { leadType: { not: 'product' } },
    });
  } else if (filter.team === 'product') {
    where.AND.push({
      OR: [
        { leadId: { not: null }, lead: { leadType: 'product' } },
        { cadenceKey: { startsWith: 'product' } },
      ],
    });
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

  // Direct entity, priority, or owner filters
  if (filter.priority) {
    where.AND.push({ priority: filter.priority });
  }
  if (filter.ownerId) {
    where.AND.push({ ownerId: filter.ownerId });
  }
  if (filter.leadId) {
    where.AND.push({ leadId: filter.leadId });
  }
  if (filter.caseId) {
    where.AND.push({ caseId: filter.caseId });
  }
  if (filter.search && filter.search.trim()) {
    where.AND.push(buildTaskSearchWhere(filter.search));
  }

  // Follow-up Category Filter for Telecallers & Workstations
  let categoryClause: any = null;
  if (filter.category && filter.category !== 'all') {
    const startOfToday = fromZonedTime(startOfDay(zonedNow), timezone);
    const endOfToday = fromZonedTime(endOfDay(zonedNow), timezone);

    if (filter.category === 'enquiry') {
      categoryClause = {
        leadId: { not: null },
        lead: {
          status: {
            notIn: ['appointment_booked', 'visited', 'converted', 'closed', 'lost'],
          },
        },
        title: {
          not: { contains: 'Appointment' },
        },
        NOT: [
          { title: { contains: 'Refill' } },
          { title: { contains: 'Post-' } },
        ],
      };
    } else if (filter.category === 'appointment') {
      categoryClause = {
        OR: [
          { title: { contains: 'Appointment' } },
          { cadenceKey: { startsWith: 'appointment.reminders' } },
          { lead: { status: 'appointment_booked' } },
        ],
        title: {
          not: { contains: 'Post-' },
        },
        lead: {
          status: { notIn: ['visited', 'closed', 'lost'] },
        },
      };
    } else if (filter.category === 'today_visits') {
      categoryClause = {
        OR: [
          {
            lead: {
              appointments: {
                some: {
                  startsAt: { gte: startOfToday, lte: endOfToday },
                  status: { not: 'cancelled' },
                },
              },
            },
          },
          {
            case: {
              appointments: {
                some: {
                  startsAt: { gte: startOfToday, lte: endOfToday },
                  status: { not: 'cancelled' },
                },
              },
            },
          },
          {
            AND: [
              { dueAt: { gte: startOfToday, lte: endOfToday } },
              {
                OR: [
                  { title: { contains: 'Visit' } },
                  { title: { contains: 'Arrival' } },
                  { title: { contains: 'Attendance' } },
                ],
              },
            ],
          },
        ],
      };
    } else if (filter.category === 'post_visit') {
      categoryClause = {
        OR: [
          { title: { contains: 'Post-Appointment' } },
          { title: { contains: 'Attendance & Consultation check' } },
          { cadenceKey: { startsWith: 'appointment.post_visit' } },
          { lead: { status: 'visited' } },
          { case: { stage: 'aftercare_follow_up' } },
          { type: 'aftercare_call' },
        ],
      };
    }

    if (categoryClause) {
      where.AND.push(categoryClause);
    }
  }

  // Single next step filter: restrict to earliest open task per lead or case (unless actively searching)
  if (filter.nextStepOnly && !filter.search) {
    const openTasksWhere: any = {
      status: 'open',
      NOT: {
        title: { startsWith: 'Inquiry Call:' },
      },
      OR: [
        { leadId: { not: null } },
        { caseId: { not: null } },
      ],
    };
    if (filter.priority) {
      openTasksWhere.priority = filter.priority;
    }
    if (filter.ownerId) {
      openTasksWhere.ownerId = filter.ownerId;
    }
    if (filter.team === 'support') {
      openTasksWhere.leadId = { not: null };
      openTasksWhere.lead = { leadType: { not: 'product' } };
    } else if (filter.team === 'admission') {
      openTasksWhere.caseId = { not: null };
      openTasksWhere.case = { team: 'admission' };
    } else if (filter.team === 'aftercare') {
      openTasksWhere.caseId = { not: null };
      openTasksWhere.case = { team: 'aftercare' };
    } else if (filter.team === 'product') {
      openTasksWhere.OR = [
        { cadenceKey: { startsWith: 'product' } },
        { lead: { leadType: 'product' } },
      ];
    }

    if (categoryClause) {
      if (!openTasksWhere.AND) openTasksWhere.AND = [];
      openTasksWhere.AND.push(categoryClause);
    }

    if (filter.due === 'appointment_followups' || filter.due === 'appointments') {
      openTasksWhere.OR = [
        { cadenceKey: { startsWith: 'appointment' } },
        { title: { contains: 'Appointment' } },
        { lead: { status: 'appointment_booked' } },
      ];
    } else if (filter.due === 'today_visits') {
      const startOfToday = fromZonedTime(startOfDay(zonedNow), timezone);
      const endOfToday = fromZonedTime(endOfDay(zonedNow), timezone);
      openTasksWhere.OR = [
        {
          lead: {
            appointments: {
              some: {
                startsAt: { gte: startOfToday, lte: endOfToday },
                status: { not: 'cancelled' },
              },
            },
          },
        },
        {
          case: {
            appointments: {
              some: {
                startsAt: { gte: startOfToday, lte: endOfToday },
                status: { not: 'cancelled' },
              },
            },
          },
        },
      ];
    }

    const openTasks = await prisma.task.findMany({
      where: openTasksWhere,
      select: { id: true, leadId: true, caseId: true, dueAt: true },
      orderBy: [{ dueAt: 'asc' }, { id: 'asc' }],
    });

    const nextStepTaskIds: number[] = [];
    const seenLeads = new Set<number>();
    const seenCases = new Set<number>();

    for (const t of openTasks) {
      if (t.leadId) {
        if (!seenLeads.has(t.leadId)) {
          seenLeads.add(t.leadId);
          nextStepTaskIds.push(t.id);
        }
      } else if (t.caseId) {
        if (!seenCases.has(t.caseId)) {
          seenCases.add(t.caseId);
          nextStepTaskIds.push(t.id);
        }
      } else {
        nextStepTaskIds.push(t.id);
      }
    }

    where.AND.push({ id: { in: nextStepTaskIds } });
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
      orderBy: [{ dueAt: 'asc' }, { id: 'asc' }],
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
            testimonialsSentCount: true,
            leadType: true,
            department: { select: { id: true, code: true, labelEn: true, labelMl: true } },
            source: { select: { id: true, code: true, labelEn: true, labelMl: true } },
            productInterests: {
              include: {
                product: {
                  select: { id: true, name: true, sku: true, price: true },
                },
              },
            },
            interactions: {
              take: 1,
              orderBy: { occurredAt: 'desc' },
              select: {
                id: true,
                type: true,
                note: true,
                occurredAt: true,
                outcome: { select: { id: true, code: true, labelEn: true, labelMl: true } },
                user: { select: { id: true, name: true } },
              },
            },
            appointments: {
              where: { status: { not: 'cancelled' } },
              orderBy: { startsAt: 'desc' },
              take: 1,
              select: { id: true, doctorName: true, startsAt: true, status: true },
            },
          },
        },
        case: {
          select: {
            id: true,
            stage: true,
            careType: true,
            patient: { select: { id: true, patientCode: true, name: true, mobileNorm: true } },
            department: { select: { id: true, code: true, labelEn: true, labelMl: true } },
            interactions: {
              take: 1,
              orderBy: { occurredAt: 'desc' },
              select: {
                id: true,
                type: true,
                note: true,
                occurredAt: true,
                outcome: { select: { id: true, code: true, labelEn: true, labelMl: true } },
                user: { select: { id: true, name: true } },
              },
            },
            appointments: {
              where: { status: { not: 'cancelled' } },
              orderBy: { startsAt: 'desc' },
              take: 1,
              select: { id: true, doctorName: true, startsAt: true, status: true },
            },
          },
        },
      },
    }),
  ]);

  // Mask phone numbers if user role specifies phone masking
  const shouldMask = user.maskPhone;
  const sanitizedTasks = tasks.map((task: any) => {
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
 * Cancels a task.
 */
export async function cancelTask(taskId: number, user: UserContext, reason?: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'Task not found' };
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'cancelled',
      completedAt: new Date(),
      completedBy: user.id,
    },
  });

  // Record an activity note if associated with a lead or case
  if (task.leadId || task.caseId) {
    await prisma.interaction.create({
      data: {
        type: 'note',
        direction: 'inbound',
        userId: user.id,
        leadId: task.leadId,
        caseId: task.caseId,
        note: `Follow-up reminder "${task.title}" cancelled${reason ? ': ' + reason : ''}`,
        occurredAt: new Date(),
      },
    });
  }

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

  const updated = await prisma.$transaction(async (tx: any) => {
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

  const updated = await prisma.$transaction(async (tx: any) => {
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

  const updated = await prisma.$transaction(async (tx: any) => {
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

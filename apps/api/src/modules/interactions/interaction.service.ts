import { prisma } from '../../database/client';
import { UserContext } from '../rbac/scope';
import { applyCadence, cancelOpenCadenceTasks } from '../cadences/cadence.service';
import { toZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay } from 'date-fns';

export interface CallLimitsCheckResult {
  requiresOverride: boolean;
  warnings: string[];
  callsTodayCount: number;
  totalAttemptsCount: number;
  isOutsideCallingHours: boolean;
}

/**
 * Checks soft contact rules and calling hours for a lead or case.
 */
export async function checkCallLimits(
  resourceType: 'lead' | 'case',
  resourceId: number,
  timezone = 'Asia/Kolkata'
): Promise<CallLimitsCheckResult> {
  const warnings: string[] = [];
  const now = new Date();

  // 1. Fetch system settings
  const callingHoursSetting = await prisma.setting.findUnique({ where: { key: 'calling_hours' } });
  const contactRulesSetting = await prisma.setting.findUnique({ where: { key: 'contact_rules' } });

  const callingHours = (callingHoursSetting?.value as any) || { start: '09:00', end: '20:00' };
  const contactRules = (contactRulesSetting?.value as any) || { max_calls_per_day: 1, max_attempts_per_cycle: 3 };

  // 2. Check calling hours in target timezone
  const zonedNow = toZonedTime(now, timezone);
  const currentHours = zonedNow.getHours();
  const currentMinutes = zonedNow.getMinutes();
  const currentTimeMinutes = currentHours * 60 + currentMinutes;

  const [startH, startM] = (callingHours.start || '09:00').split(':').map(Number);
  const [endH, endM] = (callingHours.end || '20:00').split(':').map(Number);
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;

  const isOutsideCallingHours = currentTimeMinutes < startTotal || currentTimeMinutes >= endTotal;
  if (isOutsideCallingHours) {
    warnings.push(`Current time (${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}) is outside allowed calling hours (${callingHours.start} - ${callingHours.end}).`);
  }

  // 3. Count calls today (in local timezone day)
  const zonedStartOfDay = fromLocalZonedDate(startOfDay(zonedNow), timezone);
  const zonedEndOfDay = fromLocalZonedDate(endOfDay(zonedNow), timezone);

  const interactionWhere: any = {
    type: 'call',
    occurredAt: {
      gte: zonedStartOfDay,
      lte: zonedEndOfDay,
    },
    ...(resourceType === 'lead' ? { leadId: resourceId } : { caseId: resourceId }),
  };

  const callsTodayCount = await prisma.interaction.count({
    where: interactionWhere,
  });

  if (callsTodayCount >= (contactRules.max_calls_per_day || 1)) {
    warnings.push(`A call has already been placed to this patient today (Count: ${callsTodayCount}). Placing another call requires an override reason.`);
  }

  // 4. Count total call attempts in current open cycle
  const totalAttemptsCount = await prisma.interaction.count({
    where: {
      type: 'call',
      ...(resourceType === 'lead' ? { leadId: resourceId } : { caseId: resourceId }),
    },
  });

  if (totalAttemptsCount >= (contactRules.max_attempts_per_cycle || 3)) {
    warnings.push(`This is attempt #${totalAttemptsCount + 1} in this cycle (Soft limit: ${contactRules.max_attempts_per_cycle}). Exceeding the cycle limit requires an override reason.`);
  }

  return {
    requiresOverride: warnings.length > 0,
    warnings,
    callsTodayCount,
    totalAttemptsCount,
    isOutsideCallingHours,
  };
}

function fromLocalZonedDate(zonedDate: Date, timezone: string): Date {
  const { fromZonedTime } = require('date-fns-tz');
  return fromZonedTime(zonedDate, timezone);
}

export interface LogCallInput {
  leadId?: number | null;
  caseId?: number | null;
  outcomeId: number;
  durationSeconds?: number | null;
  note?: string;
  direction?: 'inbound' | 'outbound';
  overrideReason?: string | null;
  nextAction?: {
    type: string;
    title: string;
    dueAt: string;
    priority?: string;
    ownerId?: number | null;
  } | null;
  closedReasonId?: number | null;
  notStartedReasonId?: number | null;
  closureCodeId?: number | null;
}

/**
 * Logs a call interaction atomically with mandatory next action or closure,
 * enforcing soft contact rules, calling hours, and cadence transitions.
 */
export async function logCallInteraction(input: LogCallInput, user: UserContext) {
  if (!input.leadId && !input.caseId) {
    throw { statusCode: 400, code: 'INVALID_INPUT', message: 'Either leadId or caseId must be provided' };
  }

  const resourceType = input.leadId ? 'lead' : 'case';
  const resourceId = (input.leadId || input.caseId)!;

  // 1. Fetch Outcome to determine code & behavior
  const outcome = await prisma.callOutcome.findUnique({
    where: { id: input.outcomeId },
  });
  if (!outcome) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'Call outcome not found' };
  }

  const outcomeCode = outcome.code.toUpperCase();

  // 2. Soft contact rules & calling hours validation
  const limitsCheck = await checkCallLimits(resourceType, resourceId);
  if (limitsCheck.requiresOverride) {
    if (!input.overrideReason || input.overrideReason.trim().length === 0) {
      throw {
        statusCode: 422,
        code: 'OVERRIDE_REASON_REQUIRED',
        message: limitsCheck.warnings.join(' '),
        warnings: limitsCheck.warnings,
      };
    }
  }

  // 3. Mandatory next action rule (Acceptance Test 4)
  // An open lead cannot be saved or have a call logged without a next action and due time,
  // unless closing with a reason or converting.
  const isClosing = Boolean(input.closedReasonId || input.closureCodeId || input.notStartedReasonId);
  const isAutoCadenceOutcome = ['INTERESTED_NOT_READY', 'NO_ANSWER', 'SWITCHED_OFF_BUSY', 'INFORMATION_GIVEN'].includes(outcomeCode);

  if (!isClosing && !input.nextAction && !isAutoCadenceOutcome) {
    throw {
      statusCode: 400,
      code: 'NEXT_ACTION_REQUIRED',
      message: 'An open lead cannot have a call logged without a next action and due time.',
    };
  }

  // 4. Execute atomically in transaction
  return await prisma.$transaction(async (tx) => {
    // A. Create Interaction
    const interaction = await tx.interaction.create({
      data: {
        type: 'call',
        direction: input.direction || 'outbound',
        userId: user.id,
        leadId: input.leadId || null,
        caseId: input.caseId || null,
        outcomeId: input.outcomeId,
        durationSeconds: input.durationSeconds || null,
        note: input.note || null,
        overrideReason: input.overrideReason || null,
        occurredAt: new Date(),
      },
    });

    // B. Handle Lead-specific updates
    if (input.leadId) {
      const lead = await tx.lead.findUnique({
        where: { id: input.leadId },
        include: { branch: true },
      });

      if (!lead) {
        throw { statusCode: 404, code: 'NOT_FOUND', message: 'Lead not found' };
      }

      const updates: any = {};

      // First response SLA tracking
      if (!lead.firstResponseAt) {
        updates.firstResponseAt = new Date();
      }

      // If lead was 'new', advance status to 'contacted'
      if (lead.status === 'new') {
        updates.status = 'contacted';
      }

      // Handle Closure
      if (input.closedReasonId) {
        updates.status = 'not_interested';
        updates.closedReasonId = input.closedReasonId;
        updates.closedAt = new Date();
        // Cancel all open tasks for this lead
        await cancelOpenCadenceTasks(tx, 'lead', lead.id);
      }

      // Handle Emergency Redirect
      if (outcomeCode === 'EMERGENCY_REDIRECTED') {
        updates.emergencyFlag = true;

        // Notify branch duty nurses
        const dutyNurses = await tx.user.findMany({
          where: {
            dutyNurse: true,
            status: 'active',
            userBranches: { some: { branchId: lead.branchId } },
          },
        });

        for (const nurse of dutyNurses) {
          await tx.notification.create({
            data: {
              userId: nurse.id,
              type: 'emergency_redirect',
              title: `EMERGENCY REDIRECT: ${lead.name}`,
              body: `Lead #${lead.id} (${lead.name}) was marked as Emergency Redirected during call. Note: ${input.note || 'None'}`,
              link: `/leads/${lead.id}`,
            },
          });
        }
      }

      // Handle Cadence Triggers
      if (outcomeCode === 'INTERESTED_NOT_READY') {
        // Acceptance Test 5: Creates tasks at day 2, 7, 14, 30 (and monthly)
        await applyCadence(tx, 'lead', lead.id, 'lead.interested_not_ready', new Date(), {
          ownerId: lead.ownerId ?? user.id,
          timezone: lead.branch?.timezone || 'Asia/Kolkata',
        });
      } else if (outcomeCode === 'NO_ANSWER' || outcomeCode === 'SWITCHED_OFF_BUSY') {
        await applyCadence(tx, 'lead', lead.id, 'lead.no_answer', new Date(), {
          ownerId: lead.ownerId ?? user.id,
          timezone: lead.branch?.timezone || 'Asia/Kolkata',
        });
      } else if (outcomeCode === 'INFORMATION_GIVEN') {
        await applyCadence(tx, 'lead', lead.id, 'lead.information_given', new Date(), {
          ownerId: lead.ownerId ?? user.id,
          timezone: lead.branch?.timezone || 'Asia/Kolkata',
        });
      }

      // Apply explicit next action if provided
      if (input.nextAction && !input.closedReasonId) {
        await tx.task.create({
          data: {
            type: input.nextAction.type,
            title: input.nextAction.title,
            dueAt: new Date(input.nextAction.dueAt),
            priority: input.nextAction.priority || 'warm',
            ownerId: input.nextAction.ownerId || lead.ownerId || user.id,
            leadId: lead.id,
            status: 'open',
          },
        });
      }

      if (Object.keys(updates).length > 0) {
        await tx.lead.update({
          where: { id: lead.id },
          data: updates,
        });
      }
    }

    return interaction;
  });
}

/**
 * Logs a general note for a lead or case.
 */
export async function logNoteInteraction(
  resourceType: 'lead' | 'case',
  resourceId: number,
  noteText: string,
  user: UserContext
) {
  return await prisma.interaction.create({
    data: {
      type: 'note',
      direction: 'inbound',
      userId: user.id,
      note: noteText,
      ...(resourceType === 'lead' ? { leadId: resourceId } : { caseId: resourceId }),
      occurredAt: new Date(),
    },
  });
}

/**
 * Retrieves the full unified timeline of interactions, tasks, and appointments for a resource.
 */
export async function getUnifiedTimeline(resourceType: 'lead' | 'case', resourceId: number) {
  const whereResource = resourceType === 'lead' ? { leadId: resourceId } : { caseId: resourceId };

  const [interactions, tasks, appointments] = await Promise.all([
    prisma.interaction.findMany({
      where: whereResource,
      include: {
        user: { select: { id: true, name: true, email: true } },
        outcome: { select: { id: true, code: true, labelEn: true, labelMl: true } },
      },
      orderBy: { occurredAt: 'desc' },
    }),
    prisma.task.findMany({
      where: whereResource,
      include: {
        owner: { select: { id: true, name: true } },
        completedUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.appointment.findMany({
      where: whereResource,
      orderBy: { startsAt: 'desc' },
    }),
  ]);

  // Combine and sort chronologically
  const timeline: any[] = [];

  for (const item of interactions) {
    timeline.push({
      id: `interaction-${item.id}`,
      itemType: 'interaction',
      timestamp: item.occurredAt,
      data: item,
    });
  }

  for (const item of tasks) {
    timeline.push({
      id: `task-${item.id}`,
      itemType: 'task',
      timestamp: item.completedAt || item.dueAt || item.createdAt,
      data: item,
    });
  }

  for (const item of appointments) {
    timeline.push({
      id: `appointment-${item.id}`,
      itemType: 'appointment',
      timestamp: item.startsAt,
      data: item,
    });
  }

  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return timeline;
}

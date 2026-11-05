import { prisma } from '../../database/client';
import { UserContext } from '../rbac/scope';
import { cancelOpenCadenceTasks } from '../cadences/cadence.service';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay, addHours } from 'date-fns';

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
  return fromZonedTime(zonedDate, timezone);
}

export interface LogCallInput {
  leadId?: number | null;
  caseId?: number | null;
  taskId?: number | null;
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
  const effectiveOverrideReason = input.overrideReason || input.note || null;
  if (limitsCheck.requiresOverride) {
    if (!effectiveOverrideReason || effectiveOverrideReason.trim().length === 0) {
      throw {
        statusCode: 422,
        code: 'OVERRIDE_REASON_REQUIRED',
        message: 'Please enter notes/discussion summary for this call.',
        warnings: limitsCheck.warnings,
      };
    }
  }

  // 3. Mandatory next action rule
  // An open lead cannot be saved or have a call logged without a next action and due time,
  // unless closing with a reason or converting.
  const isClosing = Boolean(input.closedReasonId || input.closureCodeId || input.notStartedReasonId);

  if (!isClosing && !input.nextAction) {
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
        overrideReason: effectiveOverrideReason,
        occurredAt: new Date(),
      },
    });

    // B. Mark active/current task completed (if taskId provided or earliest open task on this resource)
    if (input.taskId) {
      await tx.task.updateMany({
        where: { id: input.taskId, status: 'open' },
        data: {
          status: 'done',
          completedAt: new Date(),
          completedBy: user.id,
        },
      });
    } else {
      const activeTask = await tx.task.findFirst({
        where: {
          status: 'open',
          ...(input.leadId ? { leadId: input.leadId } : input.caseId ? { caseId: input.caseId } : {}),
        },
        orderBy: { dueAt: 'asc' },
      });
      if (activeTask) {
        await tx.task.update({
          where: { id: activeTask.id },
          data: {
            status: 'done',
            completedAt: new Date(),
            completedBy: user.id,
          },
        });
      }
    }

    // C. Handle Lead-specific updates
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

      // Hospital Case-by-Case Follow-up: Staff manually sets the exact next follow-up and due date
      if (input.nextAction && !input.closedReasonId) {
        // Cancel existing open tasks on this lead so only the ONE new next follow-up action exists
        await cancelOpenCadenceTasks(tx, 'lead', lead.id);

        let taskTitle = input.nextAction.title?.trim();
        const isGeneric = !taskTitle || taskTitle === 'Follow-up Call' || taskTitle.startsWith('Follow-up with');
        if (isGeneric && input.note && input.note.trim()) {
          taskTitle = `Follow-up: ${input.note.trim().slice(0, 150)}`;
        }

        await tx.task.create({
          data: {
            type: input.nextAction.type,
            title: taskTitle || input.nextAction.title || 'Follow-up Call',
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

    // D. Handle Case-specific updates
    if (input.caseId && !input.leadId) {
      if (input.nextAction && !input.closedReasonId) {
        await cancelOpenCadenceTasks(tx, 'case', input.caseId);

        let taskTitle = input.nextAction.title?.trim();
        const isGeneric = !taskTitle || taskTitle === 'Follow-up Call' || taskTitle.startsWith('Follow-up with');
        if (isGeneric && input.note && input.note.trim()) {
          taskTitle = `Follow-up: ${input.note.trim().slice(0, 150)}`;
        }

        await tx.task.create({
          data: {
            type: input.nextAction.type,
            title: taskTitle || input.nextAction.title || 'Follow-up Call',
            dueAt: new Date(input.nextAction.dueAt),
            priority: input.nextAction.priority || 'warm',
            ownerId: input.nextAction.ownerId || user.id,
            caseId: input.caseId,
            status: 'open',
          },
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

/**
 * Logs an Aftercare Call interaction with structured questionnaire fields,
 * automatic manager callback on low feedback score (<= 6) [Acceptance Test 11],
 * and clinical red-flag escalation to duty doctor with 1-hour SLA [Acceptance Test 10].
 */
export async function logAftercareCallInteraction(
  input: {
    caseId: number;
    taskId?: number | null;
    outcomeId?: number | null;
    durationSeconds?: number | null;
    note?: string;
    details: {
      generalCondition: 'better' | 'same' | 'worse';
      medicinesTaken: 'yes' | 'partly' | 'no';
      symptoms?: string;
      dietRestFollowed?: boolean;
      reviewVisitBooked?: boolean;
      reviewVisitDate?: string | null;
      complaints?: string | null;
      feedbackScore?: number | null;
      escalateToDoctor?: boolean;
      escalationReason?: string | null;
    };
    overrideReason?: string | null;
    nextAction?: {
      type: string;
      title: string;
      dueAt: string;
      priority?: string;
    } | null;
    closureCodeId?: number | null;
    escalateToDoctor?: boolean;
    escalationReason?: string | null;
  },
  user: UserContext
) {
  const patientCase = await prisma.case.findFirst({
    where: { id: input.caseId, archivedAt: null },
    include: {
      patient: true,
      branch: true,
      treatingDoctor: true,
    },
  });

  if (!patientCase) {
    const err = new Error('Case not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  const now = new Date();
  const shouldEscalate = input.escalateToDoctor || input.details?.escalateToDoctor;
  const escalationReason = input.escalationReason || input.details?.escalationReason;
  let escalationId: number | null = null;

  // 1. Acceptance Test 10: Clinical Red Flag Escalation
  if (shouldEscalate) {
    if (!escalationReason || !escalationReason.trim()) {
      const err = new Error('Escalation reason is required when escalating to doctor');
      (err as any).statusCode = 400;
      (err as any).code = 'ESCALATION_REASON_REQUIRED';
      throw err;
    }

    const dutyDoctor = await prisma.user.findFirst({
      where: {
        status: 'active',
        available: true,
        OR: [{ dutyDoctor: true }, { role: { code: 'doctor' } }],
        userBranches: { some: { branchId: patientCase.branchId } },
      },
      select: { id: true, name: true },
    });

    const escalationDueAt = addHours(now, 1); // 1-hour SLA
    const escalation = await prisma.escalation.create({
      data: {
        caseId: input.caseId,
        raisedBy: user.id,
        reason: escalationReason,
        assignedDoctorId: dutyDoctor?.id || null,
        dueAt: escalationDueAt,
        status: 'pending',
      },
    });
    escalationId = escalation.id;

    if (dutyDoctor) {
      await prisma.notification.create({
        data: {
          userId: dutyDoctor.id,
          type: 'escalation',
          title: `🚨 Urgent Clinical Escalation: ${patientCase.patient?.name || 'Patient'}`,
          body: `Reason: ${escalationReason}. Decision required within 1 hour.`,
          link: `/doctor`,
        },
      });
    }
  }

  // 2. Acceptance Test 11: Low Feedback Score (<= 6) creates Telecaller Manager callback within 24h
  const feedbackScore = input.details?.feedbackScore;
  let managerCallbackTaskId: number | null = null;

  if (feedbackScore !== undefined && feedbackScore !== null && feedbackScore <= 6) {
    const manager = await prisma.user.findFirst({
      where: {
        status: 'active',
        role: { code: 'telecaller_manager' },
        userBranches: { some: { branchId: patientCase.branchId } },
      },
      select: { id: true, name: true },
    });

    const managerFallback =
      manager ||
      (await prisma.user.findFirst({
        where: { status: 'active', role: { code: 'telecaller_manager' } },
        select: { id: true, name: true },
      }));

    if (managerFallback) {
      const callbackTask = await prisma.task.create({
        data: {
          type: 'escalation_callback',
          title: `Low Feedback Callback (Score: ${feedbackScore}/10) - ${patientCase.patient?.name || 'Patient'}`,
          dueAt: addHours(now, 24), // within 24 hours
          priority: 'hot',
          ownerId: managerFallback.id,
          caseId: input.caseId,
          status: 'open',
        },
      });
      managerCallbackTaskId = callbackTask.id;

      await prisma.notification.create({
        data: {
          userId: managerFallback.id,
          type: 'low_feedback',
          title: `⚠️ Low Patient Feedback Alert (${feedbackScore}/10)`,
          body: `Patient ${patientCase.patient?.name} rated experience ${feedbackScore}/10 during aftercare call. Callback task created (24h SLA).`,
          link: `/cases/${input.caseId}`,
        },
      });
    }
  }

  // 3. Mark the cadence task completed if taskId is provided
  if (input.taskId) {
    await prisma.task.update({
      where: { id: input.taskId },
      data: {
        status: 'done',
        completedAt: now,
        completedBy: user.id,
        updatedAt: now,
      },
    });
  }

  // 4. Create Next Action task if specified
  if (input.nextAction) {
    await prisma.task.create({
      data: {
        type: input.nextAction.type,
        title: input.nextAction.title,
        dueAt: new Date(input.nextAction.dueAt),
        priority: input.nextAction.priority || 'warm',
        ownerId: patientCase.ownerId || user.id,
        caseId: input.caseId,
        status: 'open',
      },
    });
  }

  // 5. Book review visit if selected
  if (input.details?.reviewVisitBooked && input.details?.reviewVisitDate) {
    await prisma.appointment.create({
      data: {
        caseId: input.caseId,
        branchId: patientCase.branchId,
        doctorName: patientCase.treatingDoctor?.name || 'Treating Doctor',
        startsAt: new Date(input.details.reviewVisitDate),
        status: 'booked',
      },
    });
  }

  // 6. If closureCodeId provided, close the case
  if (input.closureCodeId) {
    await prisma.case.update({
      where: { id: input.caseId },
      data: {
        stage: 'completed',
        closureCodeId: input.closureCodeId,
        updatedAt: now,
      },
    });
    await cancelOpenCadenceTasks(prisma, 'case', input.caseId);
  }

  // 7. Record the interaction
  const noteContent =
    input.note ||
    `Aftercare Call: Condition ${input.details.generalCondition.toUpperCase()}, Meds: ${input.details.medicinesTaken}${feedbackScore != null ? ', Feedback: ' + feedbackScore + '/10' : ''}${shouldEscalate ? ' [ESCALATED TO DOCTOR]' : ''}`;

  const interaction = await prisma.interaction.create({
    data: {
      type: 'aftercare_call',
      direction: 'outbound',
      userId: user.id,
      caseId: input.caseId,
      outcomeId: input.outcomeId || null,
      durationSeconds: input.durationSeconds || 60,
      note: noteContent,
      details: input.details,
      overrideReason: input.overrideReason || null,
      occurredAt: now,
    },
    include: {
      outcome: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return {
    interaction,
    escalationId,
    managerCallbackTaskId,
  };
}

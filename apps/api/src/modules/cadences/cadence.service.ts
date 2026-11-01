import { PrismaClient, Prisma } from '@prisma/client';
import { addMinutes, addHours, addDays, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export interface DefaultCadenceDefinition {
  key: string;
  name: string;
  steps: {
    stepNo: number;
    offsetUnit: 'minutes' | 'hours' | 'days';
    offsetValue: number;
    taskType: string;
    titleTemplate: string;
    assigneeRule: string;
  }[];
}

export const DEFAULT_CADENCES: DefaultCadenceDefinition[] = [
  {
    key: 'lead.no_answer',
    name: 'Lead - No Answer Sequence',
    steps: [
      {
        stepNo: 1,
        offsetUnit: 'hours',
        offsetValue: 4,
        taskType: 'call',
        titleTemplate: 'No answer - Call attempt 2 (same day evening)',
        assigneeRule: 'owner',
      },
      {
        stepNo: 2,
        offsetUnit: 'days',
        offsetValue: 1,
        taskType: 'whatsapp',
        titleTemplate: 'No answer - Day 2 final message via WhatsApp',
        assigneeRule: 'owner',
      },
      {
        stepNo: 3,
        offsetUnit: 'days',
        offsetValue: 2,
        taskType: 'call',
        titleTemplate: 'No answer - Close as not reachable',
        assigneeRule: 'owner',
      },
    ],
  },
  {
    key: 'lead.interested_not_ready',
    name: 'Lead - Interested Not Ready Sequence',
    steps: [
      {
        stepNo: 1,
        offsetUnit: 'days',
        offsetValue: 2,
        taskType: 'call',
        titleTemplate: 'Follow-up: Interested Not Ready (Day 2)',
        assigneeRule: 'owner',
      },
      {
        stepNo: 2,
        offsetUnit: 'days',
        offsetValue: 7,
        taskType: 'call',
        titleTemplate: 'Follow-up: Interested Not Ready (Day 7)',
        assigneeRule: 'owner',
      },
      {
        stepNo: 3,
        offsetUnit: 'days',
        offsetValue: 14,
        taskType: 'call',
        titleTemplate: 'Follow-up: Interested Not Ready (Day 14)',
        assigneeRule: 'owner',
      },
      {
        stepNo: 4,
        offsetUnit: 'days',
        offsetValue: 30,
        taskType: 'call',
        titleTemplate: 'Follow-up: Interested Not Ready (Day 30)',
        assigneeRule: 'owner',
      },
      {
        stepNo: 5,
        offsetUnit: 'days',
        offsetValue: 60,
        taskType: 'call',
        titleTemplate: 'Follow-up: Interested Not Ready (Month 2)',
        assigneeRule: 'owner',
      },
      {
        stepNo: 6,
        offsetUnit: 'days',
        offsetValue: 90,
        taskType: 'call',
        titleTemplate: 'Follow-up: Interested Not Ready (Month 3)',
        assigneeRule: 'owner',
      },
      {
        stepNo: 7,
        offsetUnit: 'days',
        offsetValue: 120,
        taskType: 'call',
        titleTemplate: 'Follow-up: Interested Not Ready (Month 4)',
        assigneeRule: 'owner',
      },
    ],
  },
  {
    key: 'lead.information_given',
    name: 'Lead - Information Given Sequence',
    steps: [
      {
        stepNo: 1,
        offsetUnit: 'days',
        offsetValue: 1,
        taskType: 'call',
        titleTemplate: 'Information Given - Check status (Day 1)',
        assigneeRule: 'owner',
      },
      {
        stepNo: 2,
        offsetUnit: 'days',
        offsetValue: 3,
        taskType: 'call',
        titleTemplate: 'Information Given - Follow-up (Day 3)',
        assigneeRule: 'owner',
      },
      {
        stepNo: 3,
        offsetUnit: 'days',
        offsetValue: 7,
        taskType: 'call',
        titleTemplate: 'Information Given - Decision check (Day 7)',
        assigneeRule: 'owner',
      },
    ],
  },
  {
    key: 'appointment.reminders',
    name: 'Appointment - Patient Reminders',
    steps: [
      {
        stepNo: 1,
        offsetUnit: 'hours',
        offsetValue: -24,
        taskType: 'reminder',
        titleTemplate: 'Appointment Reminder (24h before)',
        assigneeRule: 'owner',
      },
      {
        stepNo: 2,
        offsetUnit: 'hours',
        offsetValue: -2,
        taskType: 'reminder',
        titleTemplate: 'Appointment Reminder (2h before)',
        assigneeRule: 'owner',
      },
    ],
  },
  {
    key: 'appointment.missed',
    name: 'Appointment - Missed Recovery',
    steps: [
      {
        stepNo: 1,
        offsetUnit: 'hours',
        offsetValue: 1,
        taskType: 'call',
        titleTemplate: 'Missed Appointment Recovery (+1h)',
        assigneeRule: 'owner',
      },
      {
        stepNo: 2,
        offsetUnit: 'days',
        offsetValue: 1,
        taskType: 'call',
        titleTemplate: 'Missed Appointment Recovery (Day 1)',
        assigneeRule: 'owner',
      },
      {
        stepNo: 3,
        offsetUnit: 'days',
        offsetValue: 3,
        taskType: 'call',
        titleTemplate: 'Missed Appointment Recovery (Day 3)',
        assigneeRule: 'owner',
      },
      {
        stepNo: 4,
        offsetUnit: 'days',
        offsetValue: 7,
        taskType: 'call',
        titleTemplate: 'Missed Appointment - Final follow-up or close (Day 7)',
        assigneeRule: 'owner',
      },
    ],
  },
  {
    key: 'case.admission_advised',
    name: 'Case - Admission Advised Cadence',
    steps: [
      {
        stepNo: 1,
        offsetUnit: 'hours',
        offsetValue: 24,
        taskType: 'call',
        titleTemplate: 'Admission Advised - Initial Counseling Follow-up (24h)',
        assigneeRule: 'owner',
      },
      {
        stepNo: 2,
        offsetUnit: 'days',
        offsetValue: 3,
        taskType: 'call',
        titleTemplate: 'Admission Advised - Counseling Follow-up (Day 3)',
        assigneeRule: 'owner',
      },
      {
        stepNo: 3,
        offsetUnit: 'days',
        offsetValue: 7,
        taskType: 'call',
        titleTemplate: 'Admission Advised - Counseling Follow-up (Day 7)',
        assigneeRule: 'owner',
      },
    ],
  },
  {
    key: 'case.plan_given_not_accepted',
    name: 'Case - Plan Given Not Accepted',
    steps: [
      {
        stepNo: 1,
        offsetUnit: 'days',
        offsetValue: 3,
        taskType: 'call',
        titleTemplate: 'Estimate Follow-up (Day 3)',
        assigneeRule: 'owner',
      },
      {
        stepNo: 2,
        offsetUnit: 'days',
        offsetValue: 7,
        taskType: 'call',
        titleTemplate: 'Estimate Follow-up (Day 7)',
        assigneeRule: 'owner',
      },
      {
        stepNo: 3,
        offsetUnit: 'days',
        offsetValue: 14,
        taskType: 'call',
        titleTemplate: 'Estimate Follow-up (Day 14)',
        assigneeRule: 'owner',
      },
      {
        stepNo: 4,
        offsetUnit: 'days',
        offsetValue: 30,
        taskType: 'call',
        titleTemplate: 'Estimate Follow-up (Day 30)',
        assigneeRule: 'owner',
      },
    ],
  },
  {
    key: 'case.aftercare_inpatient',
    name: 'Case - Aftercare In-Patient Cadence',
    steps: [
      {
        stepNo: 1,
        offsetUnit: 'days',
        offsetValue: 2,
        taskType: 'call',
        titleTemplate: 'Aftercare Call (Day 2 post-discharge)',
        assigneeRule: 'owner',
      },
      {
        stepNo: 2,
        offsetUnit: 'days',
        offsetValue: 7,
        taskType: 'call',
        titleTemplate: 'Aftercare Call + Feedback Score (Day 7 post-discharge)',
        assigneeRule: 'owner',
      },
      {
        stepNo: 3,
        offsetUnit: 'days',
        offsetValue: 30,
        taskType: 'call',
        titleTemplate: 'Aftercare Call (Day 30 post-discharge)',
        assigneeRule: 'owner',
      },
      {
        stepNo: 4,
        offsetUnit: 'days',
        offsetValue: 90,
        taskType: 'call',
        titleTemplate: 'Aftercare Call - Final Review (Day 90 post-discharge)',
        assigneeRule: 'owner',
      },
    ],
  },
  {
    key: 'case.aftercare_opd',
    name: 'Case - Aftercare OPD/Procedure Cadence',
    steps: [
      {
        stepNo: 1,
        offsetUnit: 'days',
        offsetValue: 7,
        taskType: 'call',
        titleTemplate: 'Aftercare Call + Feedback Score (Day 7 post-treatment)',
        assigneeRule: 'owner',
      },
      {
        stepNo: 2,
        offsetUnit: 'days',
        offsetValue: 30,
        taskType: 'call',
        titleTemplate: 'Aftercare Call (Day 30 post-treatment)',
        assigneeRule: 'owner',
      },
      {
        stepNo: 3,
        offsetUnit: 'days',
        offsetValue: 90,
        taskType: 'call',
        titleTemplate: 'Aftercare Call - Final Review (Day 90 post-treatment)',
        assigneeRule: 'owner',
      },
    ],
  },
];

/**
 * Ensures all default cadences and steps exist in the database.
 */
export async function ensureDefaultCadences(prisma: PrismaClient | Prisma.TransactionClient): Promise<void> {
  for (const cadDef of DEFAULT_CADENCES) {
    const cadence = await prisma.cadence.upsert({
      where: { key: cadDef.key },
      update: { name: cadDef.name, active: true },
      create: { key: cadDef.key, name: cadDef.name, active: true },
    });

    for (const step of cadDef.steps) {
      await prisma.cadenceStep.upsert({
        where: {
          cadenceId_stepNo: {
            cadenceId: cadence.id,
            stepNo: step.stepNo,
          },
        },
        update: {
          offsetUnit: step.offsetUnit,
          offsetValue: step.offsetValue,
          taskType: step.taskType,
          titleTemplate: step.titleTemplate,
          assigneeRule: step.assigneeRule,
        },
        create: {
          cadenceId: cadence.id,
          stepNo: step.stepNo,
          offsetUnit: step.offsetUnit,
          offsetValue: step.offsetValue,
          taskType: step.taskType,
          titleTemplate: step.titleTemplate,
          assigneeRule: step.assigneeRule,
        },
      });
    }
  }
}

/**
 * Calculates due date for a cadence step relative to baseTime.
 * For day offsets, sets time to 10:00 AM local time (Asia/Kolkata default).
 */
export function calculateStepDueAt(
  baseTime: Date,
  offsetUnit: string,
  offsetValue: number,
  timezone = 'Asia/Kolkata'
): Date {
  if (offsetUnit === 'minutes') {
    return addMinutes(baseTime, offsetValue);
  }
  if (offsetUnit === 'hours') {
    return addHours(baseTime, offsetValue);
  }
  if (offsetUnit === 'days') {
    // Convert baseTime to local time in target timezone
    const zonedBase = toZonedTime(baseTime, timezone);
    // Add offset days
    const zonedTargetDay = addDays(zonedBase, offsetValue);
    // Set to 10:00:00.000 AM local time
    const at10am = setMilliseconds(setSeconds(setMinutes(setHours(zonedTargetDay, 10), 0), 0), 0);
    // Convert back to UTC Date
    return fromZonedTime(at10am, timezone);
  }
  return addDays(baseTime, offsetValue);
}

/**
 * Cancels all open tasks linked to the specified lead or case from previous cadences.
 */
export async function cancelOpenCadenceTasks(
  prisma: PrismaClient | Prisma.TransactionClient,
  resourceType: 'lead' | 'case',
  resourceId: number
): Promise<number> {
  const updateResult = await prisma.task.updateMany({
    where: {
      status: 'open',
      ...(resourceType === 'lead' ? { leadId: resourceId } : { caseId: resourceId }),
    },
    data: {
      status: 'cancelled',
      updatedAt: new Date(),
    },
  });

  return updateResult.count;
}

/**
 * Applies a cadence: cancels open previous cadence tasks and generates new tasks.
 */
export async function applyCadence(
  prisma: PrismaClient | Prisma.TransactionClient,
  resourceType: 'lead' | 'case',
  resourceId: number,
  cadenceKey: string,
  baseTime: Date,
  options?: {
    ownerId?: number;
    timezone?: string;
    priority?: string;
  }
): Promise<any[]> {
  // 1. Cancel previous open cadence tasks
  await cancelOpenCadenceTasks(prisma, resourceType, resourceId);

  // 2. Fetch cadence with steps
  const cadence = await prisma.cadence.findUnique({
    where: { key: cadenceKey },
    include: {
      steps: {
        orderBy: { stepNo: 'asc' },
      },
    },
  });

  if (!cadence || !cadence.active || cadence.steps.length === 0) {
    return [];
  }

  // 3. Fallback owner if not supplied
  let ownerId = options?.ownerId;
  if (!ownerId) {
    if (resourceType === 'lead') {
      const lead = await prisma.lead.findUnique({ where: { id: resourceId }, select: { ownerId: true } });
      ownerId = lead?.ownerId ?? 1;
    } else {
      const c = await prisma.case.findUnique({ where: { id: resourceId }, select: { ownerId: true } });
      ownerId = c?.ownerId ?? 1;
    }
  }

  const timezone = options?.timezone || 'Asia/Kolkata';
  const priority = options?.priority || 'warm';

  // 4. Create tasks for each step
  const createdTasks = [];
  for (const step of cadence.steps) {
    const dueAt = calculateStepDueAt(baseTime, step.offsetUnit, step.offsetValue, timezone);

    const task = await prisma.task.create({
      data: {
        type: step.taskType,
        title: step.titleTemplate,
        dueAt,
        priority,
        ownerId,
        ...(resourceType === 'lead' ? { leadId: resourceId } : { caseId: resourceId }),
        cadenceKey: cadence.key,
        cadenceStep: step.stepNo,
        status: 'open',
      },
    });

    createdTasks.push(task);
  }

  return createdTasks;
}

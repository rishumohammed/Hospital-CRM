import { prisma } from '../../database/client';
import { UserContext, scopeWhere } from '../rbac/scope';
import { addHours } from 'date-fns';
import { recordAuditLog } from '../audit/audit.service';

export interface ListEscalationsParams {
  status?: string;
  assignedToMe?: boolean;
  branchId?: number;
}

export async function listEscalations(user: UserContext, params: ListEscalationsParams) {
  const whereClause: any = {};

  if (params.status && params.status !== 'all') {
    whereClause.status = params.status;
  }

  if (params.assignedToMe) {
    whereClause.assignedDoctorId = user.id;
  }

  // Branch filter or role-based scoping
  const roleCode = user.roleCode;
  if (roleCode === 'doctor') {
    // Doctors see escalations assigned to them or cases where they are treating doctor, or branch escalations
    if (!params.assignedToMe) {
      whereClause.OR = [
        { assignedDoctorId: user.id },
        { case: { treatingDoctorId: user.id } },
        { case: { branchId: { in: user.branchIds } } },
      ];
    }
  } else if (roleCode !== 'owner' && roleCode !== 'admin') {
    // Scope to user's branches
    whereClause.case = { branchId: { in: user.branchIds } };
  }

  if (params.branchId) {
    whereClause.case = { ...whereClause.case, branchId: params.branchId };
  }

  return prisma.escalation.findMany({
    where: whereClause,
    include: {
      case: {
        include: {
          patient: true,
          branch: true,
          department: true,
        },
      },
      raisedUser: {
        select: { id: true, name: true, email: true, role: true },
      },
      assignedDoctor: {
        select: { id: true, name: true, email: true, role: true },
      },
      decidedUser: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createEscalation(
  user: UserContext,
  input: { caseId: number; reason: string },
  ip?: string,
  userAgent?: string
) {
  const patientCase = await prisma.case.findFirst({
    where: { id: input.caseId, archivedAt: null },
    include: { patient: true, branch: true },
  });

  if (!patientCase) {
    const err = new Error('Case not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  // Find duty doctor in the case's branch
  const dutyDoctor = await prisma.user.findFirst({
    where: {
      status: 'active',
      available: true,
      OR: [
        { dutyDoctor: true },
        { role: { code: 'doctor' } },
      ],
      userBranches: { some: { branchId: patientCase.branchId } },
    },
    select: { id: true, name: true, email: true },
  });

  const now = new Date();
  const dueAt = addHours(now, 1); // 1-hour SLA for duty doctor decision

  const escalation = await prisma.escalation.create({
    data: {
      caseId: input.caseId,
      raisedBy: user.id,
      reason: input.reason,
      assignedDoctorId: dutyDoctor?.id || null,
      dueAt,
      status: 'pending',
    },
    include: {
      case: { include: { patient: true, branch: true } },
      raisedUser: { select: { id: true, name: true } },
      assignedDoctor: { select: { id: true, name: true } },
    },
  });

  // Notify duty doctor
  if (dutyDoctor) {
    await prisma.notification.create({
      data: {
        userId: dutyDoctor.id,
        type: 'escalation',
        title: `🚨 Urgent Clinical Escalation: ${patientCase.patient?.name || 'Patient'}`,
        body: `Reason: ${input.reason}. Decision required within 1 hour.`,
        link: `/doctor`,
      },
    });
  }

  // Also log status change / escalation interaction on the case
  await prisma.interaction.create({
    data: {
      type: 'status_change',
      direction: 'inbound',
      userId: user.id,
      caseId: input.caseId,
      note: `Clinical Red Flag Escalation raised: ${input.reason}. Assigned to: ${dutyDoctor?.name || 'Branch Duty Doctor'} (1h SLA).`,
      occurredAt: now,
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: 'ESCALATION_CREATED',
    entity: 'escalation',
    entityId: escalation.id,
    after: { caseId: input.caseId, reason: input.reason, assignedDoctorId: dutyDoctor?.id },
    ip,
    userAgent,
  });

  return escalation;
}

export async function recordEscalationDecision(
  user: UserContext,
  escalationId: number,
  input: { decision: string; callbackDueAt?: string | null },
  ip?: string,
  userAgent?: string
) {
  const escalation = await prisma.escalation.findUnique({
    where: { id: escalationId },
    include: {
      case: { include: { patient: true } },
      raisedUser: true,
    },
  });

  if (!escalation) {
    const err = new Error('Escalation not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  const now = new Date();

  const updated = await prisma.$transaction(async (tx: any) => {
    // 1. Update escalation status
    const result = await tx.escalation.update({
      where: { id: escalationId },
      data: {
        decision: input.decision,
        decidedBy: user.id,
        decidedAt: now,
        status: 'decided',
      },
      include: {
        case: { include: { patient: true, branch: true } },
        raisedUser: { select: { id: true, name: true, email: true } },
        decidedUser: { select: { id: true, name: true } },
      },
    });

    // 2. Acceptance Test 10: Aftercare executive gets a callback task
    const callbackDue = input.callbackDueAt
      ? new Date(input.callbackDueAt)
      : addHours(now, 2);

    await tx.task.create({
      data: {
        type: 'escalation_callback',
        title: `Doctor Decision Callback: ${escalation.case.patient?.name || 'Patient'}`,
        dueAt: callbackDue,
        priority: 'hot',
        ownerId: escalation.raisedBy,
        caseId: escalation.caseId,
        status: 'open',
      },
    });

    // 3. Notify the executive who raised the escalation
    await tx.notification.create({
      data: {
        userId: escalation.raisedBy,
        type: 'escalation_decision',
        title: `✅ Doctor Decision on Escalation #${escalation.id}`,
        body: `Dr. ${user.name}: "${input.decision}". A callback task has been added to your queue.`,
        link: `/cases/${escalation.caseId}`,
      },
    });

    // 4. Log interaction
    await tx.interaction.create({
      data: {
        type: 'note',
        direction: 'inbound',
        userId: user.id,
        caseId: escalation.caseId,
        note: `Clinical Escalation Decided by Dr. ${user.name}: "${input.decision}"`,
        occurredAt: now,
      },
    });

    return result;
  });

  await recordAuditLog({
    userId: user.id,
    action: 'ESCALATION_DECIDED',
    entity: 'escalation',
    entityId: escalationId,
    before: { status: escalation.status },
    after: { status: 'decided', decision: input.decision, decidedBy: user.id },
    ip,
    userAgent,
  });

  return updated;
}

import { prisma } from '../../database/client';
import { UserContext, scopeWhere } from '../rbac/scope';
import { maskPhoneNumber, Permissions, CareTypes, CaseStages } from '@hospital-crm/shared';
import { recordAuditLog } from '../audit/audit.service';
import { applyCadence } from '../cadences/cadence.service';

export interface ListCasesParams {
  page?: number;
  pageSize?: number;
  stage?: string;
  careType?: string;
  branchId?: number;
  departmentId?: number;
  ownerId?: number;
  treatingDoctorId?: number;
  team?: string;
  search?: string;
}

/**
 * Assigns a case via round-robin to an active admission specialist in the branch.
 */
export async function assignCaseRoundRobin(branchId: number): Promise<number | null> {
  const specialists = await prisma.user.findMany({
    where: {
      status: 'active',
      available: true,
      role: { code: 'admission_specialist' },
      userBranches: { some: { branchId } },
      userTeams: { some: { team: { code: 'admission' } } },
    },
    select: {
      id: true,
      _count: {
        select: {
          ownedCases: {
            where: {
              stage: { in: ['visited', 'plan_given', 'counseling_estimate', 'plan_accepted'] },
              archivedAt: null,
            },
          },
        },
      },
      ownedCases: {
        where: { archivedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  if (specialists.length === 0) {
    // Fallback: any active user in admission team or admission_specialist role
    const fallback = await prisma.user.findFirst({
      where: {
        status: 'active',
        available: true,
        role: { code: 'admission_specialist' },
      },
      select: { id: true },
    });
    return fallback ? fallback.id : null;
  }

  specialists.sort((a, b) => {
    const countDiff = a._count.ownedCases - b._count.ownedCases;
    if (countDiff !== 0) return countDiff;

    const aTime = a.ownedCases[0]?.createdAt.getTime() || 0;
    const bTime = b.ownedCases[0]?.createdAt.getTime() || 0;
    return aTime - bTime;
  });

  return specialists[0].id;
}

/**
 * Lists cases filtered by criteria and strictly scoped by user RBAC permissions.
 */
export async function listCases(
  params: ListCasesParams,
  user: UserContext
): Promise<{ cases: any[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: any = {
    archivedAt: null,
    ...scopeWhere(user, 'case', Permissions.CASE_VIEW),
  };

  if (params.stage) {
    where.stage = params.stage;
  }

  if (params.careType) {
    where.careType = params.careType;
  }

  if (params.branchId) {
    where.branchId = params.branchId;
  }

  if (params.departmentId) {
    where.departmentId = params.departmentId;
  }

  if (params.ownerId) {
    where.ownerId = params.ownerId;
  }

  if (params.treatingDoctorId) {
    where.treatingDoctorId = params.treatingDoctorId;
  }

  if (params.team) {
    where.team = params.team;
  }

  if (params.search && params.search.trim()) {
    const search = params.search.trim();
    where.OR = [
      { patient: { name: { contains: search } } },
      { patient: { mobileNorm: { contains: search } } },
      { patient: { patientCode: { contains: search } } },
    ];
  }

  const [total, cases] = await Promise.all([
    prisma.case.count({ where }),
    prisma.case.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            patientCode: true,
            name: true,
            mobileNorm: true,
            language: true,
            dateOfBirth: true,
          },
        },
        department: { select: { id: true, code: true, labelEn: true, labelMl: true } },
        branch: { select: { id: true, code: true, name: true, timezone: true } },
        owner: { select: { id: true, name: true, email: true } },
        treatingDoctor: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            tasks: { where: { status: 'open' } },
            interactions: true,
          },
        },
      },
    }),
  ]);

  // Mask phone numbers if user role requires it
  const sanitizedCases = cases.map((c) => {
    if (user.maskPhone && c.patient?.mobileNorm) {
      return {
        ...c,
        patient: {
          ...c.patient,
          mobileNorm: maskPhoneNumber(c.patient.mobileNorm),
        },
      };
    }
    return c;
  });

  return {
    cases: sanitizedCases,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Gets a case by ID with full relations and activity timeline.
 */
export async function getCaseById(
  caseId: number,
  user: UserContext,
  ip?: string,
  userAgent?: string
): Promise<any> {
  const patientCase = await prisma.case.findFirst({
    where: {
      id: caseId,
      archivedAt: null,
      ...scopeWhere(user, 'case', Permissions.CASE_VIEW),
    },
    include: {
      patient: true,
      department: true,
      branch: true,
      owner: { select: { id: true, name: true, email: true } },
      treatingDoctor: { select: { id: true, name: true, email: true } },
      notStartedReason: true,
      closureCode: true,
      lead: {
        select: {
          id: true,
          name: true,
          mobile: true,
          status: true,
          source: { select: { labelEn: true } },
        },
      },
      appointments: {
        orderBy: { startsAt: 'desc' },
      },
      tasks: {
        orderBy: { dueAt: 'asc' },
        include: {
          owner: { select: { id: true, name: true } },
        },
      },
      interactions: {
        orderBy: { occurredAt: 'desc' },
        include: {
          user: { select: { id: true, name: true } },
          outcome: true,
        },
      },
    },
  });

  if (!patientCase) {
    const exists = await prisma.case.findUnique({ where: { id: caseId } });
    if (exists) {
      await recordAuditLog({
        userId: user.id,
        action: 'ACCESS_DENIED',
        entity: 'case',
        entityId: caseId,
        ip,
        userAgent,
      });
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

  await recordAuditLog({
    userId: user.id,
    action: 'CASE_VIEW',
    entity: 'case',
    entityId: caseId,
    ip,
    userAgent,
  });

  if (user.maskPhone && patientCase.patient?.mobileNorm) {
    patientCase.patient.mobileNorm = maskPhoneNumber(patientCase.patient.mobileNorm);
  }

  return patientCase;
}

/**
 * Updates a case's general fields.
 */
export async function updateCase(
  caseId: number,
  data: any,
  user: UserContext,
  ip?: string,
  userAgent?: string
): Promise<any> {
  const patientCase = await prisma.case.findFirst({
    where: {
      id: caseId,
      archivedAt: null,
      ...scopeWhere(user, 'case', Permissions.CASE_EDIT),
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

  const updated = await prisma.case.update({
    where: { id: caseId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
    include: {
      patient: true,
      department: true,
      branch: true,
      owner: { select: { id: true, name: true, email: true } },
      treatingDoctor: { select: { id: true, name: true, email: true } },
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: 'CASE_UPDATED',
    entity: 'case',
    entityId: caseId,
    before: patientCase,
    after: updated,
    ip,
    userAgent,
  });

  return updated;
}

/**
 * Records consultation outcome for a case.
 * If careType = 'in_patient':
 *   - Sets advisedAdmission = true
 *   - Moves stage to 'plan_given'
 *   - Routes team to 'admission'
 *   - Assigns round-robin to Admission Specialist in branch
 *   - Schedules 'case.admission_advised' cadence (24h first follow-up, Day 3, Day 7)
 * If careType = 'consultation_only':
 *   - Sets stage to 'completed'
 * If careType = 'opd_course' or 'procedure':
 *   - Sets stage to 'counseling_estimate'
 */
export async function recordConsultationOutcome(
  caseId: number,
  input: {
    careType: 'consultation_only' | 'opd_course' | 'in_patient' | 'procedure';
    departmentId?: number;
    treatingDoctorId?: number | null;
    estimatedAmount?: number | null;
    planNote?: string;
  },
  user: UserContext,
  ip?: string,
  userAgent?: string
): Promise<any> {
  const patientCase = await prisma.case.findFirst({
    where: {
      id: caseId,
      archivedAt: null,
      ...scopeWhere(user, 'case', Permissions.CASE_EDIT),
    },
    include: {
      branch: true,
      patient: true,
    },
  });

  if (!patientCase) {
    const exists = await prisma.case.findUnique({ where: { id: caseId } });
    if (exists) {
      await recordAuditLog({
        userId: user.id,
        action: 'ACCESS_DENIED',
        entity: 'case',
        entityId: caseId,
        ip,
        userAgent,
      });
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

  const now = new Date();
  let nextStage = patientCase.stage;
  let advisedAdmission = false;
  let newTeam = patientCase.team;
  let newOwnerId = patientCase.ownerId;

  if (input.careType === CareTypes.IN_PATIENT) {
    advisedAdmission = true;
    nextStage = CaseStages.PLAN_GIVEN;
    newTeam = 'admission';

    // Assign round-robin to an admission specialist in this branch
    const specialistId = await assignCaseRoundRobin(patientCase.branchId);
    if (specialistId) {
      newOwnerId = specialistId;
    }
  } else if (input.careType === CareTypes.CONSULTATION_ONLY) {
    advisedAdmission = false;
    nextStage = CaseStages.COMPLETED;
  } else {
    // OPD course or Procedure
    advisedAdmission = false;
    nextStage = CaseStages.COUNSELING_ESTIMATE;
  }

  const result = await prisma.$transaction(async (tx: any) => {
    // 1. Update Case
    const updated = await tx.case.update({
      where: { id: caseId },
      data: {
        careType: input.careType,
        departmentId: input.departmentId ?? patientCase.departmentId,
        treatingDoctorId: input.treatingDoctorId !== undefined ? input.treatingDoctorId : (user.roleCode === 'doctor' ? user.id : patientCase.treatingDoctorId),
        estimatedAmount: input.estimatedAmount !== undefined ? input.estimatedAmount : patientCase.estimatedAmount,
        consultationCompletedAt: now,
        advisedAdmission,
        stage: nextStage,
        team: newTeam,
        ownerId: newOwnerId,
        updatedAt: now,
      },
      include: {
        patient: true,
        department: true,
        branch: true,
        owner: { select: { id: true, name: true, email: true } },
        treatingDoctor: { select: { id: true, name: true, email: true } },
      },
    });

    // 2. If advised admission, trigger 'case.admission_advised' cadence
    let tasksCreated: any[] = [];
    if (input.careType === CareTypes.IN_PATIENT) {
      tasksCreated = await applyCadence(
        tx,
        'case',
        caseId,
        'case.admission_advised',
        now,
        {
          ownerId: newOwnerId ?? undefined,
          timezone: patientCase.branch.timezone,
          priority: 'hot',
        }
      );
    }

    // 3. Record interaction
    await tx.interaction.create({
      data: {
        type: 'status_change',
        direction: 'inbound',
        userId: user.id,
        caseId: caseId,
        note: `Consultation outcome: ${input.careType.toUpperCase()}.${advisedAdmission ? ' Advised In-Patient Admission.' : ''} ${input.planNote ? 'Clinical notes: ' + input.planNote : ''}`,
        occurredAt: now,
      },
    });

    return { case: updated, tasksCreated };
  });

  await recordAuditLog({
    userId: user.id,
    action: 'CASE_CONSULTATION_OUTCOME',
    entity: 'case',
    entityId: caseId,
    before: {
      stage: patientCase.stage,
      careType: patientCase.careType,
      advisedAdmission: patientCase.advisedAdmission,
    },
    after: {
      stage: result.case.stage,
      careType: result.case.careType,
      advisedAdmission: result.case.advisedAdmission,
      ownerId: result.case.ownerId,
    },
    ip,
    userAgent,
  });

  return result.case;
}

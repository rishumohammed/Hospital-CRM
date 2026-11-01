import { prisma } from '../../database/client';
import { UserContext, scopeWhere } from '../rbac/scope';
import { maskPhoneNumber, Permissions, CareTypes, CaseStages } from '@hospital-crm/shared';
import { recordAuditLog } from '../audit/audit.service';
import { applyCadence, cancelOpenCadenceTasks } from '../cadences/cadence.service';

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

export interface AdvanceStageInput {
  stage: string;
  estimatedAmount?: number | null;
  estimateSharedAt?: string | null;
  depositReceived?: boolean;
  depositAmount?: number | null;
  expectedAdmissionDate?: string | null;
  admissionDate?: string | null;
  emergencyAdmission?: boolean;
  emergencyReason?: string | null;
  notStartedReasonId?: number | null;
  closureCodeId?: number | null;
  note?: string;
}

/**
 * Advances a case through its lifecycle stages:
 * - visited -> plan_given -> counseling_estimate -> plan_accepted -> in_treatment -> completed / not_started.
 * Enforces the Deposit Gate (Acceptance Test 8):
 * - Moving an in-patient case to 'in_treatment' strictly requires depositReceived = true,
 *   unless emergencyAdmission = true with a non-empty emergencyReason.
 */
export async function advanceCaseStage(
  caseId: number,
  input: AdvanceStageInput,
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

  // --- Acceptance Test 8: Deposit Gate & Emergency Exception ---
  if (input.stage === CaseStages.IN_TREATMENT) {
    const isInPatient = patientCase.careType === CareTypes.IN_PATIENT || patientCase.advisedAdmission;
    if (isInPatient) {
      const effectiveDeposit =
        input.depositReceived !== undefined ? input.depositReceived : patientCase.depositReceived;
      const isEmergency =
        input.emergencyAdmission !== undefined ? input.emergencyAdmission : patientCase.emergencyAdmission;
      const emergencyReason =
        input.emergencyReason !== undefined ? input.emergencyReason : patientCase.emergencyReason;

      if (!effectiveDeposit && (!isEmergency || !emergencyReason || !emergencyReason.trim())) {
        const err = new Error(
          'In-patient admission requires deposit received or an emergency admission override with reason'
        );
        (err as any).statusCode = 400;
        (err as any).code = 'DEPOSIT_REQUIRED';
        throw err;
      }
    }
  }

  // If moving to not_started (declined), decline reason is required
  if (input.stage === CaseStages.NOT_STARTED) {
    if (!input.notStartedReasonId && !patientCase.notStartedReasonId) {
      const err = new Error('Decline reason is required when closing case as Not Started');
      (err as any).statusCode = 400;
      (err as any).code = 'DECLINE_REASON_REQUIRED';
      throw err;
    }
  }

  const now = new Date();
  const updateData: any = {
    stage: input.stage,
    updatedAt: now,
  };

  if (input.estimatedAmount !== undefined) updateData.estimatedAmount = input.estimatedAmount;
  if (input.estimateSharedAt) updateData.estimateSharedAt = new Date(input.estimateSharedAt);
  if (input.depositReceived !== undefined) updateData.depositReceived = input.depositReceived;
  if (input.depositAmount !== undefined) updateData.depositAmount = input.depositAmount;
  if (input.expectedAdmissionDate) updateData.expectedAdmissionDate = new Date(input.expectedAdmissionDate);
  if (input.admissionDate) {
    updateData.admissionDate = new Date(input.admissionDate);
  } else if (input.stage === CaseStages.IN_TREATMENT && !patientCase.admissionDate) {
    updateData.admissionDate = now;
  }
  if (input.emergencyAdmission !== undefined) updateData.emergencyAdmission = input.emergencyAdmission;
  if (input.emergencyReason !== undefined) updateData.emergencyReason = input.emergencyReason;
  if (input.notStartedReasonId !== undefined) updateData.notStartedReasonId = input.notStartedReasonId;
  if (input.closureCodeId !== undefined) updateData.closureCodeId = input.closureCodeId;

  const result = await prisma.$transaction(async (tx: any) => {
    const updated = await tx.case.update({
      where: { id: caseId },
      data: updateData,
      include: {
        patient: true,
        department: true,
        branch: true,
        owner: { select: { id: true, name: true, email: true } },
        treatingDoctor: { select: { id: true, name: true, email: true } },
        notStartedReason: true,
        closureCode: true,
      },
    });

    // If admitted (in_treatment) or closed (not_started/completed), cancel open cadence tasks
    if (
      input.stage === CaseStages.IN_TREATMENT ||
      input.stage === CaseStages.NOT_STARTED ||
      input.stage === CaseStages.COMPLETED
    ) {
      await cancelOpenCadenceTasks(tx, 'case', caseId);
    }

    // Record stage transition interaction
    await tx.interaction.create({
      data: {
        type: 'status_change',
        direction: 'inbound',
        userId: user.id,
        caseId,
        note: `Stage advanced from ${patientCase.stage.toUpperCase()} to ${input.stage.toUpperCase()}${input.note ? '. Note: ' + input.note : ''}${input.emergencyAdmission ? ' [EMERGENCY OVERRIDE: ' + input.emergencyReason + ']' : ''}`,
        occurredAt: now,
      },
    });

    return updated;
  });

  await recordAuditLog({
    userId: user.id,
    action: 'CASE_STAGE_ADVANCED',
    entity: 'case',
    entityId: caseId,
    before: { stage: patientCase.stage, depositReceived: patientCase.depositReceived },
    after: { stage: result.stage, depositReceived: result.depositReceived },
    ip,
    userAgent,
  });

  return result;
}

/**
 * Assigns a case via round-robin to an active aftercare executive in the branch.
 */
export async function assignAftercareRoundRobin(branchId: number): Promise<number | null> {
  const executives = await prisma.user.findMany({
    where: {
      status: 'active',
      available: true,
      role: { code: 'aftercare_executive' },
      userBranches: { some: { branchId } },
      userTeams: { some: { team: { code: 'aftercare' } } },
    },
    select: {
      id: true,
      _count: {
        select: {
          ownedCases: {
            where: {
              stage: 'aftercare_follow_up',
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

  if (executives.length === 0) {
    // Fallback: any active user in aftercare team or role aftercare_executive
    const fallback = await prisma.user.findFirst({
      where: {
        status: 'active',
        available: true,
        OR: [
          { role: { code: 'aftercare_executive' } },
          { userTeams: { some: { team: { code: 'aftercare' } } } },
        ],
      },
      select: { id: true },
    });
    return fallback ? fallback.id : null;
  }

  executives.sort((a, b) => {
    const countDiff = a._count.ownedCases - b._count.ownedCases;
    if (countDiff !== 0) return countDiff;

    const aTime = a.ownedCases[0]?.createdAt.getTime() || 0;
    const bTime = b.ownedCases[0]?.createdAt.getTime() || 0;
    return aTime - bTime;
  });

  return executives[0].id;
}

/**
 * Marks treatment completed for a case, transitions to aftercare_follow_up,
 * and schedules the appropriate aftercare cadence (in-patient vs OPD/procedure).
 * Acceptance Test 9: Day 2, 7, 30, 90 post-discharge for in-patients.
 */
export async function markTreatmentCompleted(
  user: UserContext,
  caseId: number,
  input: {
    treatmentCompletedAt: string | Date;
    dischargeDate?: string | Date | null;
    note?: string;
  },
  ip?: string,
  userAgent?: string
) {
  const patientCase = await prisma.case.findFirst({
    where: {
      id: caseId,
      archivedAt: null,
    },
    include: {
      patient: true,
      branch: true,
    },
  });

  if (!patientCase) {
    const err = new Error('Case not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  // Acceptance Test 9 validation: In-patient requires dischargeDate
  const isInPatient = patientCase.careType === CareTypes.IN_PATIENT || patientCase.advisedAdmission;
  if (isInPatient && !input.dischargeDate) {
    const err = new Error('Discharge date is required for in-patient treatment completion');
    (err as any).statusCode = 400;
    (err as any).code = 'DISCHARGE_DATE_REQUIRED';
    throw err;
  }

  const treatmentCompletedDate = new Date(input.treatmentCompletedAt);
  const dischargeDate = input.dischargeDate ? new Date(input.dischargeDate) : null;
  const now = new Date();

  // Round-robin assign to aftercare team member
  const newOwnerId = (await assignAftercareRoundRobin(patientCase.branchId)) || patientCase.ownerId;

  const result = await prisma.$transaction(async (tx: any) => {
    const updated = await tx.case.update({
      where: { id: caseId },
      data: {
        stage: CaseStages.AFTERCARE_FOLLOW_UP,
        treatmentCompletedAt: treatmentCompletedDate,
        dischargeDate: dischargeDate,
        team: 'aftercare',
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

    // Acceptance Test 9: Create aftercare cadence tasks
    // For in-patient: case.aftercare_inpatient (days 2, 7, 30, 90 post-discharge)
    // For OPD/procedure: case.aftercare_opd (days 7, 30, 90 post-treatment)
    const cadenceKey = isInPatient ? 'case.aftercare_inpatient' : 'case.aftercare_opd';
    const baseDate = isInPatient ? dischargeDate! : treatmentCompletedDate;

    await applyCadence(tx, 'case', caseId, cadenceKey, baseDate, {
      ownerId: newOwnerId || undefined,
      priority: 'warm',
    });

    // Record status change interaction
    await tx.interaction.create({
      data: {
        type: 'status_change',
        direction: 'inbound',
        userId: user.id,
        caseId,
        note: `Treatment marked completed (${treatmentCompletedDate.toISOString().split('T')[0]})${dischargeDate ? ' with discharge on ' + dischargeDate.toISOString().split('T')[0] : ''}. Transitioned to Aftercare Desk.${input.note ? ' Note: ' + input.note : ''}`,
        occurredAt: now,
      },
    });

    return updated;
  });

  await recordAuditLog({
    userId: user.id,
    action: 'CASE_TREATMENT_COMPLETED',
    entity: 'case',
    entityId: caseId,
    before: { stage: patientCase.stage, treatmentCompletedAt: patientCase.treatmentCompletedAt },
    after: { stage: result.stage, treatmentCompletedAt: result.treatmentCompletedAt, dischargeDate: result.dischargeDate },
    ip,
    userAgent,
  });

  return result;
}

/**
 * Closes an active case with a closure code from picklists and cancels any open tasks.
 */
export async function closeCase(
  user: UserContext,
  caseId: number,
  input: {
    closureCodeId: number;
    note?: string;
  },
  ip?: string,
  userAgent?: string
) {
  const patientCase = await prisma.case.findFirst({
    where: {
      id: caseId,
      archivedAt: null,
    },
    include: {
      closureCode: true,
    },
  });

  if (!patientCase) {
    const err = new Error('Case not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  // Validate closure code exists
  const closureCode = await prisma.closureCode.findUnique({
    where: { id: input.closureCodeId },
  });
  if (!closureCode) {
    const err = new Error('Invalid closure code');
    (err as any).statusCode = 400;
    (err as any).code = 'INVALID_CLOSURE_CODE';
    throw err;
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx: any) => {
    const updated = await tx.case.update({
      where: { id: caseId },
      data: {
        stage: CaseStages.COMPLETED,
        closureCodeId: input.closureCodeId,
        updatedAt: now,
      },
      include: {
        patient: true,
        department: true,
        branch: true,
        closureCode: true,
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    // Cancel all open cadence tasks on the case
    await cancelOpenCadenceTasks(tx, 'case', caseId);

    // Record status change interaction
    await tx.interaction.create({
      data: {
        type: 'status_change',
        direction: 'inbound',
        userId: user.id,
        caseId,
        note: `Case closed with outcome: ${closureCode.labelEn} (${closureCode.code}).${input.note ? ' Note: ' + input.note : ''}`,
        occurredAt: now,
      },
    });

    return updated;
  });

  await recordAuditLog({
    userId: user.id,
    action: 'CASE_CLOSED',
    entity: 'case',
    entityId: caseId,
    before: { stage: patientCase.stage, closureCodeId: patientCase.closureCodeId },
    after: { stage: result.stage, closureCodeId: result.closureCodeId },
    ip,
    userAgent,
  });

  return result;
}

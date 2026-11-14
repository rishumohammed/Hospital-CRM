import { prisma } from '../../database/client';
import { UserContext } from '../rbac/scope';
import { normalizePhoneNumber, maskPhoneNumber } from '@hospital-crm/shared';

export interface ListPatientsParams {
  search?: string;
  branchId?: number;
  careStatus?: 'active' | 'completed' | 'all';
  page?: number;
  pageSize?: number;
}

export async function listPatients(params: ListPatientsParams, user: UserContext) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: any = {
    archivedAt: null,
  };

  // Branch filtering / scope
  if (params.branchId) {
    where.branchId = params.branchId;
  } else if (user.roleCode !== 'owner' && user.roleCode !== 'admin' && user.roleCode !== 'auditor') {
    if (user.branchIds && user.branchIds.length > 0) {
      where.branchId = { in: user.branchIds };
    }
  }

  // Doctor scope and care status filtering
  const caseWhere: any = { archivedAt: null };
  if (user.roleCode === 'doctor') {
    caseWhere.treatingDoctorId = user.id;
  }

  // Search by Name, Patient Code, or Mobile
  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    const normPhone = normalizePhoneNumber(term);
    where.OR = [
      { name: { contains: term } },
      { patientCode: { contains: term } },
      { mobileNorm: { contains: term } },
    ];
    if (normPhone) {
      where.OR.push({ mobileNorm: { contains: normPhone } });
    }
  }

  // Care status filter combined with doctor scope
  if (params.careStatus === 'active') {
    where.cases = {
      some: {
        ...caseWhere,
        stage: { not: 'completed' },
      },
    };
  } else if (params.careStatus === 'completed') {
    where.cases = {
      some: caseWhere,
      every: {
        stage: 'completed',
        archivedAt: null,
      },
    };
  } else if (user.roleCode === 'doctor') {
    where.cases = { some: caseWhere };
  }

  const [total, patients] = await Promise.all([
    prisma.patient.count({ where }),
    prisma.patient.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        cases: {
          where: { archivedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            department: { select: { id: true, code: true, labelEn: true } },
            treatingDoctor: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: {
            cases: { where: { archivedAt: null } },
            leads: { where: { archivedAt: null } },
          },
        },
      },
    }),
  ]);

  const sanitizedPatients = patients.map((p: any) => {
    const activeCase = p.cases.find((c: any) => c.stage !== 'completed') || null;
    const latestCase = p.cases[0] || null;

    return {
      id: p.id,
      patientCode: p.patientCode,
      name: p.name,
      mobile: user.maskPhone ? maskPhoneNumber(p.mobileNorm) : p.mobileNorm,
      mobileNorm: p.mobileNorm,
      language: p.language,
      dateOfBirth: p.dateOfBirth,
      createdAt: p.createdAt,
      branch: p.branch,
      totalCasesCount: p._count.cases,
      activeCase: activeCase
        ? {
            id: activeCase.id,
            stage: activeCase.stage,
            careType: activeCase.careType,
            department: activeCase.department?.labelEn || 'General',
            doctor: activeCase.treatingDoctor?.name || 'Unassigned',
          }
        : null,
      latestCase: latestCase
        ? {
            id: latestCase.id,
            stage: latestCase.stage,
            careType: latestCase.careType,
            department: latestCase.department?.labelEn || 'General',
            doctor: latestCase.treatingDoctor?.name || 'Unassigned',
            visitedAt: latestCase.consultationCompletedAt || latestCase.createdAt,
          }
        : null,
    };
  });

  return {
    patients: sanitizedPatients,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}

export async function getPatientDossier(patientId: number, user: UserContext) {
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      archivedAt: null,
    },
    include: {
      branch: { select: { id: true, code: true, name: true } },
      cases: {
        where: { archivedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          department: { select: { id: true, code: true, labelEn: true, labelMl: true } },
          treatingDoctor: { select: { id: true, name: true, email: true } },
          owner: { select: { id: true, name: true, email: true } },
          closureCode: true,
          interactions: {
            where: { archivedAt: null },
            orderBy: { occurredAt: 'desc' },
            take: 20,
            include: {
              user: { select: { id: true, name: true } },
            },
          },
          tasks: {
            where: { archivedAt: null },
            orderBy: { dueAt: 'desc' },
            take: 10,
          },
        },
      },
      leads: {
        where: { archivedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          source: { select: { id: true, code: true, labelEn: true } },
          department: { select: { id: true, code: true, labelEn: true } },
          campaign: { select: { id: true, name: true, channel: true } },
        },
      },
    },
  });

  if (!patient) {
    const error: any = new Error('Patient not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  // Branch access check
  if (user.roleCode !== 'owner' && user.roleCode !== 'admin' && user.roleCode !== 'auditor') {
    if (user.branchIds && user.branchIds.length > 0 && !user.branchIds.includes(patient.branchId)) {
      const error: any = new Error('Access denied to this branch patient');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }
  }

  // Household & Family Members (Other registered patients sharing this normalized mobile number)
  const familyMembers =
    patient.mobileNorm && patient.mobileNorm.length >= 7
      ? await prisma.patient.findMany({
          where: {
            mobileNorm: patient.mobileNorm,
            id: { not: patient.id },
            archivedAt: null,
          },
          select: {
            id: true,
            patientCode: true,
            name: true,
            dateOfBirth: true,
            language: true,
            createdAt: true,
          },
        })
      : [];

  const p: any = patient;

  // Calculate Lifetime Summary Metrics
  const totalCases = (p.cases || []).length;
  const completedCases = (p.cases || []).filter((c: any) => c.stage === 'completed').length;
  const activeCases = (p.cases || []).filter((c: any) => c.stage !== 'completed');
  const inpatientAdmissions = (p.cases || []).filter(
    (c: any) => c.careType === 'in_patient' || c.advisedAdmission
  ).length;

  return {
    patient: {
      id: p.id,
      patientCode: p.patientCode,
      name: p.name,
      mobile: user.maskPhone ? maskPhoneNumber(p.mobileNorm) : p.mobileNorm,
      mobileNorm: p.mobileNorm,
      language: p.language,
      dateOfBirth: p.dateOfBirth,
      createdAt: p.createdAt,
      branch: p.branch,
    },
    familyMembers,
    metrics: {
      totalCases,
      completedCases,
      activeCasesCount: activeCases.length,
      inpatientAdmissions,
      firstVisitDate: p.cases?.[p.cases.length - 1]?.createdAt || p.createdAt,
      lastVisitDate: p.cases?.[0]?.createdAt || p.createdAt,
    },
    cases: p.cases || [],
    inquiryHistory: p.leads || [],
  };
}

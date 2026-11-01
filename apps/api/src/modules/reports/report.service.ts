import { prisma } from '../../database/client';
import { UserContext, scopeWhere } from '../rbac/scope';
import { Permissions, CaseStages } from '@hospital-crm/shared';

export interface AdmissionReportParams {
  branchId?: number;
  startDate?: string;
  endDate?: string;
}

export async function getAdmissionReport(
  params: AdmissionReportParams,
  user: UserContext
): Promise<any> {
  const where: any = {
    archivedAt: null,
    advisedAdmission: true,
    ...scopeWhere(user, 'case', Permissions.REPORT_VIEW),
  };

  if (params.branchId) {
    where.branchId = params.branchId;
  }

  if (params.startDate || params.endDate) {
    where.consultationCompletedAt = {};
    if (params.startDate) where.consultationCompletedAt.gte = new Date(params.startDate);
    if (params.endDate) where.consultationCompletedAt.lte = new Date(params.endDate);
  }

  const cases = await prisma.case.findMany({
    where,
    include: {
      patient: { select: { id: true, name: true, patientCode: true, mobileNorm: true } },
      treatingDoctor: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
      notStartedReason: true,
      interactions: {
        where: { archivedAt: null },
        orderBy: { occurredAt: 'asc' },
        take: 1,
      },
    },
  });

  const advised = cases.length;
  let contactedWithin24hCount = 0;
  let counselingBookedCount = 0;
  let acceptedCount = 0;
  let admittedCount = 0;
  let declinedCount = 0;
  const overdueFollowUps: any[] = [];

  const declinedReasonCounts: Record<string, { labelEn: string; count: number }> = {};
  const now = new Date();

  for (const c of cases) {
    // Stage counts
    if (
      c.stage === CaseStages.COUNSELING_ESTIMATE ||
      c.stage === CaseStages.PLAN_ACCEPTED ||
      c.stage === CaseStages.IN_TREATMENT ||
      c.stage === CaseStages.AFTERCARE_FOLLOW_UP ||
      c.stage === CaseStages.COMPLETED
    ) {
      counselingBookedCount++;
    }

    if (
      c.stage === CaseStages.PLAN_ACCEPTED ||
      c.stage === CaseStages.IN_TREATMENT ||
      c.stage === CaseStages.AFTERCARE_FOLLOW_UP ||
      c.stage === CaseStages.COMPLETED
    ) {
      acceptedCount++;
    }

    if (
      c.stage === CaseStages.IN_TREATMENT ||
      c.stage === CaseStages.AFTERCARE_FOLLOW_UP ||
      c.stage === CaseStages.COMPLETED
    ) {
      admittedCount++;
    }

    if (c.stage === CaseStages.NOT_STARTED) {
      declinedCount++;
      const reasonLabel = c.notStartedReason?.labelEn || 'Other';
      if (!declinedReasonCounts[reasonLabel]) {
        declinedReasonCounts[reasonLabel] = { labelEn: reasonLabel, count: 0 };
      }
      declinedReasonCounts[reasonLabel].count++;
    }

    // Contacted within 24h of consultation completion
    if (c.consultationCompletedAt && c.interactions.length > 0) {
      const firstInteractionTime = c.interactions[0].occurredAt.getTime();
      const consultTime = c.consultationCompletedAt.getTime();
      const diffHours = (firstInteractionTime - consultTime) / (1000 * 60 * 60);
      if (diffHours <= 24) {
        contactedWithin24hCount++;
      }
    }

    // Overdue follow-up check: in plan_given, consultation > 24 hours ago, no interaction
    if (c.stage === CaseStages.PLAN_GIVEN && c.consultationCompletedAt) {
      const elapsedHours = (now.getTime() - c.consultationCompletedAt.getTime()) / (1000 * 60 * 60);
      if (elapsedHours > 24 && c.interactions.length === 0) {
        overdueFollowUps.push({
          id: c.id,
          patientName: c.patient?.name,
          patientCode: c.patient?.patientCode,
          ownerName: c.owner?.name,
          consultationCompletedAt: c.consultationCompletedAt,
          hoursOverdue: Math.round(elapsedHours - 24),
        });
      }
    }
  }

  const contactRate = advised > 0 ? Math.round((contactedWithin24hCount / advised) * 100) : 0;
  const conversionRate = advised > 0 ? Math.round((admittedCount / advised) * 100) : 0;

  return {
    advised,
    contactedWithin24h: contactedWithin24hCount,
    contactRate,
    counselingBooked: counselingBookedCount,
    accepted: acceptedCount,
    admitted: admittedCount,
    conversionRate,
    declined: declinedCount,
    declinedReasons: Object.values(declinedReasonCounts),
    overdueFollowUps,
  };
}

export interface AftercareReportParams {
  branchId?: number;
  startDate?: string;
  endDate?: string;
}

export async function getAftercareReport(
  params: AftercareReportParams,
  user: UserContext
): Promise<any> {
  const caseWhere: any = {
    archivedAt: null,
    OR: [
      { treatmentCompletedAt: { not: null } },
      { stage: { in: [CaseStages.AFTERCARE_FOLLOW_UP, CaseStages.COMPLETED] } },
    ],
    ...scopeWhere(user, 'case', Permissions.REPORT_VIEW),
  };

  if (params.branchId) {
    caseWhere.branchId = params.branchId;
  }

  if (params.startDate || params.endDate) {
    caseWhere.treatmentCompletedAt = {};
    if (params.startDate) caseWhere.treatmentCompletedAt.gte = new Date(params.startDate);
    if (params.endDate) caseWhere.treatmentCompletedAt.lte = new Date(params.endDate);
  }

  // 1. Fetch relevant cases
  const cases = await prisma.case.findMany({
    where: caseWhere,
    include: {
      patient: true,
      closureCode: true,
      tasks: {
        where: {
          archivedAt: null,
          cadenceKey: { in: ['case.aftercare_inpatient', 'case.aftercare_opd'] },
        },
      },
      escalations: true,
      interactions: {
        where: { type: 'aftercare_call', archivedAt: null },
      },
    },
  });

  const totalCases = cases.length;
  let activeCases = 0;
  let completedCases = 0;
  let totalCallsDue = 0;
  let totalCallsCompleted = 0;
  let totalCallsOnTime = 0;

  let totalFeedbackScore = 0;
  let feedbackCount = 0;
  let lowFeedbackCount = 0;

  const conditionCounts = { better: 0, same: 0, worse: 0 };
  let adherenceYesCount = 0;
  let totalAdherenceCalls = 0;

  let totalEscalations = 0;
  let pendingEscalations = 0;
  let decidedEscalations = 0;
  let totalDecisionHours = 0;

  const closureCounts: Record<string, { labelEn: string; count: number }> = {};

  for (const c of cases) {
    if (c.stage === CaseStages.AFTERCARE_FOLLOW_UP) activeCases++;
    if (c.stage === CaseStages.COMPLETED) {
      completedCases++;
      if (c.closureCode) {
        const key = c.closureCode.labelEn;
        if (!closureCounts[key]) closureCounts[key] = { labelEn: key, count: 0 };
        closureCounts[key].count++;
      }
    }

    // Tasks metrics
    for (const t of c.tasks) {
      totalCallsDue++;
      if (t.status === 'done') {
        totalCallsCompleted++;
        if (t.completedAt && t.completedAt <= t.dueAt) {
          totalCallsOnTime++;
        }
      }
    }

    // Escalations metrics
    for (const e of c.escalations) {
      totalEscalations++;
      if (e.status === 'pending') pendingEscalations++;
      if (e.status === 'decided' && e.decidedAt) {
        decidedEscalations++;
        const hours = (e.decidedAt.getTime() - e.createdAt.getTime()) / (1000 * 60 * 60);
        totalDecisionHours += hours;
      }
    }

    // Questionnaire details metrics
    for (const inter of c.interactions) {
      const details = inter.details as any;
      if (details) {
        if (details.generalCondition && conditionCounts[details.generalCondition as keyof typeof conditionCounts] !== undefined) {
          conditionCounts[details.generalCondition as keyof typeof conditionCounts]++;
        }
        if (details.medicinesTaken) {
          totalAdherenceCalls++;
          if (details.medicinesTaken === 'yes') adherenceYesCount++;
        }
        if (details.feedbackScore !== undefined && details.feedbackScore !== null) {
          totalFeedbackScore += details.feedbackScore;
          feedbackCount++;
          if (details.feedbackScore <= 6) lowFeedbackCount++;
        }
      }
    }
  }

  const onTimeRate = totalCallsCompleted > 0 ? Math.round((totalCallsOnTime / totalCallsCompleted) * 100) : 0;
  const feedbackAverage = feedbackCount > 0 ? Number((totalFeedbackScore / feedbackCount).toFixed(1)) : null;
  const adherenceRate = totalAdherenceCalls > 0 ? Math.round((adherenceYesCount / totalAdherenceCalls) * 100) : null;
  const avgDecisionHours = decidedEscalations > 0 ? Number((totalDecisionHours / decidedEscalations).toFixed(1)) : null;

  return {
    totalCases,
    activeCases,
    completedCases,
    calls: {
      due: totalCallsDue,
      completed: totalCallsCompleted,
      onTime: totalCallsOnTime,
      onTimeRate,
    },
    feedback: {
      average: feedbackAverage,
      count: feedbackCount,
      lowCount: lowFeedbackCount,
    },
    clinical: {
      adherenceRate,
      conditionBreakdown: conditionCounts,
    },
    escalations: {
      total: totalEscalations,
      pending: pendingEscalations,
      decided: decidedEscalations,
      avgDecisionHours,
    },
    closures: Object.values(closureCounts),
  };
}

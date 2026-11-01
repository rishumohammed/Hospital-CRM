import { prisma } from '../../database/client';
import { UserContext, scopeWhere } from '../rbac/scope';
import { Permissions, CaseStages, LeadStatuses } from '@hospital-crm/shared';

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

export interface ReportFilterParams {
  branchId?: number;
  startDate?: string;
  endDate?: string;
}

export async function getSupportReport(
  params: ReportFilterParams,
  user: UserContext
): Promise<any> {
  const where: any = {
    archivedAt: null,
    ...scopeWhere(user, 'lead', Permissions.REPORT_VIEW),
  };

  if (params.branchId) {
    where.branchId = params.branchId;
  }

  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) where.createdAt.gte = new Date(params.startDate);
    if (params.endDate) where.createdAt.lte = new Date(params.endDate);
  }

  const leads = await prisma.lead.findMany({
    where,
    include: {
      owner: { select: { id: true, name: true } },
      source: { select: { id: true, code: true, labelEn: true, labelMl: true } },
      department: { select: { id: true, code: true, labelEn: true, labelMl: true } },
      closedReason: { select: { id: true, labelEn: true } },
      interactions: {
        where: { archivedAt: null, type: 'call' },
        select: { id: true, occurredAt: true },
      },
      appointments: {
        select: { id: true, status: true },
      },
      cases: {
        select: { id: true, stage: true, estimatedAmount: true },
      },
    },
  });

  const totalLeads = leads.length;
  let newLeads = 0;
  let inProgressLeads = 0;
  let appointmentBookedLeads = 0;
  let visitedLeads = 0;
  let convertedLeads = 0;
  let lostLeads = 0;
  let emergencyRedirects = 0;

  let totalResponseMinutes = 0;
  let respondedLeadsCount = 0;
  let slaMetCount = 0;

  const statusMap: Record<string, number> = {};
  const sourceMap: Record<string, { labelEn: string; total: number; booked: number; converted: number }> = {};
  const telecallerMap: Record<number, { id: number; name: string; assigned: number; calls: number; booked: number; converted: number }> = {};

  for (const l of leads) {
    statusMap[l.status] = (statusMap[l.status] || 0) + 1;

    if (l.status === LeadStatuses.NEW) newLeads++;
    else if (l.status === LeadStatuses.CONTACTED || l.status === LeadStatuses.QUALIFIED) inProgressLeads++;
    else if (l.status === LeadStatuses.APPOINTMENT_BOOKED) appointmentBookedLeads++;
    else if (l.status === 'visited') visitedLeads++;
    else if (l.status === LeadStatuses.CONVERTED) {
      convertedLeads++;
      visitedLeads++;
    } else if (
      l.status === LeadStatuses.NOT_INTERESTED ||
      l.status === LeadStatuses.NOT_REACHABLE ||
      l.status === LeadStatuses.JUNK
    ) {
      lostLeads++;
    }

    if (l.emergencyFlag) {
      emergencyRedirects++;
    }

    if (l.firstResponseAt) {
      respondedLeadsCount++;
      const diffMin = (l.firstResponseAt.getTime() - l.createdAt.getTime()) / (1000 * 60);
      totalResponseMinutes += Math.max(0, diffMin);

      if (l.firstResponseDueAt && l.firstResponseAt <= l.firstResponseDueAt) {
        slaMetCount++;
      }
    }

    const srcKey = l.source?.labelEn || 'Other';
    if (!sourceMap[srcKey]) {
      sourceMap[srcKey] = { labelEn: srcKey, total: 0, booked: 0, converted: 0 };
    }
    sourceMap[srcKey].total++;
    if (l.status === LeadStatuses.APPOINTMENT_BOOKED || l.status === 'visited' || l.status === LeadStatuses.CONVERTED) {
      sourceMap[srcKey].booked++;
    }
    if (l.status === LeadStatuses.CONVERTED) {
      sourceMap[srcKey].converted++;
    }

    if (l.owner) {
      if (!telecallerMap[l.owner.id]) {
        telecallerMap[l.owner.id] = { id: l.owner.id, name: l.owner.name, assigned: 0, calls: 0, booked: 0, converted: 0 };
      }
      telecallerMap[l.owner.id].assigned++;
      telecallerMap[l.owner.id].calls += l.interactions.length;
      if (l.status === LeadStatuses.APPOINTMENT_BOOKED || l.status === 'visited' || l.status === LeadStatuses.CONVERTED) {
        telecallerMap[l.owner.id].booked++;
      }
      if (l.status === LeadStatuses.CONVERTED) {
        telecallerMap[l.owner.id].converted++;
      }
    }
  }

  const slaComplianceRate = respondedLeadsCount > 0 ? Math.round((slaMetCount / respondedLeadsCount) * 100) : 100;
  const avgResponseMinutes = respondedLeadsCount > 0 ? Math.round(totalResponseMinutes / respondedLeadsCount) : null;
  const bookingRate = totalLeads > 0 ? Math.round(((appointmentBookedLeads + visitedLeads) / totalLeads) * 100) : 0;
  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  return {
    totalLeads,
    newLeads,
    inProgressLeads,
    appointmentBookedLeads,
    visitedLeads,
    convertedLeads,
    lostLeads,
    emergencyRedirects,
    bookingRate,
    conversionRate,
    sla: {
      complianceRate: slaComplianceRate,
      avgResponseMinutes,
      respondedCount: respondedLeadsCount,
      metCount: slaMetCount,
    },
    statusBreakdown: Object.entries(statusMap).map(([status, count]) => ({
      status,
      count,
      percentage: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0,
    })),
    sourceBreakdown: Object.values(sourceMap),
    telecallerProductivity: Object.values(telecallerMap),
  };
}

export async function getLostReasonsReport(
  params: ReportFilterParams,
  user: UserContext
): Promise<any> {
  const leadWhere: any = {
    archivedAt: null,
    status: { in: [LeadStatuses.NOT_INTERESTED, LeadStatuses.NOT_REACHABLE, LeadStatuses.JUNK] },
    ...scopeWhere(user, 'lead', Permissions.REPORT_VIEW),
  };

  const caseWhere: any = {
    archivedAt: null,
    stage: CaseStages.NOT_STARTED,
    ...scopeWhere(user, 'case', Permissions.REPORT_VIEW),
  };

  if (params.branchId) {
    leadWhere.branchId = params.branchId;
    caseWhere.branchId = params.branchId;
  }

  if (params.startDate || params.endDate) {
    leadWhere.createdAt = {};
    caseWhere.createdAt = {};
    if (params.startDate) {
      leadWhere.createdAt.gte = new Date(params.startDate);
      caseWhere.createdAt.gte = new Date(params.startDate);
    }
    if (params.endDate) {
      leadWhere.createdAt.lte = new Date(params.endDate);
      caseWhere.createdAt.lte = new Date(params.endDate);
    }
  }

  const [lostLeads, declinedCases] = await Promise.all([
    prisma.lead.findMany({
      where: leadWhere,
      select: {
        id: true,
        status: true,
        closedReason: { select: { id: true, code: true, labelEn: true, labelMl: true } },
        department: { select: { id: true, labelEn: true } },
        source: { select: { id: true, labelEn: true } },
      },
    }),
    prisma.case.findMany({
      where: caseWhere,
      select: {
        id: true,
        notStartedReason: { select: { id: true, code: true, labelEn: true, labelMl: true } },
        department: { select: { id: true, labelEn: true } },
      },
    }),
  ]);

  const leadReasonsMap: Record<string, { code: string; labelEn: string; labelMl: string; count: number }> = {};
  for (const l of lostLeads) {
    const reasonKey = l.closedReason?.labelEn || 'Not Specified';
    if (!leadReasonsMap[reasonKey]) {
      leadReasonsMap[reasonKey] = {
        code: l.closedReason?.code || 'unknown',
        labelEn: reasonKey,
        labelMl: l.closedReason?.labelMl || reasonKey,
        count: 0,
      };
    }
    leadReasonsMap[reasonKey].count++;
  }

  const caseReasonsMap: Record<string, { code: string; labelEn: string; labelMl: string; count: number }> = {};
  for (const c of declinedCases) {
    const reasonKey = c.notStartedReason?.labelEn || 'Not Specified';
    if (!caseReasonsMap[reasonKey]) {
      caseReasonsMap[reasonKey] = {
        code: c.notStartedReason?.code || 'unknown',
        labelEn: reasonKey,
        labelMl: c.notStartedReason?.labelMl || reasonKey,
        count: 0,
      };
    }
    caseReasonsMap[reasonKey].count++;
  }

  const totalLostLeads = lostLeads.length;
  const totalDeclinedCases = declinedCases.length;

  return {
    leadLostReasons: {
      total: totalLostLeads,
      breakdown: Object.values(leadReasonsMap).map((r) => ({
        ...r,
        percentage: totalLostLeads > 0 ? Math.round((r.count / totalLostLeads) * 100) : 0,
      })),
    },
    admissionDeclineReasons: {
      total: totalDeclinedCases,
      breakdown: Object.values(caseReasonsMap).map((r) => ({
        ...r,
        percentage: totalDeclinedCases > 0 ? Math.round((r.count / totalDeclinedCases) * 100) : 0,
      })),
    },
  };
}

export async function getSourceQualityReport(
  params: ReportFilterParams,
  user: UserContext
): Promise<any> {
  const where: any = {
    archivedAt: null,
    ...scopeWhere(user, 'lead', Permissions.REPORT_VIEW),
  };

  if (params.branchId) {
    where.branchId = params.branchId;
  }

  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) where.createdAt.gte = new Date(params.startDate);
    if (params.endDate) where.createdAt.lte = new Date(params.endDate);
  }

  const leads = await prisma.lead.findMany({
    where,
    include: {
      source: { select: { id: true, code: true, labelEn: true, labelMl: true } },
      cases: {
        select: {
          id: true,
          stage: true,
          estimatedAmount: true,
          depositReceived: true,
          depositAmount: true,
        },
      },
    },
  });

  const sourceStats: Record<
    string,
    {
      sourceId: number | null;
      code: string;
      labelEn: string;
      labelMl: string;
      totalLeads: number;
      contactedLeads: number;
      appointmentBooked: number;
      visited: number;
      converted: number;
      inTreatment: number;
      completed: number;
      totalEstimatedRevenue: number;
      totalDepositCollected: number;
    }
  > = {};

  for (const l of leads) {
    const srcKey = l.source?.labelEn || 'Direct / Unknown';
    if (!sourceStats[srcKey]) {
      sourceStats[srcKey] = {
        sourceId: l.source?.id || null,
        code: l.source?.code || 'direct',
        labelEn: srcKey,
        labelMl: l.source?.labelMl || srcKey,
        totalLeads: 0,
        contactedLeads: 0,
        appointmentBooked: 0,
        visited: 0,
        converted: 0,
        inTreatment: 0,
        completed: 0,
        totalEstimatedRevenue: 0,
        totalDepositCollected: 0,
      };
    }

    const stat = sourceStats[srcKey];
    stat.totalLeads++;

    if (l.status !== LeadStatuses.NEW) {
      stat.contactedLeads++;
    }

    if (l.status === LeadStatuses.APPOINTMENT_BOOKED || l.status === 'visited' || l.status === LeadStatuses.CONVERTED) {
      stat.appointmentBooked++;
    }

    if (l.status === 'visited' || l.status === LeadStatuses.CONVERTED) {
      stat.visited++;
    }

    const convertedCase = l.cases?.[0];
    if (l.status === LeadStatuses.CONVERTED && convertedCase) {
      stat.converted++;

      if (
        convertedCase.stage === CaseStages.IN_TREATMENT ||
        convertedCase.stage === CaseStages.AFTERCARE_FOLLOW_UP ||
        convertedCase.stage === CaseStages.COMPLETED
      ) {
        stat.inTreatment++;
      }

      if (convertedCase.stage === CaseStages.COMPLETED) {
        stat.completed++;
      }

      if (convertedCase.estimatedAmount) {
        stat.totalEstimatedRevenue += Number(convertedCase.estimatedAmount);
      }

      if (convertedCase.depositAmount) {
        stat.totalDepositCollected += Number(convertedCase.depositAmount);
      }
    }
  }

  const results = Object.values(sourceStats).map((s) => ({
    ...s,
    contactRate: s.totalLeads > 0 ? Math.round((s.contactedLeads / s.totalLeads) * 100) : 0,
    bookingRate: s.totalLeads > 0 ? Math.round((s.appointmentBooked / s.totalLeads) * 100) : 0,
    visitRate: s.totalLeads > 0 ? Math.round((s.visited / s.totalLeads) * 100) : 0,
    conversionRate: s.totalLeads > 0 ? Math.round((s.converted / s.totalLeads) * 100) : 0,
    treatmentRate: s.totalLeads > 0 ? Math.round((s.inTreatment / s.totalLeads) * 100) : 0,
  }));

  results.sort((a, b) => b.totalLeads - a.totalLeads);

  return {
    sources: results,
    totalLeads: leads.length,
    overallRevenue: results.reduce((sum, s) => sum + s.totalEstimatedRevenue, 0),
    overallDeposits: results.reduce((sum, s) => sum + s.totalDepositCollected, 0),
  };
}

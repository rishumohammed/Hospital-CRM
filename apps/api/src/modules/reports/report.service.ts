import { prisma } from '../../database/client';
import { UserContext, scopeWhere, getEffectiveScope } from '../rbac/scope';
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

  const stageCounts = {
    plan_given: cases.filter((c) => c.stage === CaseStages.PLAN_GIVEN).length,
    counseling_estimate: cases.filter((c) => c.stage === CaseStages.COUNSELING_ESTIMATE).length,
    plan_accepted: cases.filter((c) => c.stage === CaseStages.PLAN_ACCEPTED).length,
    in_treatment: cases.filter((c) => c.stage === CaseStages.IN_TREATMENT).length,
    not_started: cases.filter((c) => c.stage === CaseStages.NOT_STARTED).length,
  };

  const caseIds = cases.map((c) => c.id);
  const admissionFollowUps = await prisma.task.findMany({
    where: {
      status: 'open',
      caseId: { in: caseIds },
    },
    include: {
      case: {
        select: {
          id: true,
          patient: { select: { id: true, name: true, mobileNorm: true } },
        },
      },
      owner: { select: { id: true, name: true } },
    },
    orderBy: { dueAt: 'asc' },
    take: 10,
  });

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
    stageCounts,
    admissionFollowUps,
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

  // 14-day Daily Trend
  const dailyMap: Record<string, { date: string; label: string; leads: number; converted: number; booked: number }> = {};
  const nowDay = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(nowDay.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split('T')[0];
    const label = `${monthNames[d.getMonth()]} ${d.getDate()}`;
    dailyMap[key] = { date: key, label, leads: 0, converted: 0, booked: 0 };
  }

  for (const l of leads) {
    const leadDateKey = l.createdAt.toISOString().split('T')[0];
    if (dailyMap[leadDateKey]) {
      dailyMap[leadDateKey].leads++;
      if (l.status === LeadStatuses.CONVERTED) {
        dailyMap[leadDateKey].converted++;
      }
      if (
        l.status === LeadStatuses.APPOINTMENT_BOOKED ||
        l.status === 'visited' ||
        l.status === LeadStatuses.CONVERTED
      ) {
        dailyMap[leadDateKey].booked++;
      }
    }
  }

  const dailyTrend = Object.values(dailyMap);

  // Conversion Funnel
  const inBookedOrDone = Math.min(totalLeads, appointmentBookedLeads + visitedLeads);
  const inPipeline = Math.min(totalLeads, inProgressLeads + inBookedOrDone);

  const conversionFunnel = [
    {
      stage: 'Total Inquiries',
      count: totalLeads,
      percentage: totalLeads > 0 ? 100 : 0,
      color: 'teal',
    },
    {
      stage: 'Contacted / Qualified',
      count: inPipeline,
      percentage: totalLeads > 0 ? Math.min(100, Math.round((inPipeline / totalLeads) * 100)) : 0,
      color: 'blue',
    },
    {
      stage: 'Consultation Booked',
      count: inBookedOrDone,
      percentage: totalLeads > 0 ? Math.min(100, Math.round((inBookedOrDone / totalLeads) * 100)) : 0,
      color: 'amber',
    },
    {
      stage: 'Converted Patient',
      count: convertedLeads,
      percentage: totalLeads > 0 ? Math.min(100, Math.round((convertedLeads / totalLeads) * 100)) : 0,
      color: 'emerald',
    },
  ];

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
    dailyTrend,
    conversionFunnel,
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

/**
 * Treatment Follow-up Manager Dashboard Report
 */
export async function getTreatmentFollowupReport(
  params: { branchId?: number; doctorId?: number; therapyId?: number; from?: string; to?: string },
  user: UserContext
) {
  const caseWhere: any = {
    archivedAt: null,
    team: 'treatment_followup',
    ...scopeWhere(user, 'case', Permissions.FOLLOWUP_REPORT),
  };

  if (params.branchId) caseWhere.branchId = params.branchId;
  if (params.doctorId) caseWhere.treatingDoctorId = params.doctorId;

  const cases = await prisma.case.findMany({
    where: caseWhere,
    include: {
      patient: true,
      branch: true,
      treatingDoctor: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
      schedules: {
        where: params.therapyId ? { therapyId: params.therapyId } : {},
        include: {
          therapy: true,
          visits: {
            include: { missedReason: true },
          },
        },
      },
      treatmentCheckins: true,
      escalations: {
        where: { escalationType: { in: ['adherence', 'inpatient_concern'] } },
      },
    },
  });

  const todayStr = new Date().toISOString().split('T')[0];
  let activeSchedulesCount = 0;
  let todayVisitsExpected = 0;
  let todayVisitsAttended = 0;
  let totalDueVisits = 0;
  let totalAttendedVisits = 0;
  let totalMissedVisits = 0;
  let recoveredWithin24h = 0;
  const missedReasonCounts: Record<string, { label: string; count: number }> = {};
  let highRiskCount = 0;
  let mediumRiskCount = 0;
  let lowRiskCount = 0;
  let completedCourses = 0;
  let droppedOutCourses = 0;
  let checkinsTotal = 0;
  let checkinsOnTime = 0;
  let totalEscalationDecisionMinutes = 0;
  let decidedEscalationsCount = 0;

  for (const c of cases) {
    if (c.adherenceRisk === 'high') highRiskCount++;
    else if (c.adherenceRisk === 'medium') mediumRiskCount++;
    else lowRiskCount++;

    for (const s of c.schedules) {
      if (s.status === 'active') activeSchedulesCount++;
      if (s.status === 'completed') completedCourses++;
      if (s.status === 'cancelled') droppedOutCourses++;

      for (const v of s.visits) {
        const vDateStr = v.scheduledDate.toISOString().split('T')[0];
        if (vDateStr === todayStr) {
          todayVisitsExpected++;
          if (v.status === 'attended') todayVisitsAttended++;
        }

        if (v.status === 'attended' || v.status === 'missed') {
          totalDueVisits++;
          if (v.status === 'attended') {
            totalAttendedVisits++;
          } else {
            totalMissedVisits++;
            const reasonKey = v.missedReason?.code || 'other';
            const reasonLabel = v.missedReason?.labelEn || 'Other';
            if (!missedReasonCounts[reasonKey]) {
              missedReasonCounts[reasonKey] = { label: reasonLabel, count: 0 };
            }
            missedReasonCounts[reasonKey].count++;

            // Check if there is an attended visit or interaction within 24h
            const vTime = v.scheduledDate.getTime();
            const hasRecovery = s.visits.some(
              (other: any) =>
                other.status === 'attended' &&
                other.scheduledDate.getTime() > vTime &&
                other.scheduledDate.getTime() <= vTime + 24 * 60 * 60 * 1000
            );
            if (hasRecovery) recoveredWithin24h++;
          }
        }
      }
    }

    // In-patient check-ins
    for (const chk of c.treatmentCheckins) {
      checkinsTotal++;
      if (chk.nextCheckinAt && chk.occurredAt <= chk.nextCheckinAt) {
        checkinsOnTime++;
      } else {
        checkinsOnTime++;
      }
    }

    // Escalations
    for (const esc of c.escalations) {
      if (esc.decidedAt) {
        const diffMins = Math.round((esc.decidedAt.getTime() - esc.createdAt.getTime()) / (1000 * 60));
        totalEscalationDecisionMinutes += diffMins;
        decidedEscalationsCount++;
      }
    }
  }

  const attendanceRate = totalDueVisits > 0 ? Math.round((totalAttendedVisits / totalDueVisits) * 100 * 10) / 10 : 100;
  const recoveryRate = totalMissedVisits > 0 ? Math.round((recoveredWithin24h / totalMissedVisits) * 100 * 10) / 10 : 0;
  const avgDecisionTimeMinutes =
    decidedEscalationsCount > 0 ? Math.round(totalEscalationDecisionMinutes / decidedEscalationsCount) : 0;

  return {
    activeSchedulesCount,
    todayVisitsExpected,
    todayVisitsAttended,
    attendanceRate,
    totalMissedVisits,
    recoveredWithin24h,
    recoveryRate,
    riskSummary: {
      high: highRiskCount,
      medium: mediumRiskCount,
      low: lowRiskCount,
    },
    missedReasons: Object.values(missedReasonCounts),
    completedCourses,
    droppedOutCourses,
    checkinsTotal,
    checkinsOnTime,
    avgDecisionTimeMinutes,
    totalCases: cases.length,
  };
}

/**
 * Adherence Report: detailed patient risk list & cohort metrics
 */
export async function getAdherenceReport(
  params: { branchId?: number; doctorId?: number; risk?: string; from?: string; to?: string },
  user: UserContext
) {
  const where: any = {
    archivedAt: null,
    team: 'treatment_followup',
    ...scopeWhere(user, 'case', Permissions.FOLLOWUP_REPORT),
  };

  if (params.branchId) where.branchId = params.branchId;
  if (params.doctorId) where.treatingDoctorId = params.doctorId;
  if (params.risk) where.adherenceRisk = params.risk;

  const cases = await prisma.case.findMany({
    where,
    include: {
      patient: true,
      branch: true,
      treatingDoctor: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
      schedules: {
        include: { therapy: true },
      },
    },
    orderBy: [{ consecutiveMissed: 'desc' }, { attendanceRate: 'asc' }],
  });

  return {
    cases: cases.map((c) => ({
      id: c.id,
      patientName: c.patient.name,
      patientCode: c.patient.patientCode,
      mobile: c.patient.mobileNorm,
      branchName: c.branch.name,
      doctorName: c.treatingDoctor?.name || 'Unassigned',
      ownerName: c.owner?.name || 'Unassigned',
      adherenceRisk: c.adherenceRisk,
      attendanceRate: c.attendanceRate ? Number(c.attendanceRate) : 100,
      consecutiveMissed: c.consecutiveMissed,
      lastAttendedAt: c.lastAttendedAt,
      nextVisitAt: c.nextVisitAt,
      setting: c.setting,
      schedulesCount: c.schedules.length,
    })),
    totalCount: cases.length,
  };
}

/**
 * Missed Reasons Report: counts and percentages per missed reason code
 */
export async function getMissedReasonsReport(
  params: { branchId?: number; therapyId?: number; from?: string; to?: string },
  user: UserContext
) {
  const where: any = {
    status: 'missed',
  };

  if (params.branchId) {
    where.case = { branchId: params.branchId };
  } else if (user.roleCode !== 'owner' && user.roleCode !== 'admin') {
    where.case = { branchId: { in: user.branchIds } };
  }

  if (params.therapyId) {
    where.schedule = { therapyId: params.therapyId };
  }

  if (params.from || params.to) {
    where.scheduledDate = {};
    if (params.from) where.scheduledDate.gte = new Date(params.from);
    if (params.to) where.scheduledDate.lte = new Date(params.to);
  }

  const visits = await prisma.scheduledVisit.findMany({
    where,
    include: {
      missedReason: true,
      schedule: { include: { therapy: true } },
    },
  });

  const reasonMap: Record<string, { code: string; labelEn: string; labelMl: string; count: number }> = {};

  for (const v of visits) {
    const code = v.missedReason?.code || 'other';
    const labelEn = v.missedReason?.labelEn || 'Other';
    const labelMl = v.missedReason?.labelMl || 'മറ്റുള്ളവ';

    if (!reasonMap[code]) {
      reasonMap[code] = { code, labelEn, labelMl, count: 0 };
    }
    reasonMap[code].count++;
  }

  const total = visits.length;
  const reasons = Object.values(reasonMap).map((r) => ({
    ...r,
    percentage: total > 0 ? Math.round((r.count / total) * 100 * 10) / 10 : 0,
  }));

  reasons.sort((a, b) => b.count - a.count);

  return {
    reasons,
    totalMissedVisits: total,
  };
}

export interface CallLogsReportParams {
  branchId?: number;
  userId?: number;
  outcomeId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}

export async function getCallLogsReport(
  params: CallLogsReportParams,
  user: UserContext
): Promise<any> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 25));

  const leadScope = getEffectiveScope(user, Permissions.REPORT_VIEW) || getEffectiveScope(user, Permissions.LEAD_VIEW);
  let effectiveUserId = params.userId;

  if (leadScope === 'own') {
    effectiveUserId = user.id;
  }

  const where: any = {
    archivedAt: null,
    type: params.type || { in: ['call', 'aftercare_call'] },
  };

  if (effectiveUserId) {
    where.userId = effectiveUserId;
  }

  if (params.outcomeId) {
    where.outcomeId = params.outcomeId;
  }

  if (params.startDate || params.endDate) {
    where.occurredAt = {};
    if (params.startDate) where.occurredAt.gte = new Date(params.startDate);
    if (params.endDate) where.occurredAt.lte = new Date(params.endDate);
  }

  if (params.branchId) {
    where.OR = [
      { lead: { branchId: params.branchId } },
      { case: { branchId: params.branchId } },
    ];
  } else if (leadScope === 'branch' && user.branchIds?.length) {
    where.OR = [
      { lead: { branchId: { in: user.branchIds } } },
      { case: { branchId: { in: user.branchIds } } },
    ];
  }

  if (params.search?.trim()) {
    const q = params.search.trim();
    const searchConditions = [
      { lead: { name: { contains: q } } },
      { lead: { mobileNorm: { contains: q } } },
      { case: { patient: { name: { contains: q } } } },
      { case: { patient: { mobileNorm: { contains: q } } } },
      { note: { contains: q } },
    ];
    if (where.OR) {
      where.AND = [{ OR: where.OR }, { OR: searchConditions }];
      delete where.OR;
    } else {
      where.OR = searchConditions;
    }
  }

  const [total, calls] = await Promise.all([
    prisma.interaction.count({ where }),
    prisma.interaction.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, role: { select: { code: true, name: true } } } },
        lead: {
          select: {
            id: true,
            name: true,
            mobile: true,
            mobileNorm: true,
            status: true,
            priority: true,
            source: { select: { id: true, labelEn: true } },
            department: { select: { id: true, labelEn: true } },
          },
        },
        case: {
          select: {
            id: true,
            stage: true,
            careType: true,
            patient: {
              select: {
                id: true,
                name: true,
                patientCode: true,
                mobileNorm: true,
              },
            },
          },
        },
        outcome: {
          select: {
            id: true,
            code: true,
            labelEn: true,
            labelMl: true,
            scope: true,
          },
        },
      },
      orderBy: { occurredAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const allFilteredCalls = await prisma.interaction.findMany({
    where,
    select: {
      id: true,
      durationSeconds: true,
      outcomeId: true,
      leadId: true,
      caseId: true,
      outcome: { select: { code: true, labelEn: true } },
    },
  });

  const totalCallsCount = allFilteredCalls.length;
  let totalDurationSec = 0;
  let bookedCount = 0;
  let callbackCount = 0;
  const outcomeCounts: Record<string, { labelEn: string; count: number }> = {};
  const uniqueContactSet = new Set<string>();

  for (const c of allFilteredCalls) {
    if (c.durationSeconds) totalDurationSec += c.durationSeconds;
    if (c.leadId) uniqueContactSet.add(`lead_${c.leadId}`);
    if (c.caseId) uniqueContactSet.add(`case_${c.caseId}`);

    const code = c.outcome?.code || 'UNKNOWN';
    const label = c.outcome?.labelEn || 'Not Specified';
    if (!outcomeCounts[code]) {
      outcomeCounts[code] = { labelEn: label, count: 0 };
    }
    outcomeCounts[code].count++;

    if (code === 'APPOINTMENT_BOOKED' || code === 'ORDER_CONFIRMED') bookedCount++;
    if (code === 'CALLBACK_REQUESTED') callbackCount++;
  }

  const avgDurationSeconds = totalCallsCount > 0 ? Math.round(totalDurationSec / totalCallsCount) : 0;

  return {
    calls,
    summary: {
      totalCalls: totalCallsCount,
      uniqueContacts: uniqueContactSet.size,
      totalDurationSeconds: totalDurationSec,
      avgDurationSeconds,
      bookedCount,
      callbackCount,
      outcomes: Object.values(outcomeCounts),
    },
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}

// -------------------------------------------------------------
// TELECALLER & TEAM PERFORMANCE REPORTING
// -------------------------------------------------------------

export interface TelecallerPerformanceParams {
  userId?: number;
  branchId?: number;
  date?: string; // YYYY-MM-DD
  startDate?: string;
  endDate?: string;
}

export async function getTelecallerPerformance(
  params: TelecallerPerformanceParams,
  user: UserContext
) {
  const isManagerOrAdmin = ['admin', 'owner', 'center_head', 'telecaller_manager', 'super_admin'].includes(user.roleCode);
  const targetUserId = isManagerOrAdmin && params.userId ? params.userId : user.id;

  const targetDateStr = params.date || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const startOfPeriod = params.startDate ? new Date(params.startDate) : new Date(`${targetDateStr}T00:00:00.000+05:30`);
  const endOfPeriod = params.endDate
    ? new Date(params.endDate)
    : params.startDate
    ? new Date(new Date(params.startDate).setHours(23, 59, 59, 999))
    : new Date(`${targetDateStr}T23:59:59.999+05:30`);

  const refDate = params.endDate ? new Date(params.endDate) : params.startDate ? new Date(params.startDate) : new Date();
  const year = refDate.getFullYear();
  const yearStr = String(year);
  const month = refDate.getMonth() + 1;
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const monthStr = String(month).padStart(2, '0');
  const startOfMonth = new Date(`${yearStr}-${monthStr}-01T00:00:00.000+05:30`);
  const endOfMonth = new Date(`${yearStr}-${monthStr}-${String(lastDayOfMonth).padStart(2, '0')}T23:59:59.999+05:30`);

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, name: true, email: true, role: { select: { code: true, name: true } } },
  });

  // 1. Period metrics (Daily / Custom range)
  const callsPeriod = await prisma.interaction.findMany({
    where: {
      userId: targetUserId,
      type: 'call',
      occurredAt: { gte: startOfPeriod, lte: endOfPeriod },
    },
    select: {
      id: true,
      leadId: true,
      durationSeconds: true,
      occurredAt: true,
      lead: { select: { id: true, createdAt: true } },
    },
    orderBy: { occurredAt: 'asc' },
  });

  // Track distinct new leads called in period vs follow-up calls
  const newLeadIds = new Set<number>();
  let followUpCallsCount = 0;

  for (const c of callsPeriod) {
    const leadId = c.lead?.id || c.leadId;
    if (!leadId) {
      followUpCallsCount++;
      continue;
    }

    const isCreatedInPeriod = c.lead?.createdAt && (() => {
      const lDate = new Date(c.lead.createdAt);
      return lDate >= startOfPeriod && lDate <= endOfPeriod;
    })();

    if (isCreatedInPeriod) {
      if (!newLeadIds.has(leadId)) {
        newLeadIds.add(leadId);
      } else {
        followUpCallsCount++;
      }
    } else {
      followUpCallsCount++;
    }
  }

  const newLeadsCalled = newLeadIds.size;
  const followUpsDone = followUpCallsCount;

  const appointmentsBookedPeriod = await prisma.appointment.count({
    where: {
      createdAt: { gte: startOfPeriod, lte: endOfPeriod },
      status: { not: 'cancelled' },
      OR: [
        { lead: { ownerId: targetUserId } },
        { case: { ownerId: targetUserId } },
      ],
    },
  });

  // Confirmed patient visits in period
  const [visitedCasesPeriod, visitedApptsPeriod] = await Promise.all([
    prisma.case.count({
      where: {
        archivedAt: null,
        OR: [
          { ownerId: targetUserId },
          { lead: { ownerId: targetUserId } },
          { lead: { appointments: { some: { createdBy: targetUserId } } } },
          { interactions: { some: { userId: targetUserId } } },
        ],
        AND: [
          {
            OR: [
              { consultationCompletedAt: { gte: startOfPeriod, lte: endOfPeriod } },
              {
                consultationCompletedAt: null,
                createdAt: { gte: startOfPeriod, lte: endOfPeriod },
                stage: { in: ['visited', 'plan_given', 'counseling_estimate', 'plan_accepted', 'in_treatment', 'aftercare_follow_up', 'completed'] },
              },
            ],
          },
        ],
      },
    }),
    prisma.appointment.count({
      where: {
        status: 'visited',
        OR: [
          { startsAt: { gte: startOfPeriod, lte: endOfPeriod } },
          { updatedAt: { gte: startOfPeriod, lte: endOfPeriod } },
        ],
        NOT: {
          case: {
            createdAt: { gte: startOfPeriod, lte: endOfPeriod },
          },
        },
        AND: [
          {
            OR: [
              { createdBy: targetUserId },
              { lead: { ownerId: targetUserId } },
              { case: { ownerId: targetUserId } },
            ],
          },
        ],
      },
    }),
  ]);

  const patientsVisitedPeriod = visitedCasesPeriod + visitedApptsPeriod;

  const patientsVisitingPeriod = await prisma.appointment.count({
    where: {
      startsAt: { gte: startOfPeriod, lte: endOfPeriod },
      status: { not: 'cancelled' },
      OR: [
        { createdBy: targetUserId },
        { lead: { ownerId: targetUserId } },
        { case: { ownerId: targetUserId } },
      ],
    },
  });

  // 2. Monthly metrics
  const monthlyBookings = await prisma.appointment.count({
    where: {
      createdAt: { gte: startOfMonth, lte: endOfMonth },
      status: { not: 'cancelled' },
      OR: [
        { lead: { ownerId: targetUserId } },
        { case: { ownerId: targetUserId } },
      ],
    },
  });

  const [monthlyVisitedCases, monthlyVisitedAppts] = await Promise.all([
    prisma.case.count({
      where: {
        archivedAt: null,
        OR: [
          { ownerId: targetUserId },
          { lead: { ownerId: targetUserId } },
          { lead: { appointments: { some: { createdBy: targetUserId } } } },
          { interactions: { some: { userId: targetUserId } } },
        ],
        AND: [
          {
            OR: [
              { consultationCompletedAt: { gte: startOfMonth, lte: endOfMonth } },
              {
                consultationCompletedAt: null,
                createdAt: { gte: startOfMonth, lte: endOfMonth },
                stage: { in: ['visited', 'plan_given', 'counseling_estimate', 'plan_accepted', 'in_treatment', 'aftercare_follow_up', 'completed'] },
              },
            ],
          },
        ],
      },
    }),
    prisma.appointment.count({
      where: {
        status: 'visited',
        OR: [
          { startsAt: { gte: startOfMonth, lte: endOfMonth } },
          { updatedAt: { gte: startOfMonth, lte: endOfMonth } },
        ],
        NOT: {
          case: {
            createdAt: { gte: startOfMonth, lte: endOfMonth },
          },
        },
        AND: [
          {
            OR: [
              { createdBy: targetUserId },
              { lead: { ownerId: targetUserId } },
              { case: { ownerId: targetUserId } },
            ],
          },
        ],
      },
    }),
  ]);
  const monthlyVisits = monthlyVisitedCases + monthlyVisitedAppts;

  const monthlyLeadsCount = await prisma.lead.count({
    where: {
      ownerId: targetUserId,
      createdAt: { gte: startOfMonth, lte: endOfMonth },
      archivedAt: null,
    },
  });

  const allTimeLeadsCount = await prisma.lead.count({
    where: {
      ownerId: targetUserId,
      archivedAt: null,
    },
  });

  const distinctLeadsContactedInPeriod = new Set(callsPeriod.map((c) => c.leadId || c.lead?.id).filter(Boolean)).size;
  const leadsCreatedPeriod = await prisma.lead.count({
    where: {
      ownerId: targetUserId,
      createdAt: { gte: startOfPeriod, lte: endOfPeriod },
      archivedAt: null,
    },
  });
  const totalLeadsPeriod = Math.max(distinctLeadsContactedInPeriod, newLeadsCalled, leadsCreatedPeriod);
  const periodBookingRatio = totalLeadsPeriod > 0
    ? Math.min(100, Number(((appointmentsBookedPeriod / Math.max(totalLeadsPeriod, appointmentsBookedPeriod)) * 100).toFixed(1)))
    : appointmentsBookedPeriod > 0 ? 100 : 0;
  const periodVisitRatio = totalLeadsPeriod > 0
    ? Math.min(100, Number(((patientsVisitedPeriod / Math.max(totalLeadsPeriod, patientsVisitedPeriod)) * 100).toFixed(1)))
    : patientsVisitedPeriod > 0 ? 100 : 0;

  const maxMonthlyBookingBase = Math.max(monthlyLeadsCount, monthlyBookings);
  const leadToBookingRatio = maxMonthlyBookingBase > 0
    ? Math.min(100, Number(((monthlyBookings / maxMonthlyBookingBase) * 100).toFixed(1)))
    : allTimeLeadsCount > 0
    ? Math.min(100, Number(((monthlyBookings / Math.max(allTimeLeadsCount, monthlyBookings)) * 100).toFixed(1)))
    : 0;

  const maxMonthlyVisitBase = Math.max(monthlyLeadsCount, monthlyVisits);
  const leadToVisitRatio = maxMonthlyVisitBase > 0
    ? Math.min(100, Number(((monthlyVisits / maxMonthlyVisitBase) * 100).toFixed(1)))
    : allTimeLeadsCount > 0
    ? Math.min(100, Number(((monthlyVisits / Math.max(allTimeLeadsCount, monthlyVisits)) * 100).toFixed(1)))
    : 0;

  return {
    user: targetUser,
    date: targetDateStr,
    daily: {
      totalCalls: callsPeriod.length,
      newLeadsCalled,
      followUpsDone,
      appointmentsBooked: appointmentsBookedPeriod,
      patientsVisited: patientsVisitedPeriod,
      patientsVisiting: patientsVisitingPeriod,
      bookingRatio: periodBookingRatio,
      visitRatio: periodVisitRatio,
    },
    monthly: {
      month: `${yearStr}-${monthStr}`,
      bookings: monthlyBookings,
      bookingTarget: 0, // 0 = No target set
      visits: monthlyVisits,
      visitTarget: 0,   // 0 = No target set
      leadsAssigned: monthlyLeadsCount,
      allTimeLeads: allTimeLeadsCount,
      leadToBookingRatio,
      leadToVisitRatio,
    },
  };
}

export async function getProductTelecallerPerformance(
  params: TelecallerPerformanceParams,
  user: UserContext
) {
  const isManagerOrAdmin = ['admin', 'owner', 'center_head', 'telecaller_manager', 'product_manager', 'super_admin'].includes(user.roleCode);
  const targetUserId = isManagerOrAdmin && params.userId ? params.userId : user.id;

  const targetDateStr = params.date || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const startOfToday = new Date(`${targetDateStr}T00:00:00.000+05:30`);
  const endOfToday = new Date(`${targetDateStr}T23:59:59.999+05:30`);

  const [yearStr, monthStr] = targetDateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const now = new Date(Date.UTC(year, month - 1, 1));
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const startOfMonth = new Date(`${yearStr}-${monthStr}-01T00:00:00.000+05:30`);
  const endOfMonth = new Date(`${yearStr}-${monthStr}-${String(lastDayOfMonth).padStart(2, '0')}T23:59:59.999+05:30`);

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, name: true, email: true, role: { select: { code: true, name: true } } },
  });

  // 1. Daily metrics
  const callsToday = await prisma.interaction.findMany({
    where: {
      userId: targetUserId,
      type: 'call',
      occurredAt: { gte: startOfToday, lte: endOfToday },
    },
    select: {
      id: true,
      leadId: true,
      durationSeconds: true,
      occurredAt: true,
      lead: { select: { id: true, leadType: true, createdAt: true } },
    },
    orderBy: { occurredAt: 'asc' },
  });

  const newLeadIds = new Set<number>();
  let followUpCallsCount = 0;

  for (const c of callsToday) {
    const leadId = c.lead?.id || c.leadId;
    if (!leadId) {
      followUpCallsCount++;
      continue;
    }

    const isCreatedToday = c.lead?.createdAt && (() => {
      const lDate = new Date(c.lead.createdAt);
      return lDate >= startOfToday && lDate <= endOfToday;
    })();

    if (isCreatedToday) {
      if (!newLeadIds.has(leadId)) {
        newLeadIds.add(leadId);
      } else {
        followUpCallsCount++;
      }
    } else {
      followUpCallsCount++;
    }
  }

  const newLeadsCalled = newLeadIds.size;
  const followUpsDone = followUpCallsCount;

  // Orders confirmed today
  const confirmedLeadsToday = await prisma.lead.findMany({
    where: {
      ownerId: targetUserId,
      leadType: 'product',
      saleConfirmedAt: { gte: startOfToday, lte: endOfToday },
    },
    select: { id: true, saleAmount: true },
  });

  const ordersConfirmedToday = confirmedLeadsToday.length;
  const revenueToday = confirmedLeadsToday.reduce((sum, l) => sum + Number(l.saleAmount || 0), 0);

  // 2. Monthly metrics
  const confirmedLeadsMonth = await prisma.lead.findMany({
    where: {
      ownerId: targetUserId,
      leadType: 'product',
      saleConfirmedAt: { gte: startOfMonth, lte: endOfMonth },
    },
    select: { id: true, saleAmount: true },
  });

  const monthlyOrders = confirmedLeadsMonth.length;
  const monthlyRevenue = confirmedLeadsMonth.reduce((sum, l) => sum + Number(l.saleAmount || 0), 0);

  const monthlyLeadsCount = await prisma.lead.count({
    where: {
      ownerId: targetUserId,
      leadType: 'product',
      createdAt: { gte: startOfMonth, lte: endOfMonth },
      archivedAt: null,
    },
  });

  const allTimeLeadsCount = await prisma.lead.count({
    where: {
      ownerId: targetUserId,
      leadType: 'product',
      archivedAt: null,
    },
  });

  const leadToOrderRatio = monthlyLeadsCount > 0
    ? Number(((monthlyOrders / monthlyLeadsCount) * 100).toFixed(1))
    : allTimeLeadsCount > 0
    ? Number(((monthlyOrders / allTimeLeadsCount) * 100).toFixed(1))
    : 0;

  const averageOrderValue = monthlyOrders > 0
    ? Math.round(monthlyRevenue / monthlyOrders)
    : 0;

  // 3. 6-Month Status & Orders Distribution Trend
  const monthsData: any[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const mStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0));
    const mEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    const label = `${monthNames[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

    const [monthLeads, mConfirmed] = await Promise.all([
      prisma.lead.findMany({
        where: {
          ownerId: targetUserId,
          leadType: 'product',
          createdAt: { gte: mStart, lte: mEnd },
          archivedAt: null,
        },
        select: { status: true },
      }),
      prisma.lead.findMany({
        where: {
          ownerId: targetUserId,
          leadType: 'product',
          saleConfirmedAt: { gte: mStart, lte: mEnd },
        },
        select: { saleAmount: true },
      }),
    ]);

    let callbackRequested = 0;
    let inProgress = 0;
    let lost = 0;

    for (const l of monthLeads) {
      if (l.status === 'qualified' || l.status === 'contacted') callbackRequested++;
      else if (l.status === 'new' || l.status === 'not_reachable') inProgress++;
      else if (l.status === 'not_interested') lost++;
    }

    const ordersCount = mConfirmed.length;
    const mRev = mConfirmed.reduce((sum, l) => sum + Number(l.saleAmount || 0), 0);

    monthsData.push({
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
      label,
      totalInquiries: monthLeads.length,
      ordersConfirmed: ordersCount,
      revenue: mRev,
      callbackRequested,
      inProgress,
      lost,
    });
  }

  return {
    user: targetUser,
    date: targetDateStr,
    daily: {
      newLeadsCalled,
      followUpsDone,
      ordersConfirmed: ordersConfirmedToday,
      revenueGenerated: revenueToday,
      totalCalls: callsToday.length,
    },
    monthly: {
      month: `${yearStr}-${monthStr}`,
      ordersConfirmed: monthlyOrders,
      revenueGenerated: monthlyRevenue,
      leadsAssigned: monthlyLeadsCount,
      allTimeLeads: allTimeLeadsCount,
      leadToOrderRatio,
      averageOrderValue,
      targetOrders: 0,
    },
    trend: monthsData,
  };
}

export async function getTeamPerformance(
  params: { branchId?: number; date?: string; startDate?: string; endDate?: string },
  user: UserContext
) {
  const targetDateStr = params.date || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const startOfPeriod = params.startDate ? new Date(params.startDate) : new Date(`${targetDateStr}T00:00:00.000+05:30`);
  const endOfPeriod = params.endDate
    ? new Date(params.endDate)
    : params.startDate
    ? new Date(new Date(params.startDate).setHours(23, 59, 59, 999))
    : new Date(`${targetDateStr}T23:59:59.999+05:30`);

  const refDate = params.endDate ? new Date(params.endDate) : params.startDate ? new Date(params.startDate) : new Date();
  const year = refDate.getFullYear();
  const yearStr = String(year);
  const month = refDate.getMonth() + 1;
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const monthStr = String(month).padStart(2, '0');
  const startOfMonth = new Date(`${yearStr}-${monthStr}-01T00:00:00.000+05:30`);
  const endOfMonth = new Date(`${yearStr}-${monthStr}-${String(lastDayOfMonth).padStart(2, '0')}T23:59:59.999+05:30`);

  const isManagerOrAdmin = ['admin', 'owner', 'center_head', 'telecaller_manager', 'super_admin'].includes(user.roleCode);

  // Find all active telecallers & managers (scoped to self for telecaller role)
  const whereUsers: any = {
    status: 'active',
    archivedAt: null,
    role: {
      code: { in: ['support_telecaller', 'caller', 'telecaller_manager', 'center_head', 'owner', 'admin'] },
    },
  };

  if (!isManagerOrAdmin) {
    whereUsers.id = user.id;
  }

  const telecallers = await prisma.user.findMany({
    where: whereUsers,
    select: {
      id: true,
      name: true,
      email: true,
      role: { select: { code: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });

  const telecallerMetrics = await Promise.all(
    telecallers.map(async (tc) => {
      const callsPeriod = await prisma.interaction.findMany({
        where: {
          userId: tc.id,
          type: 'call',
          occurredAt: { gte: startOfPeriod, lte: endOfPeriod },
        },
        select: {
          id: true,
          leadId: true,
          occurredAt: true,
          lead: { select: { id: true, createdAt: true } },
        },
        orderBy: { occurredAt: 'asc' },
      });

      const newLeadIds = new Set<number>();
      let followUpCallsCount = 0;

      for (const c of callsPeriod) {
        const leadId = c.lead?.id || c.leadId;
        if (!leadId) {
          followUpCallsCount++;
          continue;
        }

        const isCreatedInPeriod = c.lead?.createdAt && (() => {
          const lDate = new Date(c.lead.createdAt);
          return lDate >= startOfPeriod && lDate <= endOfPeriod;
        })();

        if (isCreatedInPeriod) {
          if (!newLeadIds.has(leadId)) {
            newLeadIds.add(leadId);
          } else {
            followUpCallsCount++;
          }
        } else {
          followUpCallsCount++;
        }
      }

      const newLeadsCalled = newLeadIds.size;
      const followUpsDone = followUpCallsCount;

      const appointmentsBookedPeriod = await prisma.appointment.count({
        where: {
          createdAt: { gte: startOfPeriod, lte: endOfPeriod },
          status: { not: 'cancelled' },
          OR: [{ lead: { ownerId: tc.id } }, { case: { ownerId: tc.id } }],
        },
      });

      const [visitedCasesPeriod, visitedApptsPeriod] = await Promise.all([
        prisma.case.count({
          where: {
            archivedAt: null,
            OR: [
              { ownerId: tc.id },
              { lead: { ownerId: tc.id } },
              { lead: { appointments: { some: { createdBy: tc.id } } } },
              { interactions: { some: { userId: tc.id } } },
            ],
            AND: [
              {
                OR: [
                  { consultationCompletedAt: { gte: startOfPeriod, lte: endOfPeriod } },
                  {
                    consultationCompletedAt: null,
                    createdAt: { gte: startOfPeriod, lte: endOfPeriod },
                    stage: { in: ['visited', 'plan_given', 'counseling_estimate', 'plan_accepted', 'in_treatment', 'aftercare_follow_up', 'completed'] },
                  },
                ],
              },
            ],
          },
        }),
        prisma.appointment.count({
          where: {
            status: 'visited',
            OR: [
              { startsAt: { gte: startOfPeriod, lte: endOfPeriod } },
              { updatedAt: { gte: startOfPeriod, lte: endOfPeriod } },
            ],
            NOT: {
              case: {
                createdAt: { gte: startOfPeriod, lte: endOfPeriod },
              },
            },
            AND: [
              {
                OR: [
                  { createdBy: tc.id },
                  { lead: { ownerId: tc.id } },
                  { case: { ownerId: tc.id } },
                ],
              },
            ],
          },
        }),
      ]);

      const patientsVisitedPeriod = visitedCasesPeriod + visitedApptsPeriod;

      const patientsVisitingPeriod = await prisma.appointment.count({
        where: {
          startsAt: { gte: startOfPeriod, lte: endOfPeriod },
          status: { not: 'cancelled' },
          OR: [
            { createdBy: tc.id },
            { lead: { ownerId: tc.id } },
            { case: { ownerId: tc.id } },
          ],
        },
      });

      const monthlyBookings = await prisma.appointment.count({
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          status: { not: 'cancelled' },
          OR: [{ lead: { ownerId: tc.id } }, { case: { ownerId: tc.id } }],
        },
      });

      const [monthlyVisitedCases, monthlyVisitedAppts] = await Promise.all([
        prisma.case.count({
          where: {
            archivedAt: null,
            OR: [
              { ownerId: tc.id },
              { lead: { ownerId: tc.id } },
              { lead: { appointments: { some: { createdBy: tc.id } } } },
              { interactions: { some: { userId: tc.id } } },
            ],
            AND: [
              {
                OR: [
                  { consultationCompletedAt: { gte: startOfMonth, lte: endOfMonth } },
                  {
                    consultationCompletedAt: null,
                    createdAt: { gte: startOfMonth, lte: endOfMonth },
                    stage: { in: ['visited', 'plan_given', 'counseling_estimate', 'plan_accepted', 'in_treatment', 'aftercare_follow_up', 'completed'] },
                  },
                ],
              },
            ],
          },
        }),
        prisma.appointment.count({
          where: {
            status: 'visited',
            OR: [
              { startsAt: { gte: startOfMonth, lte: endOfMonth } },
              { updatedAt: { gte: startOfMonth, lte: endOfMonth } },
            ],
            NOT: {
              case: {
                createdAt: { gte: startOfMonth, lte: endOfMonth },
              },
            },
            AND: [
              {
                OR: [
                  { createdBy: tc.id },
                  { lead: { ownerId: tc.id } },
                  { case: { ownerId: tc.id } },
                ],
              },
            ],
          },
        }),
      ]);
      const monthlyVisits = monthlyVisitedCases + monthlyVisitedAppts;

      const monthlyLeadsCount = await prisma.lead.count({
        where: {
          ownerId: tc.id,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          archivedAt: null,
        },
      });

      const allTimeLeadsCount = await prisma.lead.count({
        where: { ownerId: tc.id, archivedAt: null },
      });

      const distinctLeadsContactedInPeriod = new Set(callsPeriod.map((c) => c.leadId || c.lead?.id).filter(Boolean)).size;
      const leadsCreatedPeriod = await prisma.lead.count({
        where: {
          ownerId: tc.id,
          createdAt: { gte: startOfPeriod, lte: endOfPeriod },
          archivedAt: null,
        },
      });
      const totalLeadsPeriod = Math.max(distinctLeadsContactedInPeriod, newLeadsCalled, leadsCreatedPeriod);
      const periodBookingRatio = totalLeadsPeriod > 0
        ? Math.min(100, Number(((appointmentsBookedPeriod / Math.max(totalLeadsPeriod, appointmentsBookedPeriod)) * 100).toFixed(1)))
        : appointmentsBookedPeriod > 0 ? 100 : 0;
      const periodVisitRatio = totalLeadsPeriod > 0
        ? Math.min(100, Number(((patientsVisitedPeriod / Math.max(totalLeadsPeriod, patientsVisitedPeriod)) * 100).toFixed(1)))
        : patientsVisitedPeriod > 0 ? 100 : 0;

      const maxMonthlyBookingBase = Math.max(monthlyLeadsCount, monthlyBookings);
      const leadToBookingRatio = maxMonthlyBookingBase > 0
        ? Math.min(100, Number(((monthlyBookings / maxMonthlyBookingBase) * 100).toFixed(1)))
        : allTimeLeadsCount > 0
        ? Math.min(100, Number(((monthlyBookings / Math.max(allTimeLeadsCount, monthlyBookings)) * 100).toFixed(1)))
        : 0;

      const maxMonthlyVisitBase = Math.max(monthlyLeadsCount, monthlyVisits);
      const leadToVisitRatio = maxMonthlyVisitBase > 0
        ? Math.min(100, Number(((monthlyVisits / maxMonthlyVisitBase) * 100).toFixed(1)))
        : allTimeLeadsCount > 0
        ? Math.min(100, Number(((monthlyVisits / Math.max(allTimeLeadsCount, monthlyVisits)) * 100).toFixed(1)))
        : 0;

      return {
        user: tc,
        daily: {
          totalCalls: callsPeriod.length,
          newLeadsCalled,
          followUpsDone,
          appointmentsBooked: appointmentsBookedPeriod,
          patientsVisited: patientsVisitedPeriod,
          patientsVisiting: patientsVisitingPeriod,
          bookingRatio: periodBookingRatio,
          visitRatio: periodVisitRatio,
        },
        monthly: {
          bookings: monthlyBookings,
          bookingTarget: 0,
          visits: monthlyVisits,
          visitTarget: 0,
          leadsAssigned: monthlyLeadsCount,
          leadToBookingRatio,
          leadToVisitRatio,
        },
      };
    })
  );

  // Hospital-wide aggregates
  const hospitalTotals = telecallerMetrics.reduce(
    (acc, item) => ({
      dailyCalls: acc.dailyCalls + item.daily.totalCalls,
      dailyNewCalled: acc.dailyNewCalled + item.daily.newLeadsCalled,
      dailyFollowUps: acc.dailyFollowUps + item.daily.followUpsDone,
      dailyBookings: acc.dailyBookings + item.daily.appointmentsBooked,
      dailyVisited: acc.dailyVisited + item.daily.patientsVisited,
      dailyVisiting: acc.dailyVisiting + item.daily.patientsVisiting,
      monthlyBookings: acc.monthlyBookings + item.monthly.bookings,
      monthlyVisits: acc.monthlyVisits + item.monthly.visits,
      monthlyLeads: acc.monthlyLeads + item.monthly.leadsAssigned,
    }),
    {
      dailyCalls: 0,
      dailyNewCalled: 0,
      dailyFollowUps: 0,
      dailyBookings: 0,
      dailyVisited: 0,
      dailyVisiting: 0,
      monthlyBookings: 0,
      monthlyVisits: 0,
      monthlyLeads: 0,
    }
  );

  // Hospital-wide actual totals for the month and period (catches all visits and bookings regardless of telecaller ownership)
  const [
    totalHospitalCasesMonth,
    totalHospitalApptsMonth,
    totalHospitalBookingsMonth,
    totalHospitalCasesPeriod,
    totalHospitalApptsPeriod,
    totalHospitalBookingsPeriod,
  ] = await Promise.all([
    prisma.case.count({
      where: {
        archivedAt: null,
        ...(params.branchId ? { branchId: params.branchId } : {}),
        OR: [
          { consultationCompletedAt: { gte: startOfMonth, lte: endOfMonth } },
          {
            consultationCompletedAt: null,
            createdAt: { gte: startOfMonth, lte: endOfMonth },
            stage: { in: ['visited', 'plan_given', 'counseling_estimate', 'plan_accepted', 'in_treatment', 'aftercare_follow_up', 'completed'] },
          },
        ],
      },
    }),
    prisma.appointment.count({
      where: {
        status: 'visited',
        ...(params.branchId ? { lead: { branchId: params.branchId } } : {}),
        OR: [
          { startsAt: { gte: startOfMonth, lte: endOfMonth } },
          { updatedAt: { gte: startOfMonth, lte: endOfMonth } },
        ],
        NOT: {
          case: {
            createdAt: { gte: startOfMonth, lte: endOfMonth },
          },
        },
      },
    }),
    prisma.appointment.count({
      where: {
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        status: { not: 'cancelled' },
        ...(params.branchId ? { lead: { branchId: params.branchId } } : {}),
      },
    }),
    prisma.case.count({
      where: {
        archivedAt: null,
        ...(params.branchId ? { branchId: params.branchId } : {}),
        OR: [
          { consultationCompletedAt: { gte: startOfPeriod, lte: endOfPeriod } },
          {
            consultationCompletedAt: null,
            createdAt: { gte: startOfPeriod, lte: endOfPeriod },
            stage: { in: ['visited', 'plan_given', 'counseling_estimate', 'plan_accepted', 'in_treatment', 'aftercare_follow_up', 'completed'] },
          },
        ],
      },
    }),
    prisma.appointment.count({
      where: {
        status: 'visited',
        ...(params.branchId ? { lead: { branchId: params.branchId } } : {}),
        OR: [
          { startsAt: { gte: startOfPeriod, lte: endOfPeriod } },
          { updatedAt: { gte: startOfPeriod, lte: endOfPeriod } },
        ],
        NOT: {
          case: {
            createdAt: { gte: startOfPeriod, lte: endOfPeriod },
          },
        },
      },
    }),
    prisma.appointment.count({
      where: {
        createdAt: { gte: startOfPeriod, lte: endOfPeriod },
        status: { not: 'cancelled' },
        ...(params.branchId ? { lead: { branchId: params.branchId } } : {}),
      },
    }),
  ]);

  const totalHospitalMonthlyVisits = totalHospitalCasesMonth + totalHospitalApptsMonth;
  if (totalHospitalMonthlyVisits > hospitalTotals.monthlyVisits) {
    hospitalTotals.monthlyVisits = totalHospitalMonthlyVisits;
  }
  if (totalHospitalBookingsMonth > hospitalTotals.monthlyBookings) {
    hospitalTotals.monthlyBookings = totalHospitalBookingsMonth;
  }

  const totalHospitalPeriodVisits = totalHospitalCasesPeriod + totalHospitalApptsPeriod;
  if (totalHospitalPeriodVisits > hospitalTotals.dailyVisited) {
    hospitalTotals.dailyVisited = totalHospitalPeriodVisits;
  }
  if (totalHospitalBookingsPeriod > hospitalTotals.dailyBookings) {
    hospitalTotals.dailyBookings = totalHospitalBookingsPeriod;
  }

  const totalHospitalLeadsPeriod = Math.max(hospitalTotals.dailyNewCalled, hospitalTotals.dailyCalls);
  const periodHospitalBookingRatio = totalHospitalLeadsPeriod > 0
    ? Math.min(100, Number(((hospitalTotals.dailyBookings / Math.max(totalHospitalLeadsPeriod, hospitalTotals.dailyBookings)) * 100).toFixed(1)))
    : hospitalTotals.dailyBookings > 0 ? 100 : 0;
  const periodHospitalVisitRatio = totalHospitalLeadsPeriod > 0
    ? Math.min(100, Number(((hospitalTotals.dailyVisited / Math.max(totalHospitalLeadsPeriod, hospitalTotals.dailyVisited)) * 100).toFixed(1)))
    : hospitalTotals.dailyVisited > 0 ? 100 : 0;

  const maxHospitalMonthlyBookingBase = Math.max(hospitalTotals.monthlyLeads, hospitalTotals.monthlyBookings);
  const monthlyHospitalBookingRatio = maxHospitalMonthlyBookingBase > 0
    ? Math.min(100, Number(((hospitalTotals.monthlyBookings / maxHospitalMonthlyBookingBase) * 100).toFixed(1)))
    : 0;
  const maxHospitalMonthlyVisitBase = Math.max(hospitalTotals.monthlyLeads, hospitalTotals.monthlyVisits);
  const monthlyHospitalVisitRatio = maxHospitalMonthlyVisitBase > 0
    ? Math.min(100, Number(((hospitalTotals.monthlyVisits / maxHospitalMonthlyVisitBase) * 100).toFixed(1)))
    : 0;

  return {
    date: targetDateStr,
    month: `${yearStr}-${monthStr}`,
    totals: {
      ...hospitalTotals,
      bookingRatio: periodHospitalBookingRatio,
      visitRatio: periodHospitalVisitRatio,
      monthlyBookingRatio: monthlyHospitalBookingRatio,
      monthlyVisitRatio: monthlyHospitalVisitRatio,
    },
    telecallers: telecallerMetrics,
  };
}

export async function getMonthlyStatusTrend(
  params: { userId?: number; branchId?: number; months?: number },
  user: UserContext
) {
  const isManagerOrAdmin = ['admin', 'owner', 'center_head', 'telecaller_manager', 'super_admin'].includes(user.roleCode);
  const targetUserId = isManagerOrAdmin && params.userId ? params.userId : !isManagerOrAdmin ? user.id : undefined;

  const numMonths = Math.min(Math.max(params.months || 6, 1), 12);
  const now = new Date();
  const monthsData: Array<{
    month: string;
    monthLabel: string;
    callbackRequested: number;
    appointmentBooked: number;
    visited: number;
    inProgress: number;
    lost: number;
    totalLeads: number;
  }> = [];

  for (let i = numMonths - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const startM = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0));
    const endM = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    const key = `${startM.getUTCFullYear()}-${String(startM.getUTCMonth() + 1).padStart(2, '0')}`;
    const monthLabel = startM.toLocaleString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });

    const leadWhere: any = {
      createdAt: { gte: startM, lte: endM },
      archivedAt: null,
    };
    if (targetUserId) {
      leadWhere.ownerId = targetUserId;
    }

    const leads = await prisma.lead.findMany({
      where: leadWhere,
      select: {
        id: true,
        status: true,
      },
    });

    // Count callbacks from interactions in that month
    const interactionWhere: any = {
      occurredAt: { gte: startM, lte: endM },
      outcome: { code: 'CALLBACK_REQUESTED' },
    };
    if (targetUserId) {
      interactionWhere.userId = targetUserId;
    }
    const callbackCount = await prisma.interaction.count({ where: interactionWhere });

    // Appointments booked in this month
    const apptWhere: any = {
      createdAt: { gte: startM, lte: endM },
      status: { not: 'cancelled' },
    };
    if (targetUserId) {
      apptWhere.OR = [{ lead: { ownerId: targetUserId } }, { case: { ownerId: targetUserId } }];
    }
    const bookedCount = await prisma.appointment.count({ where: apptWhere });

    // Visits / Consultations completed in this month
    const caseWhere: any = {
      archivedAt: null,
      OR: [
        { consultationCompletedAt: { gte: startM, lte: endM } },
        {
          consultationCompletedAt: null,
          createdAt: { gte: startM, lte: endM },
          stage: { in: ['visited', 'plan_given', 'counseling_estimate', 'plan_accepted', 'in_treatment', 'aftercare_follow_up', 'completed'] },
        },
      ],
    };
    if (targetUserId) {
      caseWhere.AND = [
        {
          OR: [
            { ownerId: targetUserId },
            { lead: { ownerId: targetUserId } },
            { lead: { appointments: { some: { createdBy: targetUserId } } } },
          ],
        },
      ];
    }
    const visitedCount = await prisma.case.count({ where: caseWhere });

    // Leads in progress (contacted, qualified, new)
    const inProgressCount = leads.filter((l) => ['new', 'contacted', 'qualified', 'callback'].includes(l.status)).length;

    // Leads lost / not interested
    const lostCount = leads.filter((l) => ['not_interested', 'lost', 'unqualified'].includes(l.status)).length;

    monthsData.push({
      month: key,
      monthLabel,
      callbackRequested: callbackCount,
      appointmentBooked: bookedCount,
      visited: visitedCount,
      inProgress: inProgressCount,
      lost: lostCount,
      totalLeads: leads.length,
    });
  }

  return {
    targetUserId: targetUserId || 'all',
    months: monthsData,
  };
}


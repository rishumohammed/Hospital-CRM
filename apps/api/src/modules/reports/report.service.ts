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

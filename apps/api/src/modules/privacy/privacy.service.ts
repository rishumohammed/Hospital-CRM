import { prisma } from '../../database/client';
import { normalizePhoneNumber } from '@hospital-crm/shared';

/**
 * Data Subject Request (DSR) & Privacy Compliance Service.
 * Provides data lookup across all entities for GDPR / DPDP compliance,
 * and data retention policy management.
 */

export interface DataSubjectBundle {
  mobileNorm: string;
  found: boolean;
  patient: any | null;
  leads: any[];
  cases: any[];
  interactions: any[];
  appointments: any[];
  tasks: any[];
  exportedAt: string;
}

export async function findDataSubjectRecords(rawMobile: string): Promise<DataSubjectBundle> {
  const normalized = normalizePhoneNumber(rawMobile);
  const mobileNorm = normalized || rawMobile.trim();

  // 1. Find Patient
  const patient = await prisma.patient.findFirst({
    where: { mobileNorm },
    include: {
      branch: { select: { id: true, name: true, code: true } },
    },
  });

  // 2. Find Leads
  const leads = await prisma.lead.findMany({
    where: { mobileNorm },
    include: {
      branch: { select: { id: true, name: true } },
      department: { select: { labelEn: true } },
      source: { select: { labelEn: true } },
      owner: { select: { id: true, name: true } },
    },
  });

  const leadIds = leads.map((l) => l.id);

  // 3. Find Cases (either linked to patient or converted from leads)
  const caseOr = [
    ...(patient ? [{ patientId: patient.id }] : []),
    ...(leadIds.length > 0 ? [{ leadId: { in: leadIds } }] : []),
  ];

  const cases = caseOr.length > 0
    ? await prisma.case.findMany({
        where: { OR: caseOr },
        include: {
          branch: { select: { id: true, name: true } },
          department: { select: { labelEn: true } },
          treatingDoctor: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true } },
        },
      })
    : [];

  const caseIds = cases.map((c) => c.id);

  // 4. Find Interactions
  const interactionOr = [
    ...(leadIds.length > 0 ? [{ leadId: { in: leadIds } }] : []),
    ...(caseIds.length > 0 ? [{ caseId: { in: caseIds } }] : []),
  ];

  const interactions = interactionOr.length > 0
    ? await prisma.interaction.findMany({
        where: { OR: interactionOr },
        include: {
          user: { select: { id: true, name: true } },
          outcome: { select: { labelEn: true } },
        },
        orderBy: { occurredAt: 'desc' },
      })
    : [];

  // 5. Find Appointments
  const appointmentOr = [
    ...(leadIds.length > 0 ? [{ leadId: { in: leadIds } }] : []),
    ...(caseIds.length > 0 ? [{ caseId: { in: caseIds } }] : []),
  ];

  const appointments = appointmentOr.length > 0
    ? await prisma.appointment.findMany({
        where: { OR: appointmentOr },
        orderBy: { startsAt: 'desc' },
      })
    : [];

  // 6. Find Tasks
  const taskOr = [
    ...(leadIds.length > 0 ? [{ leadId: { in: leadIds } }] : []),
    ...(caseIds.length > 0 ? [{ caseId: { in: caseIds } }] : []),
  ];

  const tasks = taskOr.length > 0
    ? await prisma.task.findMany({
        where: { OR: taskOr },
        include: {
          owner: { select: { id: true, name: true } },
        },
        orderBy: { dueAt: 'desc' },
      })
    : [];

  const found = !!(patient || leads.length > 0 || cases.length > 0);

  return {
    mobileNorm,
    found,
    patient,
    leads,
    cases,
    interactions,
    appointments,
    tasks,
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Data retention policy archival stub.
 * Archives inactive records older than specified retention days.
 */
export async function applyDataRetentionPolicy(
  resource: 'leads' | 'cases' | 'audit_logs',
  retentionDays: number
): Promise<{ archivedCount: number }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  let archivedCount = 0;

  if (resource === 'leads') {
    const result = await prisma.lead.updateMany({
      where: {
        status: { in: ['not_interested', 'not_reachable', 'junk', 'converted'] },
        archivedAt: null,
        updatedAt: { lte: cutoffDate },
      },
      data: {
        archivedAt: new Date(),
      },
    });
    archivedCount = result.count;
  } else if (resource === 'cases') {
    const result = await prisma.case.updateMany({
      where: {
        stage: { in: ['completed', 'not_started', 'dropped_out'] },
        archivedAt: null,
        updatedAt: { lte: cutoffDate },
      },
      data: {
        archivedAt: new Date(),
      },
    });
    archivedCount = result.count;
  }

  return { archivedCount };
}

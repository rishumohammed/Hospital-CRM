import { prisma } from '../../database/client';

export interface CallingHoursSetting {
  start: string; // "09:00"
  end: string;   // "20:00"
  timezone: string; // "Asia/Kolkata"
  enforce: boolean;
}

export interface SlaMinutesSetting {
  meta_ads: number;
  google_ads: number;
  default: number;
  business_hours_only: boolean;
}

export interface ContactRulesSetting {
  max_calls_per_day: number;
  max_attempts_per_cycle: number;
  warn_on_excess: boolean;
}

export interface QuietHoursSetting {
  enabled: boolean;
  start: string;
  end: string;
}

const defaultFallbacks: Record<string, any> = {
  calling_hours: {
    start: '09:00',
    end: '20:00',
    timezone: 'Asia/Kolkata',
    enforce: true,
  },
  sla_minutes: {
    meta_ads: 5,
    google_ads: 5,
    default: 15,
    business_hours_only: true,
  },
  contact_rules: {
    max_calls_per_day: 1,
    max_attempts_per_cycle: 3,
    warn_on_excess: true,
  },
  quiet_hours: {
    enabled: true,
    start: '20:00',
    end: '09:00',
  },
  retention_policies: {
    leads_days: 1825,
    audit_days: 2555,
  },
};

export async function getSetting<T = any>(key: string, defaultValue?: T): Promise<T> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  if (setting && setting.value) {
    return setting.value as T;
  }
  return defaultValue !== undefined ? defaultValue : defaultFallbacks[key];
}

export async function getAllSettings(): Promise<Record<string, any>> {
  const settings = await prisma.setting.findMany();
  const result = { ...defaultFallbacks };
  for (const s of settings) {
    result[s.key] = s.value;
  }
  return result;
}

export async function resetAllTestData() {
  // 1. Break circular / self references on leads and cases
  await prisma.lead.updateMany({
    data: {
      referredFromLeadId: null,
      convertedPatientId: null,
      closedReasonId: null,
      campaignId: null,
      ownerId: null,
    },
  });

  await prisma.case.updateMany({
    data: {
      leadId: null,
      treatingDoctorId: null,
      ownerId: null,
      notStartedReasonId: null,
      closureCodeId: null,
    },
  });

  // 2. Clear transactional tables in foreign-key safe order
  await prisma.leadProductInterest.deleteMany();
  await prisma.productWaitlist.deleteMany();
  await prisma.leadTestimonialSendItem.deleteMany();
  await prisma.leadTestimonialSend.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.task.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.treatmentCheckin.deleteMany();
  await prisma.escalation.deleteMany();
  await prisma.scheduleExtensionRequest.deleteMany();
  await prisma.scheduledVisit.deleteMany();
  await prisma.visitSchedule.deleteMany();
  await prisma.caseHandover.deleteMany();
  await prisma.case.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.campaignProduct.deleteMany();
  await prisma.productCampaign.deleteMany();
  await prisma.productRelation.deleteMany();
  await prisma.productPriceHistory.deleteMany();
  await prisma.productStockHistory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.updateMany({ data: { parentId: null } });
  await prisma.productCategory.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.export.deleteMany();

  return {
    success: true,
    message: 'All transactional data, marketing campaigns, products, and categories cleared successfully. Catalog is completely clean for fresh setup.',
  };
}

/**
 * Clear all operational/demo data (leads, cases, tasks, visits, interactions, appointments, etc.)
 * while keeping Users, Roles, Permissions, Departments, Sources, Settings, Products & Categories intact.
 */
export async function clearOperationalData() {
  console.log('--- Clearing Operational / Demo Data ---');
  // 1. Break circular / self references on leads and cases
  await prisma.lead.updateMany({
    data: {
      referredFromLeadId: null,
      convertedPatientId: null,
      closedReasonId: null,
      campaignId: null,
      ownerId: null,
    },
  });

  await prisma.case.updateMany({
    data: {
      leadId: null,
      treatingDoctorId: null,
      ownerId: null,
      notStartedReasonId: null,
      closureCodeId: null,
    },
  });

  // 2. Clear transactional tables in foreign-key safe order
  const productInterests = await prisma.leadProductInterest.deleteMany();
  const waitlist = await prisma.productWaitlist.deleteMany();
  const testimonialSendItems = await prisma.leadTestimonialSendItem.deleteMany();
  const testimonialSends = await prisma.leadTestimonialSend.deleteMany();
  const interactions = await prisma.interaction.deleteMany();
  const tasks = await prisma.task.deleteMany();
  const appointments = await prisma.appointment.deleteMany();
  const treatmentCheckins = await prisma.treatmentCheckin.deleteMany();
  const escalations = await prisma.escalation.deleteMany();
  const scheduleExtensionRequests = await prisma.scheduleExtensionRequest.deleteMany();
  const scheduledVisits = await prisma.scheduledVisit.deleteMany();
  const visitSchedules = await prisma.visitSchedule.deleteMany();
  const caseHandovers = await prisma.caseHandover.deleteMany();
  const cases = await prisma.case.deleteMany();
  const leads = await prisma.lead.deleteMany();
  const patients = await prisma.patient.deleteMany();
  const notifications = await prisma.notification.deleteMany();
  const outboxEvents = await prisma.outboxEvent.deleteMany();
  const exportsData = await prisma.export.deleteMany();

  await prisma.auditLog.deleteMany({
    where: {
      entity: {
        in: ['lead', 'case', 'patient', 'task', 'interaction', 'appointment', 'visit', 'treatment_checkin', 'escalation'],
      },
    },
  });

  const result = {
    success: true,
    message: 'All operational and demo data cleared successfully. System configuration, users, roles, and product catalog remain intact.',
    clearedCounts: {
      leads: leads.count,
      patients: patients.count,
      cases: cases.count,
      tasks: tasks.count,
      interactions: interactions.count,
      appointments: appointments.count,
      scheduledVisits: scheduledVisits.count,
      visitSchedules: visitSchedules.count,
      treatmentCheckins: treatmentCheckins.count,
      escalations: escalations.count,
      caseHandovers: caseHandovers.count,
      productInterests: productInterests.count,
      waitlist: waitlist.count,
      testimonialSends: testimonialSends.count,
      notifications: notifications.count,
      outboxEvents: outboxEvents.count,
      exports: exportsData.count,
    },
  };
  console.log('✓ Operational Data Cleared:', JSON.stringify(result.clearedCounts, null, 2));
  return result;
}


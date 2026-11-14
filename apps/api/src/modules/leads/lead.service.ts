import { prisma } from '../../database/client';
import { UserContext, scopeWhere, hasPermission, getEffectiveScope } from '../rbac/scope';
import {
  normalizePhoneNumber,
  maskPhoneNumber,
  Permissions,
  ProductStatuses,
  StockStatuses,
} from '@hospital-crm/shared';
import { recordAuditLog } from '../audit/audit.service';
import { getSetting } from '../settings/settings.service';
import { cancelOpenCadenceTasks, calculateStepDueAt } from '../cadences/cadence.service';
import { addHours, addDays, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { generateScheduleVisits } from '../treatment-followup/schedule.engine';
import { getBranchScheduleConfig, recomputeCaseAdherence } from '../treatment-followup/treatment.service';

export interface CreateLeadInput {
  leadType?: 'treatment' | 'product';
  lead_type?: 'treatment' | 'product';
  name: string;
  mobile: string;
  altMobile?: string | null;
  age?: number | null;
  location?: string | null;
  language?: 'en' | 'ml';
  concern?: string;
  departmentId?: number;
  department_id?: number;
  sourceId?: number;
  source_id?: number;
  branchId?: number;
  branch_id?: number;
  campaignId?: number | null;
  campaign_id?: number | null;
  campaignText?: string | null;
  campaign_text?: string | null;
  referrerText?: string | null;
  referrer_text?: string | null;
  productIds?: number[];
  product_ids?: number[];
  note?: string | null;
  consentCalls?: boolean;
  consentWhatsapp?: boolean;
  consentSms?: boolean;
  overrideDuplicate?: boolean;
  overrideReason?: string;
  ownerId?: number | null;
  owner_id?: number | null;
  existingPatientId?: number | null;
  existing_patient_id?: number | null;
  isFamilyMember?: boolean;
  is_family_member?: boolean;
  familyRelation?: string | null;
  family_relation?: string | null;
}

export interface ListLeadsParams {
  leadType?: 'treatment' | 'product';
  page?: number;
  pageSize?: number;
  status?: string;
  sourceId?: number;
  departmentId?: number;
  branchId?: number;
  ownerId?: number;
  unassigned?: boolean;
  priority?: string;
  language?: string;
  search?: string;
  campaignId?: number;
  productId?: number;
  categoryId?: number;
  stockAffected?: boolean;
  testimonials?: 'sent' | 'not_sent';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
}

/**
 * Calculates the first-response due timestamp based on source and business hours.
 * - Google Ads & Meta Ads: 5 minutes SLA
 * - Other sources: 15 minutes SLA (or product_first_response_minutes setting)
 * - Business hours default to 09:00 - 20:00 Asia/Kolkata (UTC+05:30)
 */
export async function calculateFirstResponseDue(
  sourceCode: string,
  branchId: number,
  createdAt: Date = new Date(),
  leadType: 'treatment' | 'product' = 'treatment'
): Promise<Date> {
  const callingHours = await getSetting('calling_hours', {
    start: '09:00',
    end: '20:00',
    timezone: 'Asia/Kolkata',
  });

  const normSource = sourceCode.toUpperCase();
  const isAd = normSource === 'META_ADS' || normSource === 'GOOGLE_ADS';
  let slaMinutes = isAd ? 5 : 15;

  if (leadType === 'product') {
    const productSla = await getSetting('product_first_response_minutes', 15);
    slaMinutes = typeof productSla === 'number' ? productSla : 15;
  }

  // Convert createdAt to IST (UTC+05:30)
  const IST_OFFSET_MS = 330 * 60 * 1000;
  const istDate = new Date(createdAt.getTime() + IST_OFFSET_MS);

  const [startHour, startMin] = callingHours.start.split(':').map(Number);
  const [endHour, endMin] = callingHours.end.split(':').map(Number);

  const istHours = istDate.getUTCHours();
  const istMinutes = istDate.getUTCMinutes();
  const currentMinuteOfDay = istHours * 60 + istMinutes;
  const startMinuteOfDay = startHour * 60 + startMin;
  const endMinuteOfDay = endHour * 60 + endMin;

  let dueIstDate: Date;

  if (currentMinuteOfDay < startMinuteOfDay) {
    // Created before business hours today -> Starts at opening time + SLA
    dueIstDate = new Date(istDate);
    dueIstDate.setUTCHours(startHour, startMin + slaMinutes, 0, 0);
  } else if (currentMinuteOfDay >= endMinuteOfDay) {
    // Created after business hours today -> Starts at opening time tomorrow + SLA
    dueIstDate = new Date(istDate);
    dueIstDate.setUTCDate(dueIstDate.getUTCDate() + 1);
    dueIstDate.setUTCHours(startHour, startMin + slaMinutes, 0, 0);
  } else {
    // Created during business hours
    const targetMinute = currentMinuteOfDay + slaMinutes;
    if (targetMinute <= endMinuteOfDay) {
      dueIstDate = new Date(istDate.getTime() + slaMinutes * 60 * 1000);
    } else {
      // Overflows to next business day
      const overflowMinutes = targetMinute - endMinuteOfDay;
      dueIstDate = new Date(istDate);
      dueIstDate.setUTCDate(dueIstDate.getUTCDate() + 1);
      dueIstDate.setUTCHours(startHour, startMin + overflowMinutes, 0, 0);
    }
  }

  // Convert back from IST to UTC
  return new Date(dueIstDate.getTime() - IST_OFFSET_MS);
}

/**
 * Assigns a lead via round-robin to an active support telecaller in the branch.
 */
export async function assignLeadRoundRobin(branchId: number): Promise<number | null> {
  const supportUsers = await prisma.user.findMany({
    where: {
      status: 'active',
      available: true,
      role: { code: 'support_telecaller' },
      userBranches: { some: { branchId } },
      userTeams: { some: { team: { code: 'support' } } },
    },
    select: {
      id: true,
      _count: {
        select: {
          ownedLeads: {
            where: {
              status: { in: ['new', 'contacted', 'qualified', 'appointment_booked'] },
              archivedAt: null,
            },
          },
        },
      },
      ownedLeads: {
        where: { archivedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  if (supportUsers.length === 0) {
    // Fallback: any active user in support team with support_telecaller role
    const fallbackUser = await prisma.user.findFirst({
      where: {
        status: 'active',
        available: true,
        role: { code: 'support_telecaller' },
      },
      select: { id: true },
    });
    return fallbackUser ? fallbackUser.id : null;
  }

  // Sort by lowest open lead count, then by least recent assignment
  supportUsers.sort((a, b) => {
    const countDiff = a._count.ownedLeads - b._count.ownedLeads;
    if (countDiff !== 0) return countDiff;

    const aTime = a.ownedLeads[0]?.createdAt.getTime() || 0;
    const bTime = b.ownedLeads[0]?.createdAt.getTime() || 0;
    return aTime - bTime;
  });

  return supportUsers[0].id;
}

/**
 * Assigns a product lead via round-robin to an active product sales executive in the branch.
 */
export async function assignProductLeadRoundRobin(branchId: number): Promise<number | null> {
  const productUsers = await prisma.user.findMany({
    where: {
      status: 'active',
      available: true,
      role: { code: 'product_sales_executive' },
      userBranches: { some: { branchId } },
      userTeams: { some: { team: { code: 'product_sales' } } },
    },
    select: {
      id: true,
      _count: {
        select: {
          ownedLeads: {
            where: {
              leadType: 'product',
              status: { in: ['new', 'contacted', 'qualified', 'interested'] },
              archivedAt: null,
            },
          },
        },
      },
      ownedLeads: {
        where: { archivedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  if (productUsers.length === 0) {
    const fallbackUser = await prisma.user.findFirst({
      where: {
        status: 'active',
        available: true,
        role: { code: 'product_sales_executive' },
      },
      select: { id: true },
    });
    return fallbackUser ? fallbackUser.id : null;
  }

  productUsers.sort((a, b) => {
    const countDiff = a._count.ownedLeads - b._count.ownedLeads;
    if (countDiff !== 0) return countDiff;

    const aTime = a.ownedLeads[0]?.createdAt.getTime() || 0;
    const bTime = b.ownedLeads[0]?.createdAt.getTime() || 0;
    return aTime - bTime;
  });

  return productUsers[0].id;
}

/**
 * Checks if an active lead or registered patient with the same normalized mobile already exists.
 * Distinguishes between active in-progress leads vs returning patients & family accounts.
 */
export async function checkDuplicateLead(
  mobile: string,
  altMobile?: string | null
): Promise<any | null> {
  const normMobile = normalizePhoneNumber(mobile);
  if (!normMobile) return null;

  const conditions: any[] = [
    { mobileNorm: normMobile },
    { altMobileNorm: normMobile },
  ];

  if (altMobile) {
    const normAlt = normalizePhoneNumber(altMobile);
    if (normAlt) {
      conditions.push({ mobileNorm: normAlt }, { altMobileNorm: normAlt });
    }
  }

  // Find active lead (in-progress unconverted & unclosed)
  const activeLead = await prisma.lead.findFirst({
    where: {
      OR: conditions,
      status: { in: ['new', 'contacted', 'qualified', 'appointment_booked'] },
      archivedAt: null,
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      branch: { select: { id: true, name: true, code: true } },
      source: { select: { id: true, code: true, labelEn: true } },
      department: { select: { id: true, code: true, labelEn: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Check for existing registered patients under this mobile number
  const mobileVariants = [normMobile];
  if (altMobile) {
    const normAlt = normalizePhoneNumber(altMobile);
    if (normAlt && !mobileVariants.includes(normAlt)) mobileVariants.push(normAlt);
  }

  const existingPatients = await prisma.patient.findMany({
    where: {
      mobileNorm: { in: mobileVariants },
      archivedAt: null,
    },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      cases: {
        where: { archivedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          treatingDoctor: { select: { id: true, name: true } },
          department: { select: { id: true, code: true, labelEn: true } },
        },
      },
    },
  });

  const formattedPatients = existingPatients.map((p: any) => ({
    id: p.id,
    patientCode: p.patientCode,
    name: p.name,
    mobileNorm: p.mobileNorm,
    dateOfBirth: p.dateOfBirth,
    branchName: p.branch?.name,
    lastCase: p.cases[0]
      ? {
          id: p.cases[0].id,
          stage: p.cases[0].stage,
          careType: p.cases[0].careType,
          doctorName: p.cases[0].treatingDoctor?.name || 'Doctor',
          departmentName: p.cases[0].department?.labelEn || p.cases[0].department?.code || 'General',
          visitedAt: p.cases[0].consultationCompletedAt || p.cases[0].createdAt,
        }
      : null,
  }));

  if (!activeLead && formattedPatients.length === 0) {
    return null;
  }

  const result: any = {
    duplicate: Boolean(activeLead),
    hasActiveLead: Boolean(activeLead),
    activeLead: activeLead || null,
    hasExistingPatients: formattedPatients.length > 0,
    existingPatients: formattedPatients,
  };

  if (activeLead) {
    result.id = activeLead.id;
    result.name = activeLead.name;
    result.mobileNorm = activeLead.mobileNorm;
    result.status = activeLead.status;
    result.leadType = activeLead.leadType;
    result.owner = activeLead.owner;
    result.branch = activeLead.branch;
    result.source = activeLead.source;
    result.department = activeLead.department;
    result.createdAt = activeLead.createdAt;
  }

  return result;
}

/**
 * Quick create a new lead with duplicate check, SLA calculation, and round-robin assignment.
 */
export async function quickCreateLead(
  input: CreateLeadInput,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const normMobile = normalizePhoneNumber(input.mobile);
  if (!normMobile) {
    throw new Error('Invalid mobile phone number');
  }

  const isProduct = input.leadType === 'product';

  // Permission check
  if (isProduct) {
    if (!hasPermission(user, Permissions.PRODUCT_LEAD_CREATE)) {
      const error: any = new Error('Access denied to create product leads');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }
  } else {
    if (!hasPermission(user, Permissions.LEAD_CREATE)) {
      const error: any = new Error('Access denied to create treatment leads');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }
  }

  const normAltMobile = input.altMobile ? normalizePhoneNumber(input.altMobile) : null;

  const resolvedPatientId = input.existingPatientId ?? input.existing_patient_id ?? null;
  const isReturningPatient = Boolean(resolvedPatientId);
  const isFamilyMember = Boolean(input.isFamilyMember || input.is_family_member);

  // Duplicate Check: warns across both types without merging, unless explicitly registering a returning patient or family member
  const duplicate = await checkDuplicateLead(normMobile, normAltMobile);
  if (duplicate?.hasActiveLead && !input.overrideDuplicate && !isReturningPatient && !isFamilyMember) {
    const error: any = new Error('Duplicate lead detected: An active enquiry is already in progress');
    error.statusCode = 409;
    error.code = 'DUPLICATE_LEAD';
    error.details = {
      duplicate: true,
      hasActiveLead: true,
      existingLead: {
        id: duplicate.activeLead?.id || duplicate.id,
        name: duplicate.activeLead?.name || duplicate.name,
        mobile: maskPhoneNumber((duplicate.activeLead?.mobileNorm || duplicate.mobileNorm) as string),
        status: duplicate.activeLead?.status || duplicate.status,
        leadType: duplicate.activeLead?.leadType || duplicate.leadType,
        ownerName: duplicate.activeLead?.owner?.name ?? duplicate.owner?.name ?? 'Unassigned',
        branchName: duplicate.activeLead?.branch?.name || duplicate.branch?.name,
        createdAt: duplicate.activeLead?.createdAt || duplicate.createdAt,
      },
    };
    throw error;
  }

  // Resolve sourceId
  const resolvedSourceId = input.sourceId ?? input.source_id;
  let source = resolvedSourceId
    ? await prisma.source.findUnique({ where: { id: resolvedSourceId } })
    : null;
  if (!source) {
    source = await prisma.source.findFirst({ where: { active: true } });
  }
  const sourceId = source?.id || 1;
  const sourceCode = source?.code || 'other';

  // Resolve branchId
  const resolvedBranchId = input.branchId ?? input.branch_id;
  let branchId = resolvedBranchId;
  if (!branchId) {
    const mainBranch = await prisma.branch.findFirst({ where: { code: 'MAIN' } });
    branchId = mainBranch?.id || 1;
  }

  const firstResponseDueAt = await calculateFirstResponseDue(
    sourceCode,
    branchId,
    new Date(),
    isProduct ? 'product' : 'treatment'
  );

  const requestedOwnerId = input.ownerId ?? input.owner_id;
  let assignedOwnerId: number | null = null;

  if (requestedOwnerId) {
    const targetUser = await prisma.user.findFirst({
      where: { id: requestedOwnerId, status: 'active', archivedAt: null },
    });
    if (targetUser) {
      assignedOwnerId = targetUser.id;
    }
  }

  if (assignedOwnerId === null) {
    if (isProduct) {
      if (user.roleCode === 'product_sales_executive') {
        assignedOwnerId = user.id;
      } else {
        assignedOwnerId = await assignProductLeadRoundRobin(branchId);
        if (!assignedOwnerId) assignedOwnerId = user.id;
      }
    } else {
      if (user.roleCode === 'support_telecaller') {
        assignedOwnerId = user.id;
      } else {
        assignedOwnerId = await assignLeadRoundRobin(branchId);
      }
    }
  }

  // Determine initial priority: Ad leads < 24h old start as hot
  const normSource = sourceCode.toUpperCase();
  const isAd = normSource === 'META_ADS' || normSource === 'GOOGLE_ADS';
  const priority = isAd ? 'hot' : 'warm';

  // Fallback department for product leads
  let departmentId = input.departmentId ?? input.department_id;
  if (!departmentId) {
    const defaultDept = await prisma.department.findFirst({ where: { active: true } });
    departmentId = defaultDept ? defaultDept.id : 1;
  }

  const campaignId = input.campaignId ?? input.campaign_id ?? null;
  const campaignText = input.campaignText ?? input.campaign_text ?? null;
  const referrerText = input.referrerText ?? input.referrer_text ?? null;
  const productIds = input.productIds ?? input.product_ids;

  let concernText = input.concern ?? '';
  if (isFamilyMember && (input.familyRelation || input.family_relation)) {
    const rel = input.familyRelation || input.family_relation;
    concernText = concernText ? `[Family Member: ${rel}] ${concernText}` : `[Family Member: ${rel}]`;
  }

  const lead = await prisma.lead.create({
    data: {
      leadType: isProduct ? 'product' : 'treatment',
      name: input.name,
      mobile: input.mobile,
      mobileNorm: normMobile,
      altMobile: input.altMobile ?? null,
      altMobileNorm: normAltMobile,
      age: input.age !== undefined && input.age !== null && (input.age as any) !== '' ? Number(input.age) : null,
      location: input.location ?? null,
      language: input.language ?? 'en',
      concern: concernText,
      departmentId,
      sourceId,
      branchId,
      campaignId,
      campaignText,
      referrerText,
      consentCalls: input.consentCalls ?? true,
      consentWhatsapp: input.consentWhatsapp ?? false,
      consentSms: input.consentSms ?? false,
      consentDate: new Date(),
      consentSource: source?.labelEn ?? 'manual',
      status: 'new',
      priority,
      ownerId: assignedOwnerId,
      firstResponseDueAt,
      convertedPatientId: resolvedPatientId,
    },
    include: {
      source: true,
      department: true,
      owner: { select: { id: true, name: true, email: true } },
      branch: { select: { id: true, name: true, code: true } },
      campaign: true,
    },
  });

  // Attach product interests if selected
  if (isProduct && productIds && productIds.length > 0) {
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    for (const prod of products) {
      await prisma.leadProductInterest.create({
        data: {
          leadId: lead.id,
          productId: prod.id,
          quantity: 1,
          unitPriceAtTime: prod.price,
          status: 'interested',
          origin: 'selected',
          prescriptionVerified: false,
          waitlisted: prod.stockStatus === 'out_of_stock',
          addedById: user.id,
        },
      });
      if (prod.stockStatus === 'out_of_stock') {
        await prisma.productWaitlist.upsert({
          where: {
            leadId_productId: {
              leadId: lead.id,
              productId: prod.id,
            },
          },
          create: {
            leadId: lead.id,
            productId: prod.id,
          },
          update: {},
        });
      }
    }
  }

  // Add short note if provided
  if (input.note && input.note.trim()) {
    await prisma.interaction.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        type: 'note',
        direction: 'inbound',
        note: input.note.trim(),
        occurredAt: new Date(),
      },
    });
  }

  // Notify assigned owner and create initial calling task
  if (assignedOwnerId) {
    await prisma.notification.create({
      data: {
        userId: assignedOwnerId,
        type: 'lead_assigned',
        title: isProduct ? 'New Product Lead Assigned' : 'New Lead Assigned',
        body: `You have been assigned new ${isProduct ? 'product ' : ''}lead: ${lead.name} (${source?.labelEn || 'Direct'}).`,
        link: `/leads/${lead.id}`,
      },
    });
  }

  // Audit log
  await recordAuditLog({
    userId: user.id,
    action: isProduct ? 'PRODUCT_LEAD_CREATED' : 'LEAD_CREATED',
    entity: 'lead',
    entityId: lead.id,
    after: {
      id: lead.id,
      name: lead.name,
      leadType: lead.leadType,
      ownerId: lead.ownerId,
      source: sourceCode,
      overrideDuplicate: input.overrideDuplicate,
      overrideReason: input.overrideReason,
    },
    ip,
    userAgent,
  });

  return lead;
}

/**
 * List leads respecting scopeWhere and search filters.
 */
export async function listLeads(
  params: ListLeadsParams,
  user: UserContext
) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const hasTreatmentView = hasPermission(user, Permissions.LEAD_VIEW);
  const hasProductView = hasPermission(user, Permissions.PRODUCT_LEAD_VIEW);

  let targetLeadType: 'treatment' | 'product';

  if (params.leadType) {
    if (params.leadType === 'product') {
      if (!hasProductView) {
        return { leads: [], pagination: { total: 0, page, pageSize, totalPages: 0 } };
      }
      targetLeadType = 'product';
    } else {
      if (!hasTreatmentView) {
        return { leads: [], pagination: { total: 0, page, pageSize, totalPages: 0 } };
      }
      targetLeadType = 'treatment';
    }
  } else {
    if (hasProductView && !hasTreatmentView) {
      targetLeadType = 'product';
    } else if (hasTreatmentView) {
      targetLeadType = 'treatment';
    } else {
      return { leads: [], pagination: { total: 0, page, pageSize, totalPages: 0 } };
    }
  }

  const scope = targetLeadType === 'product'
    ? scopeWhere(user, 'product_lead', Permissions.PRODUCT_LEAD_VIEW)
    : scopeWhere(user, 'lead', Permissions.LEAD_VIEW);

  const where: any = {
    ...scope,
    leadType: targetLeadType,
    archivedAt: null,
  };

  if (params.status) {
    if (params.status === 'active') {
      where.status = { in: ['new', 'contacted', 'qualified', 'appointment_booked', 'not_reachable'] };
    } else if (params.status !== 'all') {
      where.status = params.status;
    }
  } else {
    // Default to active leads only for zero-clutter telecaller desk experience
    where.status = { in: ['new', 'contacted', 'qualified', 'appointment_booked', 'not_reachable'] };
  }
  if (params.sourceId) {
    where.sourceId = params.sourceId;
  }
  if (params.departmentId) {
    where.departmentId = params.departmentId;
  }
  if (params.branchId) {
    where.branchId = params.branchId;
  }
  if (params.unassigned) {
    where.ownerId = null;
  } else if (params.ownerId) {
    where.ownerId = params.ownerId;
  }
  if (params.priority) {
    where.priority = params.priority;
  }
  if (params.language) {
    where.language = params.language;
  }
  if (params.campaignId) {
    where.campaignId = params.campaignId;
  }
  if (params.productId) {
    where.productInterests = { some: { productId: params.productId } };
  }
  if (params.categoryId) {
    where.productInterests = { some: { product: { categoryId: params.categoryId } } };
  }
  if (params.stockAffected) {
    where.productInterests = { some: { product: { stockStatus: 'out_of_stock' } } };
  }
  if (params.testimonials === 'sent') {
    where.testimonialsSentCount = { gt: 0 };
  } else if (params.testimonials === 'not_sent') {
    where.testimonialsSentCount = 0;
  }

  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) where.createdAt.gte = new Date(params.startDate);
    if (params.endDate) where.createdAt.lte = new Date(params.endDate);
  }

  if (params.search) {
    const term = params.search.trim();
    const normalizedTerm = normalizePhoneNumber(term);
    where.OR = [
      { name: { contains: term } },
      { concern: { contains: term } },
      { mobile: { contains: term } },
      { mobileNorm: { contains: term } },
    ];
    if (normalizedTerm) {
      where.OR.push({ mobileNorm: { contains: normalizedTerm } });
    }
  }

  // Default LIFO: Last entered leads show first
  let orderBy: any[] = [
    { createdAt: 'desc' },
  ];

  if (params.sortBy === 'testimonials_last_sent_at') {
    orderBy = [
      { testimonialsLastSentAt: params.sortOrder || 'desc' },
      { createdAt: 'desc' },
    ];
  } else if (params.sortBy === 'first_response_due_at') {
    orderBy = [
      { firstResponseDueAt: params.sortOrder || 'asc' },
      { createdAt: 'desc' },
    ];
  } else if (params.sortBy === 'created_at') {
    orderBy = [{ createdAt: params.sortOrder || 'desc' }];
  }

  const statsWhere = { ...where };
  delete statsWhere.status;

  const [total, rawLeads, statusGrouping] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: {
        source: { select: { id: true, code: true, labelEn: true, labelMl: true } },
        department: { select: { id: true, code: true, labelEn: true, labelMl: true } },
        owner: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, code: true, name: true } },
        campaign: { select: { id: true, name: true, channel: true } },
        _count: { select: { interactions: true } },
        productInterests: {
          include: {
            product: { select: { id: true, sku: true, name: true, price: true, stockStatus: true } },
          },
        },
      },
    }),
    prisma.lead.groupBy({
      by: ['status'],
      where: statsWhere,
      _count: { _all: true },
    }),
  ]);

  const stats: Record<string, number> = {
    all: 0,
    active: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    appointment_booked: 0,
    converted: 0,
    not_reachable: 0,
    not_interested: 0,
  };

  for (const group of statusGrouping) {
    stats[group.status] = group._count._all;
    stats.all += group._count._all;
  }

  stats.active =
    (stats.new || 0) +
    (stats.contacted || 0) +
    (stats.qualified || 0) +
    (stats.appointment_booked || 0) +
    (stats.not_reachable || 0);

  const leads = rawLeads.map((l) => {
    if (user.maskPhone) {
      return {
        ...l,
        mobile: maskPhoneNumber(l.mobileNorm),
        altMobile: l.altMobileNorm ? maskPhoneNumber(l.altMobileNorm) : null,
      };
    }
    return l;
  });

  return {
    leads,
    stats,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Get lead details with scope checking and leadType isolation.
 */
export async function getLeadById(id: number, user: UserContext, ip?: string, userAgent?: string) {
  // 1. Fetch raw lead existence to check authorization & leadType
  const rawLead = await prisma.lead.findUnique({
    where: { id },
    select: { id: true, leadType: true, ownerId: true, branchId: true, archivedAt: true },
  });

  if (!rawLead || rawLead.archivedAt !== null) {
    const notFound: any = new Error('Lead not found');
    notFound.statusCode = 404;
    throw notFound;
  }

  // 2. Determine permissions and scope
  let isAuthorized = false;
  if (rawLead.leadType === 'product') {
    const scope = getEffectiveScope(user, Permissions.PRODUCT_LEAD_VIEW);
    if (scope === 'all') isAuthorized = true;
    else if (scope === 'branch' && user.branchIds.includes(rawLead.branchId)) isAuthorized = true;
    else if (scope === 'team') {
      if (rawLead.ownerId === user.id) isAuthorized = true;
      else if (rawLead.ownerId) {
        const ownerTeams = await prisma.userTeam.findMany({
          where: { userId: rawLead.ownerId },
          include: { team: true },
        });
        if (ownerTeams.some((ut) => user.teamCodes.includes(ut.team.code))) isAuthorized = true;
      }
    } else if (scope === 'own' && rawLead.ownerId === user.id) {
      isAuthorized = true;
    }
  } else {
    // treatment lead
    const scope = getEffectiveScope(user, Permissions.LEAD_VIEW);
    if (scope === 'all') isAuthorized = true;
    else if (scope === 'branch' && user.branchIds.includes(rawLead.branchId)) isAuthorized = true;
    else if (scope === 'team') {
      if (rawLead.ownerId === user.id) isAuthorized = true;
      else if (rawLead.ownerId) {
        const ownerTeams = await prisma.userTeam.findMany({
          where: { userId: rawLead.ownerId },
          include: { team: true },
        });
        if (ownerTeams.some((ut) => user.teamCodes.includes(ut.team.code))) isAuthorized = true;
      }
    } else if (scope === 'own' && rawLead.ownerId === user.id) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    await recordAuditLog({
      userId: user.id,
      action: 'OUT_OF_SCOPE_LEAD_ACCESS_BLOCKED',
      entity: 'lead',
      entityId: id,
      ip,
      userAgent,
    });
    const error: any = new Error('Access denied to lead');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const lead = await prisma.lead.findFirst({
    where: { id },
    include: {
      source: true,
      department: true,
      owner: { select: { id: true, name: true, email: true } },
      branch: true,
      closedReason: true,
      campaign: true,
      referredFromLead: { select: { id: true, name: true, leadType: true } },
      referredLeads: { select: { id: true, name: true, leadType: true } },
      productInterests: {
        orderBy: { createdAt: 'desc' },
        include: {
          product: true,
        },
      },
      waitlistEntries: {
        include: {
          product: true,
        },
      },
      tasks: {
        where: { archivedAt: null },
        orderBy: { dueAt: 'asc' },
        include: { owner: { select: { id: true, name: true } } },
      },
      interactions: {
        where: { archivedAt: null },
        orderBy: { occurredAt: 'desc' },
        include: {
          user: { select: { id: true, name: true } },
          outcome: true,
        },
      },
      appointments: {
        orderBy: { startsAt: 'desc' },
      },
    },
  });

  if (!lead) {
    const notFound: any = new Error('Lead not found');
    notFound.statusCode = 404;
    throw notFound;
  }

  // Audit lead open
  await recordAuditLog({
    userId: user.id,
    action: lead.leadType === 'product' ? 'PRODUCT_LEAD_OPENED' : 'LEAD_OPENED',
    entity: 'lead',
    entityId: lead.id,
    ip,
    userAgent,
  });

  if (user.maskPhone) {
    return {
      ...lead,
      mobile: maskPhoneNumber(lead.mobileNorm),
      altMobile: lead.altMobileNorm ? maskPhoneNumber(lead.altMobileNorm) : null,
    };
  }

  return lead;
}

/**
 * Update lead details.
 */
export async function updateLead(
  id: number,
  data: any,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const lead = await getLeadById(id, user, ip, userAgent);

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.mobile !== undefined) {
    updateData.mobile = data.mobile;
    updateData.mobileNorm = normalizePhoneNumber(data.mobile);
  }
  if (data.age !== undefined) {
    updateData.age = data.age !== null && (data.age as any) !== '' ? Number(data.age) : null;
  }
  if (data.location !== undefined) {
    updateData.location = data.location ?? null;
  }
  if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
  if (data.sourceId !== undefined) updateData.sourceId = data.sourceId;
  if (data.language !== undefined) updateData.language = data.language;
  if (data.concern !== undefined) updateData.concern = data.concern;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.consentCalls !== undefined) updateData.consentCalls = data.consentCalls;
  if (data.consentWhatsapp !== undefined) updateData.consentWhatsapp = data.consentWhatsapp;
  if (data.consentSms !== undefined) updateData.consentSms = data.consentSms;
  if (data.doNotContact !== undefined) updateData.doNotContact = data.doNotContact;

  if (data.altMobile !== undefined) {
    updateData.altMobile = data.altMobile;
    updateData.altMobileNorm = data.altMobile ? normalizePhoneNumber(data.altMobile) : null;
  }

  if (data.testimonialsSent !== undefined) {
    updateData.testimonialsSentCount = data.testimonialsSent ? 1 : 0;
    updateData.testimonialsLastSentAt = data.testimonialsSent ? new Date() : null;
  }

  const updated = await prisma.lead.update({
    where: { id },
    data: updateData,
    include: {
      source: true,
      department: true,
      owner: { select: { id: true, name: true, email: true } },
      branch: true,
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: 'LEAD_UPDATED',
    entity: 'lead',
    entityId: id,
    before: { name: lead.name, priority: lead.priority, concern: lead.concern },
    after: { name: updated.name, priority: updated.priority, concern: updated.concern },
    ip,
    userAgent,
  });

  return updated;
}

/**
 * Assign or reassign lead to another user.
 */
export async function assignLead(
  id: number,
  newOwnerId: number,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const lead = await getLeadById(id, user, ip, userAgent);

  const targetUser = await prisma.user.findUnique({
    where: { id: newOwnerId },
    include: { role: true },
  });

  if (!targetUser || targetUser.status !== 'active') {
    const error: any = new Error('Assigned user must be active');
    error.statusCode = 400;
    throw error;
  }

  const updated = await prisma.lead.update({
    where: { id },
    data: { ownerId: newOwnerId },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });

  // Transfer any open tasks to the new telecaller
  const openTasks = await prisma.task.findMany({
    where: { leadId: id, status: 'open' },
  });

  if (openTasks.length > 0) {
    await prisma.task.updateMany({
      where: { leadId: id, status: 'open' },
      data: { ownerId: newOwnerId },
    });
  }

  await prisma.notification.create({
    data: {
      userId: newOwnerId,
      type: 'lead_assigned',
      title: 'Lead Reassigned',
      body: `Lead ${lead.name} has been reassigned to you by ${user.name}.`,
      link: `/leads/${lead.id}`,
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: 'LEAD_REASSIGNED',
    entity: 'lead',
    entityId: id,
    before: { ownerId: lead.ownerId },
    after: { ownerId: newOwnerId },
    ip,
    userAgent,
  });

  return updated;
}

/**
 * Close lead with mandatory closedReasonId.
 */
export async function closeLead(
  id: number,
  closedReasonId: number,
  note: string | undefined,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const lead = await getLeadById(id, user, ip, userAgent);

  const reason = await prisma.lostReason.findUnique({
    where: { id: closedReasonId },
  });

  if (!reason) {
    const error: any = new Error('Invalid closed reason');
    error.statusCode = 400;
    throw error;
  }

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      status: 'not_interested',
      closedReasonId,
      closedAt: new Date(),
    },
    include: { closedReason: true },
  });

  // Cancel any open tasks
  await prisma.task.updateMany({
    where: {
      leadId: id,
      status: 'open',
    },
    data: {
      status: 'cancelled',
    },
  });

  // Record closure interaction
  await prisma.interaction.create({
    data: {
      type: 'status_change',
      direction: 'outbound',
      userId: user.id,
      leadId: id,
      note: `Closed with reason: ${reason.labelEn}. ${note ? 'Note: ' + note : ''}`,
      occurredAt: new Date(),
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: 'LEAD_CLOSED',
    entity: 'lead',
    entityId: id,
    after: { closedReasonId, reason: reason.labelEn, note },
    ip,
    userAgent,
  });

  return updated;
}

/**
 * Emergency redirect: sets flag, creates high-priority alert for branch duty nurses.
 */
export async function emergencyRedirectLead(
  id: number,
  note: string,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const lead = await getLeadById(id, user, ip, userAgent);

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      emergencyFlag: true,
      priority: 'hot',
    },
  });

  // Find branch duty nurses
  const dutyNurses = await prisma.user.findMany({
    where: {
      dutyNurse: true,
      status: 'active',
      userBranches: { some: { branchId: lead.branchId } },
    },
  });

  for (const nurse of dutyNurses) {
    await prisma.notification.create({
      data: {
        userId: nurse.id,
        type: 'emergency',
        title: `🚨 Emergency Redirect: ${lead.name}`,
        body: `Emergency redirection triggered. Reason: ${note}. Contact: ${lead.mobile}`,
        link: `/leads/${lead.id}`,
      },
    });
  }

  // Find Emergency Redirected outcome
  const outcome = await prisma.callOutcome.findFirst({
    where: {
      OR: [{ code: 'EMERGENCY_REDIRECTED' }, { code: 'emergency_redirected' }],
    },
  });

  await prisma.interaction.create({
    data: {
      type: 'call',
      direction: 'outbound',
      userId: user.id,
      leadId: id,
      outcomeId: outcome?.id,
      note: `EMERGENCY REDIRECT: ${note}`,
      occurredAt: new Date(),
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: 'LEAD_EMERGENCY_REDIRECT',
    entity: 'lead',
    entityId: id,
    after: { note, dutyNursesNotified: dutyNurses.length },
    ip,
    userAgent,
  });

  return {
    success: true,
    lead: updated,
    dutyNursesNotified: dutyNurses.length,
  };
}

/**
 * Books an appointment for a lead, cancels open previous cadence tasks,
 * schedules 24h & 2h reminder tasks, and schedules +1h missed-recovery task.
 */
export async function bookAppointmentForLead(
  leadId: number,
  input: {
    doctorName: string;
    startsAt: string;
    branchId?: number;
    note?: string;
  },
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const lead = await getLeadById(leadId, user);
  const appointmentTime = new Date(input.startsAt);
  const branchId = input.branchId || lead.branchId;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Appointment record
    const appointment = await tx.appointment.create({
      data: {
        leadId: lead.id,
        branchId,
        doctorName: input.doctorName,
        startsAt: appointmentTime,
        status: 'booked',
        createdBy: user.id,
      },
    });

    // 2. Update Lead status to 'appointment_booked'
    const updatedLead = await tx.lead.update({
      where: { id: lead.id },
      data: {
        status: 'appointment_booked',
        priority: 'hot', // appointment requested leads are 'hot'
      },
    });

    // 3. Cancel open tasks from previous cadence (Acceptance Test 5 requirement!)
    await cancelOpenCadenceTasks(tx, 'lead', lead.id);

    // Clean doctor name to avoid duplicate prefix like "Dr. Dr. Suresh Kumar"
    const cleanDoctorName = input.doctorName.replace(/^Dr\.?\s*/i, '');
    const doctorDisplay = `Dr. ${cleanDoctorName}`;
    const now = new Date();

    const timezone = (lead as any).branch?.timezone || 'Asia/Kolkata';

    // 4. Create the 3 Appointment Reminders/Follow-ups per Hospital Workflow:
    // Reminder A: 24h before (only if there is more than 24 hours to the appointment)
    const due24h = addHours(appointmentTime, -24);
    if (due24h > now) {
      await tx.task.create({
        data: {
          type: 'reminder',
          title: `Appointment Reminder (24h before): ${lead.name} with ${doctorDisplay}`,
          dueAt: due24h,
          priority: 'hot',
          ownerId: lead.ownerId ?? user.id,
          leadId: lead.id,
          cadenceKey: 'appointment.reminders',
          cadenceStep: 1,
          status: 'open',
        },
      });
    }

    // Reminder B: Appointment day morning at 9:00 AM (only if 9 AM on appointment day is in the future)
    const zonedAppointment = toZonedTime(appointmentTime, timezone);
    const zonedMorning9am = setMilliseconds(setSeconds(setMinutes(setHours(zonedAppointment, 9), 0), 0), 0);
    const dueMorning9am = fromZonedTime(zonedMorning9am, timezone);
    if (dueMorning9am > now) {
      await tx.task.create({
        data: {
          type: 'reminder',
          title: `Appointment Reminder (Morning 9 AM): ${lead.name} with ${doctorDisplay}`,
          dueAt: dueMorning9am,
          priority: 'hot',
          ownerId: lead.ownerId ?? user.id,
          leadId: lead.id,
          cadenceKey: 'appointment.reminders',
          cadenceStep: 2,
          status: 'open',
        },
      });
    }

    // Reminder C: 5 hours after appointment. If after working hours (>= 20:00 / 8 PM) or before opening (< 09:00), move to next day morning at 9:00 AM
    const rawPost5h = addHours(appointmentTime, 5);
    const zonedPost5h = toZonedTime(rawPost5h, timezone);
    const postHour = zonedPost5h.getHours();

    let finalPostDue: Date;
    if (postHour >= 20 || postHour < 9) {
      // Move to next day (or same day if before 9am) at 09:00 AM
      const targetDay = postHour >= 20 ? addDays(zonedPost5h, 1) : zonedPost5h;
      const nextMorning9am = setMilliseconds(setSeconds(setMinutes(setHours(targetDay, 9), 0), 0), 0);
      finalPostDue = fromZonedTime(nextMorning9am, timezone);
    } else {
      finalPostDue = rawPost5h;
    }

    await tx.task.create({
      data: {
        type: 'call',
        title: `Post-Appointment Follow-up (+5h): Attendance & Consultation check for ${lead.name}`,
        dueAt: finalPostDue,
        priority: 'hot',
        ownerId: lead.ownerId ?? user.id,
        leadId: lead.id,
        cadenceKey: 'appointment.post_visit',
        cadenceStep: 1,
        status: 'open',
      },
    });

    // 6. Record interaction
    await tx.interaction.create({
      data: {
        type: 'status_change',
        direction: 'outbound',
        userId: user.id,
        leadId: lead.id,
        note: `Appointment booked with ${doctorDisplay} at ${input.startsAt}. ${input.note ? 'Note: ' + input.note : ''}`,
        occurredAt: new Date(),
      },
    });

    return { appointment, lead: updatedLead };
  });

  await recordAuditLog({
    userId: user.id,
    action: 'LEAD_APPOINTMENT_BOOKED',
    entity: 'lead',
    entityId: lead.id,
    after: { appointmentId: result.appointment.id, startsAt: input.startsAt, doctorName: input.doctorName },
    ip,
    userAgent,
  });

  return result;
}

/**
 * Converts a lead to a Patient and Case when marked Visited.
 * Cancels all open tasks on the lead, sets lead status to 'converted',
 * updates booked appointments to 'visited', and records visit interaction and audit log.
 */
export async function convertLead(
  leadId: number,
  input: {
    patientCode?: string;
    dateOfBirth?: string | null;
    treatingDoctorId?: number | null;
    departmentId?: number | null;
    note?: string;
    decision?: 'in_patient' | 'consultation_only' | 'opd_course';
    estimatedAmount?: number | null;
    schedule?: {
      therapyId?: number | null;
      frequencyType?: 'daily' | 'weekly' | 'alternate_days' | 'custom_weekdays' | 'custom_dates';
      totalSessions?: number;
      startDate?: string;
      windowStart?: string;
      windowEnd?: string;
      weekdays?: number[];
    };
  },
  user: UserContext,
  ip?: string,
  userAgent?: string
): Promise<{ lead: any; patient: any; case: any; redirectUrl: string }> {
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      archivedAt: null,
      ...scopeWhere(user, 'lead', Permissions.LEAD_EDIT),
    },
  });

  if (!lead) {
    const exists = await prisma.lead.findUnique({ where: { id: leadId } });
    if (exists) {
      await recordAuditLog({
        userId: user.id,
        action: 'ACCESS_DENIED',
        entity: 'lead',
        entityId: leadId,
        ip,
        userAgent,
      });
      const err = new Error('Forbidden: Out of scope access');
      (err as any).statusCode = 403;
      (err as any).code = 'FORBIDDEN';
      throw err;
    }
    const err = new Error('Lead not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  if (lead.status === 'converted') {
    const existingCase = await prisma.case.findFirst({
      where: { leadId: lead.id, archivedAt: null },
      include: { patient: true },
    });
    const err = new Error('Lead has already been converted');
    (err as any).statusCode = 400;
    (err as any).code = 'ALREADY_CONVERTED';
    (err as any).details = { caseId: existingCase?.id, patientId: existingCase?.patientId };
    throw err;
  }

  const result = await prisma.$transaction(async (tx: any) => {
    // 1. Find or create patient
    let patient: any = null;

    if (lead.convertedPatientId) {
      patient = await tx.patient.findFirst({
        where: {
          id: lead.convertedPatientId,
          archivedAt: null,
        },
      });
    }

    if (!patient) {
      // Look up patient matching both mobileNorm AND name to distinguish family members sharing a mobile
      const candidates = await tx.patient.findMany({
        where: {
          mobileNorm: lead.mobileNorm,
          branchId: lead.branchId,
          archivedAt: null,
        },
      });
      patient = candidates.find((p: any) => p.name.trim().toLowerCase() === lead.name.trim().toLowerCase()) || null;
    }

    if (!patient) {
      const now = new Date();
      const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      let generatedCode = input.patientCode;
      if (!generatedCode) {
        const timePart = Date.now().toString().slice(-6);
        const randPart = Math.floor(1000 + Math.random() * 9000);
        generatedCode = `PAT-${yearMonth}-${timePart}${randPart}`;
      }

      patient = await tx.patient.create({
        data: {
          patientCode: generatedCode,
          name: lead.name,
          mobileNorm: lead.mobileNorm,
          language: lead.language,
          branchId: lead.branchId,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        },
      });
    }

    // 2. Determine clinical path based on doctor's decision
    const decision = input.decision || 'consultation_only';
    let careType = 'consultation_only';
    let stage = 'completed';
    let team = 'aftercare';
    let advisedAdmission = false;
    let redirectUrl = '/aftercare';

    if (decision === 'in_patient') {
      careType = 'in_patient';
      stage = 'counseling_estimate';
      team = 'admission';
      advisedAdmission = true;
      redirectUrl = '/admission';
    } else if (decision === 'opd_course') {
      careType = 'opd_course';
      stage = 'in_treatment';
      team = 'treatment';
      advisedAdmission = false;
      redirectUrl = '/doctor';
    } else {
      careType = 'consultation_only';
      stage = 'completed';
      team = 'aftercare';
      advisedAdmission = false;
      redirectUrl = '/aftercare';
    }

    // Safely verify if treatingDoctorId is a valid User id in the DB (cases.treating_doctor_id is a FK to users.id)
    let safeTreatingDoctorUserId: number | null = null;
    if (input.treatingDoctorId) {
      const docUser = await tx.user.findFirst({
        where: { id: input.treatingDoctorId, status: 'active' },
        select: { id: true },
      });
      if (docUser) {
        safeTreatingDoctorUserId = docUser.id;
      }
    }

    // Safely resolve departmentId (cases.department_id is NOT NULL in database)
    let caseDepartmentId: number | null = input.departmentId || lead.departmentId || null;
    if (caseDepartmentId) {
      const existsDept = await tx.department.findUnique({ where: { id: caseDepartmentId } });
      if (!existsDept) caseDepartmentId = null;
    }
    if (!caseDepartmentId && safeTreatingDoctorUserId) {
      const docUser = await tx.user.findFirst({
        where: { id: safeTreatingDoctorUserId },
        select: { departmentId: true },
      });
      if (docUser?.departmentId) {
        const existsDept = await tx.department.findUnique({ where: { id: docUser.departmentId } });
        if (existsDept) caseDepartmentId = docUser.departmentId;
      }
    }
    if (!caseDepartmentId) {
      const defaultDept = await tx.department.findFirst({
        where: { active: true },
        orderBy: { sort: 'asc' },
      });
      caseDepartmentId = defaultDept?.id || 1;
    }

    const doctorNote = (input as any).doctorName
      ? `Treating Doctor: ${(input as any).doctorName}${input.note ? ' | ' + input.note : ''}`
      : input.note || null;

    // Create Case
    const patientCase = await tx.case.create({
      data: {
        patientId: patient.id,
        leadId: lead.id,
        branchId: lead.branchId,
        stage,
        careType,
        advisedAdmission,
        estimatedAmount: input.estimatedAmount || null,
        departmentId: caseDepartmentId,
        treatingDoctorId: safeTreatingDoctorUserId,
        ownerId: lead.ownerId,
        team,
        consultationCompletedAt: new Date(),
      },
      include: {
        patient: true,
        department: true,
        branch: true,
        owner: { select: { id: true, name: true, email: true } },
        treatingDoctor: { select: { id: true, name: true, email: true } },
      },
    });

    // If periodic OPD course treatment, generate therapy session visits
    if (decision === 'opd_course') {
      const therapy = input.schedule?.therapyId
        ? await tx.therapy.findUnique({ where: { id: input.schedule.therapyId } })
        : await tx.therapy.findFirst({ where: { active: true }, orderBy: { sort: 'asc' } });

      if (therapy) {
        const sched = input.schedule || {};
        const config = await getBranchScheduleConfig(lead.branchId);
        const startDate = sched.startDate || new Date().toISOString().split('T')[0];
        const totalSessions = sched.totalSessions || 7;
        const frequencyType = sched.frequencyType || 'daily';
        const windowStart = sched.windowStart || '09:00';
        const windowEnd = sched.windowEnd || '10:00';

        const generatedVisits = generateScheduleVisits({
          startDate,
          totalSessions,
          frequencyType,
          weekdays: sched.weekdays,
          windowStart,
          windowEnd,
          config,
        });

        await tx.visitSchedule.create({
          data: {
            caseId: patientCase.id,
            setting: 'opd',
            therapyId: therapy.id,
            frequencyType,
            totalSessions,
            startDate: new Date(startDate),
            windowStart,
            windowEnd,
            doctorId: safeTreatingDoctorUserId,
            createdBy: user.id,
            status: 'active',
            notes: input.note || `Periodic OPD Treatment: ${totalSessions} sessions (${frequencyType})`,
            visits: {
              create: generatedVisits.map((v) => ({
                caseId: patientCase.id,
                sessionNo: v.sessionNo,
                scheduledDate: new Date(v.scheduledDate),
                windowStart: v.windowStart,
                windowEnd: v.windowEnd,
                status: 'planned',
              })),
            },
          },
        });

        await recomputeCaseAdherence(patientCase.id, tx);
      }
    }

    // 3. Update Lead
    const updatedLead = await tx.lead.update({
      where: { id: lead.id },
      data: {
        status: 'converted',
        convertedPatientId: patient.id,
      },
    });

    // 4. Cancel open tasks on lead
    await tx.task.updateMany({
      where: {
        leadId: lead.id,
        status: 'open',
      },
      data: {
        status: 'cancelled',
        updatedAt: new Date(),
      },
    });

    // 5. Update booked appointments to visited and link to case
    await tx.appointment.updateMany({
      where: {
        leadId: lead.id,
        status: 'booked',
      },
      data: {
        status: 'visited',
        caseId: patientCase.id,
      },
    });

    // 6. Record interaction
    const decisionLabels: Record<string, string> = {
      in_patient: 'In-Patient Admission Advised (routed to Admission Desk)',
      consultation_only: 'Consultation Only (completed, routed to Aftercare Desk)',
      opd_course: `Periodic OPD Treatment (${input.schedule?.totalSessions || 7} sessions, routed to Treatment Desk)`,
    };
    const noteContent = doctorNote
      ? `Lead marked visited & converted. Decision: ${decisionLabels[decision] || decision}. ${doctorNote}`
      : `Lead marked visited & converted. Decision: ${decisionLabels[decision] || decision}. Patient ${patient.patientCode} (Case #${patientCase.id})`;

    await tx.interaction.create({
      data: {
        type: 'visit',
        direction: 'inbound',
        userId: user.id,
        leadId: lead.id,
        caseId: patientCase.id,
        note: noteContent,
        occurredAt: new Date(),
      },
    });

    return { lead: updatedLead, patient, case: patientCase, redirectUrl };
  });

  await recordAuditLog({
    userId: user.id,
    action: 'LEAD_CONVERTED',
    entity: 'lead',
    entityId: lead.id,
    before: { status: lead.status },
    after: { status: 'converted', patientId: result.patient.id, caseId: result.case.id },
    ip,
    userAgent,
  });

  return result;
}

/**
 * ==========================================
 * Product Leads & Line Interests Methods
 * ==========================================
 */

export async function getLeadProducts(leadId: number, user: UserContext) {
  // Authorize user against lead
  await getLeadById(leadId, user);

  const lines = await prisma.leadProductInterest.findMany({
    where: { leadId },
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
          price: true,
          stockStatus: true,
          status: true,
          prescriptionRequired: true,
          refillDays: true,
          packSize: true,
          imageUrl: true,
          shortDescription: true,
          usageDescription: true,
          categoryId: true,
          category: { select: { id: true, name: true } },
        },
      },
      addedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  let acceptedTotal = 0;
  let acceptedCount = 0;
  let hasPrescriptionRequired = false;
  let allPrescriptionsVerified = true;

  const enrichedLines = lines.map((line) => {
    const currentPrice = Number(line.product.price);
    const lockedPrice = Number(line.unitPriceAtTime);
    const priceChanged = currentPrice !== lockedPrice;

    if (line.status === 'accepted') {
      acceptedTotal += lockedPrice * line.quantity;
      acceptedCount++;
      if (line.product.prescriptionRequired) {
        hasPrescriptionRequired = true;
        if (!line.prescriptionVerified) {
          allPrescriptionsVerified = false;
        }
      }
    }

    return {
      ...line,
      currentPrice,
      priceChanged,
    };
  });

  return {
    lines: enrichedLines,
    summary: {
      totalLines: enrichedLines.length,
      acceptedCount,
      acceptedTotal: Math.round(acceptedTotal * 100) / 100,
      hasPrescriptionRequired,
      allPrescriptionsVerified,
    },
  };
}

export async function addLeadProductInterest(
  leadId: number,
  input: any,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const lead = await getLeadById(leadId, user);

  const productId = input.productId ?? input.product_id;
  if (!productId) {
    const error: any = new Error('Product ID is required');
    error.statusCode = 400;
    throw error;
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product || product.archivedAt || product.status !== ProductStatuses.APPROVED) {
    const error: any = new Error('Product is not approved or is archived and cannot be added to a lead');
    error.statusCode = 400;
    error.code = 'PRODUCT_NOT_AVAILABLE';
    throw error;
  }

  const quantity = Math.max(1, input.quantity ?? 1);
  const unitPriceAtTime =
    input.unitPriceAtTime !== undefined
      ? input.unitPriceAtTime
      : input.unit_price_at_time !== undefined
      ? input.unit_price_at_time
      : product.price;

  const isOos = product.stockStatus === StockStatuses.OUT_OF_STOCK;
  const waitlisted = input.waitlisted === true || isOos;

  const result = await prisma.$transaction(async (tx) => {
    const interest = await tx.leadProductInterest.create({
      data: {
        leadId,
        productId,
        quantity,
        unitPriceAtTime,
        status: input.status ?? 'interested',
        origin: input.origin ?? 'selected',
        prescriptionVerified: input.prescriptionVerified ?? input.prescription_verified ?? false,
        declinedReason: input.declinedReason ?? input.declined_reason ?? null,
        waitlisted,
        note: input.note ?? null,
        addedById: user.id,
      },
      include: {
        product: true,
      },
    });

    if (waitlisted) {
      await tx.productWaitlist.upsert({
        where: {
          leadId_productId: {
            leadId,
            productId,
          },
        },
        create: {
          leadId,
          productId,
        },
        update: {},
      });
    }

    return interest;
  });

  await recordAuditLog({
    userId: user.id,
    action: 'LEAD_PRODUCT_INTEREST_ADDED',
    entity: 'lead_product_interest',
    entityId: result.id,
    after: result,
    ip,
    userAgent,
  });

  return result;
}

export async function updateLeadProductInterest(
  id: number,
  input: any,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const existing = await prisma.leadProductInterest.findUnique({
    where: { id },
    include: { product: true, lead: true },
  });

  if (!existing) {
    const error: any = new Error('Lead product interest line not found');
    error.statusCode = 404;
    throw error;
  }

  // Authorize user against lead
  await getLeadById(existing.leadId, user);

  const data: any = {};
  if (input.quantity !== undefined) data.quantity = Math.max(1, input.quantity);
  if (input.status !== undefined) data.status = input.status;
  if (input.prescriptionVerified !== undefined || input.prescription_verified !== undefined) {
    data.prescriptionVerified = input.prescriptionVerified ?? input.prescription_verified;
  }
  if (input.declinedReason !== undefined || input.declined_reason !== undefined) {
    data.declinedReason = input.declinedReason ?? input.declined_reason;
  }
  if (input.note !== undefined) data.note = input.note;

  // Handle waitlisting
  if (input.waitlisted !== undefined) {
    data.waitlisted = input.waitlisted;
  }

  // Optional price update action: "A banner warns the caller if the catalog price has changed since a line was added, with an Update price action."
  if (input.updatePriceToCurrent === true || input.update_price_to_current === true) {
    data.unitPriceAtTime = existing.product.price;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const line = await tx.leadProductInterest.update({
      where: { id },
      data,
      include: { product: true },
    });

    if (data.waitlisted === true) {
      await tx.productWaitlist.upsert({
        where: {
          leadId_productId: {
            leadId: existing.leadId,
            productId: existing.productId,
          },
        },
        create: {
          leadId: existing.leadId,
          productId: existing.productId,
        },
        update: {},
      });
    }

    return line;
  });

  await recordAuditLog({
    userId: user.id,
    action: 'LEAD_PRODUCT_INTEREST_UPDATED',
    entity: 'lead_product_interest',
    entityId: id,
    before: existing,
    after: updated,
    ip,
    userAgent,
  });

  return updated;
}

export async function waitlistLeadProduct(
  id: number,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const existing = await prisma.leadProductInterest.findUnique({
    where: { id },
    include: { product: true },
  });

  if (!existing) {
    const error: any = new Error('Lead product interest line not found');
    error.statusCode = 404;
    throw error;
  }

  await getLeadById(existing.leadId, user);

  await prisma.$transaction(async (tx) => {
    await tx.leadProductInterest.update({
      where: { id },
      data: { waitlisted: true },
    });

    await tx.productWaitlist.upsert({
      where: {
        leadId_productId: {
          leadId: existing.leadId,
          productId: existing.productId,
        },
      },
      create: {
        leadId: existing.leadId,
        productId: existing.productId,
      },
      update: {},
    });
  });

  await recordAuditLog({
    userId: user.id,
    action: 'LEAD_PRODUCT_WAITLISTED',
    entity: 'lead_product_interest',
    entityId: id,
    after: { productId: existing.productId, leadId: existing.leadId },
    ip,
    userAgent,
  });

  return { success: true, waitlisted: true };
}

export async function referLeadToTreatment(
  leadId: number,
  input: { concern: string; departmentId?: number },
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const productLead = await getLeadById(leadId, user);

  // Determine treatment department
  let departmentId = input.departmentId;
  if (!departmentId) {
    const defaultDept = await prisma.department.findFirst({
      where: { active: true },
      orderBy: { id: 'asc' },
    });
    departmentId = defaultDept ? defaultDept.id : 1;
  }

  // Assign treatment lead via round robin
  const assignedOwnerId = await assignLeadRoundRobin(productLead.branchId);

  const treatmentLead = await prisma.$transaction(async (tx) => {
    // 1. Create linked treatment lead
    const created = await tx.lead.create({
      data: {
        leadType: 'treatment',
        referredFromLeadId: leadId,
        name: productLead.name,
        mobile: productLead.mobile,
        mobileNorm: productLead.mobileNorm,
        altMobile: productLead.altMobile,
        altMobileNorm: productLead.altMobileNorm,
        language: productLead.language,
        concern: input.concern.trim(),
        departmentId,
        sourceId: productLead.sourceId,
        branchId: productLead.branchId,
        status: 'new',
        priority: 'warm',
        ownerId: assignedOwnerId,
        consentCalls: productLead.consentCalls,
        consentWhatsapp: productLead.consentWhatsapp,
        consentSms: productLead.consentSms,
        consentDate: new Date(),
        consentSource: 'referral_from_product_desk',
      },
    });

    // 2. Interaction on product lead
    await tx.interaction.create({
      data: {
        leadId,
        userId: user.id,
        type: 'note',
        direction: 'inbound',
        note: `Referred to treatment desk (Linked Treatment Lead #${created.id}): ${input.concern.trim()}`,
        occurredAt: new Date(),
      },
    });

    // 3. Interaction on treatment lead
    await tx.interaction.create({
      data: {
        leadId: created.id,
        userId: user.id,
        type: 'note',
        direction: 'inbound',
        note: `Referred from Product Sales Lead #${leadId}: ${input.concern.trim()}`,
        occurredAt: new Date(),
      },
    });

    return created;
  });

  await recordAuditLog({
    userId: user.id,
    action: 'LEAD_REFERRED_TO_TREATMENT',
    entity: 'lead',
    entityId: leadId,
    after: {
      referredFromLeadId: leadId,
      newTreatmentLeadId: treatmentLead.id,
      concern: input.concern,
    },
    ip,
    userAgent,
  });

  return {
    success: true,
    treatmentLead,
  };
}

export async function confirmLeadSale(
  leadId: number,
  input: any,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const lead = await getLeadById(leadId, user);

  // 1. Require order reference
  const orderReference = (input.orderReference ?? input.order_reference ?? '').trim();
  if (!orderReference) {
    const error: any = new Error('Order reference is required to confirm a sale');
    error.statusCode = 400;
    error.code = 'ORDER_REFERENCE_REQUIRED';
    throw error;
  }

  // 2. Fetch lines
  const lines = await prisma.leadProductInterest.findMany({
    where: { leadId },
    include: { product: true },
  });

  // Verify and update any rx lines marked in request
  const verifiedLineIds = new Set<number>(
    input.prescriptionVerifiedLines ?? input.prescription_verified_lines ?? []
  );

  const acceptedLines = lines.filter((l) => l.status === 'accepted');
  if (acceptedLines.length === 0) {
    const error: any = new Error('Order Confirmed requires at least one accepted product line');
    error.statusCode = 400;
    error.code = 'NO_ACCEPTED_PRODUCTS';
    throw error;
  }

  // 3. Prescription gate:
  // "If any accepted product has prescription_required, the caller must tick Prescription verified for each such line before saving, or the save is rejected."
  for (const line of acceptedLines) {
    const isRxRequired = line.product.prescriptionRequired;
    const isVerified = line.prescriptionVerified || verifiedLineIds.has(line.id);
    if (isRxRequired && !isVerified) {
      const error: any = new Error(
        `Prescription must be verified for '${line.product.name}' before confirming sale.`
      );
      error.statusCode = 400;
      error.code = 'PRESCRIPTION_VERIFICATION_REQUIRED';
      error.details = {
        unverifiedProductId: line.productId,
        productName: line.product.name,
      };
      throw error;
    }
  }

  // 4. Calculate sale amount (default sum of accepted lines)
  const defaultTotal = acceptedLines.reduce(
    (sum, l) => sum + Number(l.unitPriceAtTime) * l.quantity,
    0
  );
  const saleAmount =
    input.saleAmount !== undefined
      ? input.saleAmount
      : input.sale_amount !== undefined
      ? input.sale_amount
      : defaultTotal;

  const paymentMethod = (input.paymentMethod ?? input.payment_method ?? 'cod').trim();
  const shippingAddress = (input.shippingAddress ?? input.shipping_address ?? lead.location ?? '').trim();

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    // Update lines verified in this payload
    if (verifiedLineIds.size > 0) {
      await tx.leadProductInterest.updateMany({
        where: {
          id: { in: Array.from(verifiedLineIds) },
          leadId,
        },
        data: { prescriptionVerified: true },
      });
    }

    // Update lead
    const updatedLead = await tx.lead.update({
      where: { id: leadId },
      data: {
        saleConfirmedAt: now,
        saleAmount,
        orderReference,
        status: 'converted',
        location: shippingAddress || lead.location,
      },
    });

    // 5. Refill reminder:
    for (const line of acceptedLines) {
      const refillDays = line.product.refillDays;
      if (refillDays && refillDays > 0) {
        const reminderDays = Math.max(1, refillDays - 5);
        const dueAt = new Date(now.getTime() + reminderDays * 24 * 60 * 60 * 1000);

        await tx.task.create({
          data: {
            title: `Refill Reminder: ${line.product.name}`,
            type: 'refill_reminder',
            dueAt,
            leadId,
            ownerId: lead.ownerId || user.id,
            status: 'open',
          },
        });
      }
    }

    // 6. Record interaction note with payment method and shipping address
    const productNames = acceptedLines.map((l) => `${l.product.name} (x${l.quantity})`).join(', ');
    const paymentLabel = paymentMethod === 'upi' ? 'UPI' : paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'COD';
    await tx.interaction.create({
      data: {
        leadId,
        userId: user.id,
        type: 'call',
        direction: 'outbound',
        note: `Order Confirmed (${paymentLabel}). Ref: ${orderReference}. Total: ₹${saleAmount}. Address: ${shippingAddress || 'Not provided'}. Products: ${productNames}`,
        occurredAt: now,
      },
    });

    // 7. Auto-create fulfillment Order record if not existing
    try {
      const phoneNorm = (lead.mobileNorm || normalizePhoneNumber(lead.mobile)) || (lead.mobile ? lead.mobile.replace(/\D/g, '') : '') || 'unknown';
      let customer = await tx.productCustomer.findFirst({
        where: { phoneNorm },
      });
      if (!customer) {
        customer = await tx.productCustomer.create({
          data: {
            name: lead.name,
            phone: lead.mobile,
            phoneNorm,
            address: shippingAddress || 'Address on file',
          },
        });
      }

      const orderPaymentMethod = paymentMethod === 'upi' ? 'upi' : paymentMethod === 'bank_transfer' ? 'prepaid' : 'cod';
      await tx.order.create({
        data: {
          orderNumber: orderReference,
          customerId: customer.id,
          leadId,
          createdById: user.id,
          status: 'order_received',
          paymentMethod: orderPaymentMethod,
          paymentStatus: orderPaymentMethod === 'cod' ? 'cod_pending' : 'pending',
          subtotal: saleAmount,
          totalAmount: saleAmount,
          recipientName: lead.name,
          phoneNumber: lead.mobile,
          shippingAddress: shippingAddress || 'Address on file',
          items: {
            create: acceptedLines.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              unitPrice: Number(l.unitPriceAtTime),
              totalPrice: Number(l.unitPriceAtTime) * l.quantity,
            })),
          },
        },
      });
    } catch (orderErr) {
      console.warn('Auto order creation alongside sale confirmation:', orderErr);
    }

    return updatedLead;
  });

  await recordAuditLog({
    userId: user.id,
    action: 'PRODUCT_SALE_CONFIRMED',
    entity: 'lead',
    entityId: leadId,
    after: {
      orderReference,
      saleAmount,
      acceptedProductsCount: acceptedLines.length,
      saleConfirmedAt: now,
    },
    ip,
    userAgent,
  });

  return {
    success: true,
    lead: result,
  };
}



import { prisma } from '../../database/client';
import { UserContext, scopeWhere } from '../rbac/scope';
import { normalizePhoneNumber, maskPhoneNumber } from '@hospital-crm/shared';
import { recordAuditLog } from '../audit/audit.service';
import { getSetting } from '../settings/settings.service';

export interface CreateLeadInput {
  name: string;
  mobile: string;
  altMobile?: string | null;
  language?: 'en' | 'ml';
  concern?: string;
  departmentId: number;
  sourceId: number;
  branchId: number;
  campaignText?: string | null;
  referrerText?: string | null;
  consentCalls?: boolean;
  consentWhatsapp?: boolean;
  consentSms?: boolean;
  overrideDuplicate?: boolean;
  overrideReason?: string;
}

export interface ListLeadsParams {
  page?: number;
  pageSize?: number;
  status?: string;
  sourceId?: number;
  departmentId?: number;
  branchId?: number;
  ownerId?: number;
  priority?: string;
  language?: string;
  search?: string;
}

/**
 * Calculates the first-response due timestamp based on source and business hours.
 * - Google Ads & Meta Ads: 5 minutes SLA
 * - Other sources: 15 minutes SLA
 * - Business hours default to 09:00 - 20:00 Asia/Kolkata (UTC+05:30)
 */
export async function calculateFirstResponseDue(
  sourceCode: string,
  branchId: number,
  createdAt: Date = new Date()
): Promise<Date> {
  const callingHours = await getSetting('calling_hours', {
    start: '09:00',
    end: '20:00',
    timezone: 'Asia/Kolkata',
  });

  const normSource = sourceCode.toUpperCase();
  const isAd = normSource === 'META_ADS' || normSource === 'GOOGLE_ADS';
  const slaMinutes = isAd ? 5 : 15;

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
 * Checks if a lead with the same normalized mobile already exists.
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

  const existing = await prisma.lead.findFirst({
    where: {
      OR: conditions,
      archivedAt: null,
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      branch: { select: { id: true, name: true, code: true } },
      source: { select: { id: true, code: true, labelEn: true } },
      department: { select: { id: true, code: true, labelEn: true } },
    },
  });

  return existing;
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

  const normAltMobile = input.altMobile ? normalizePhoneNumber(input.altMobile) : null;

  // Duplicate Check
  const duplicate = await checkDuplicateLead(normMobile, normAltMobile);
  if (duplicate && !input.overrideDuplicate) {
    const error: any = new Error('Duplicate lead detected');
    error.statusCode = 409;
    error.code = 'DUPLICATE_LEAD';
    error.details = {
      duplicate: true,
      existingLead: {
        id: duplicate.id,
        name: duplicate.name,
        mobile: maskPhoneNumber(duplicate.mobileNorm),
        status: duplicate.status,
        ownerName: duplicate.owner?.name ?? 'Unassigned',
        branchName: duplicate.branch.name,
        createdAt: duplicate.createdAt,
      },
    };
    throw error;
  }

  // Fetch Source to determine SLA
  const source = await prisma.source.findUnique({
    where: { id: input.sourceId },
  });
  const sourceCode = source?.code || 'other';

  const firstResponseDueAt = await calculateFirstResponseDue(
    sourceCode,
    input.branchId
  );

  let assignedOwnerId: number | null = null;
  if (user.roleCode === 'support_telecaller') {
    assignedOwnerId = user.id;
  } else {
    assignedOwnerId = await assignLeadRoundRobin(input.branchId);
  }

  // Determine initial priority: Ad leads < 24h old start as hot
  const normSource = sourceCode.toUpperCase();
  const isAd = normSource === 'META_ADS' || normSource === 'GOOGLE_ADS';
  const priority = isAd ? 'hot' : 'warm';

  const lead = await prisma.lead.create({
    data: {
      name: input.name,
      mobile: input.mobile,
      mobileNorm: normMobile,
      altMobile: input.altMobile ?? null,
      altMobileNorm: normAltMobile,
      language: input.language ?? 'en',
      concern: input.concern ?? '',
      departmentId: input.departmentId,
      sourceId: input.sourceId,
      branchId: input.branchId,
      campaignText: input.campaignText ?? null,
      referrerText: input.referrerText ?? null,
      consentCalls: input.consentCalls ?? true,
      consentWhatsapp: input.consentWhatsapp ?? false,
      consentSms: input.consentSms ?? false,
      consentDate: new Date(),
      consentSource: source?.labelEn ?? 'manual',
      status: 'new',
      priority,
      ownerId: assignedOwnerId,
      firstResponseDueAt,
    },
    include: {
      source: true,
      department: true,
      owner: { select: { id: true, name: true, email: true } },
      branch: { select: { id: true, name: true, code: true } },
    },
  });

  // Notify assigned owner
  if (assignedOwnerId) {
    await prisma.notification.create({
      data: {
        userId: assignedOwnerId,
        type: 'lead_assigned',
        title: 'New Lead Assigned',
        body: `You have been assigned new lead: ${lead.name} (${source?.labelEn || 'Direct'}). First response due in ${isAd ? '5' : '15'} minutes.`,
        link: `/leads/${lead.id}`,
      },
    });
  }

  // Audit log
  await recordAuditLog({
    userId: user.id,
    action: 'LEAD_CREATED',
    entity: 'lead',
    entityId: lead.id,
    after: {
      id: lead.id,
      name: lead.name,
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

  const scope = scopeWhere(user, 'lead');

  const where: any = {
    ...scope,
    archivedAt: null,
  };

  if (params.status) {
    where.status = params.status;
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
  if (params.ownerId) {
    where.ownerId = params.ownerId;
  }
  if (params.priority) {
    where.priority = params.priority;
  }
  if (params.language) {
    where.language = params.language;
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

  const [total, rawLeads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [
        { firstResponseDueAt: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        source: { select: { id: true, code: true, labelEn: true, labelMl: true } },
        department: { select: { id: true, code: true, labelEn: true, labelMl: true } },
        owner: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, code: true, name: true } },
      },
    }),
  ]);

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
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Get lead details with scope checking.
 */
export async function getLeadById(id: number, user: UserContext, ip?: string, userAgent?: string) {
  const scope = scopeWhere(user, 'lead');

  const lead = await prisma.lead.findFirst({
    where: {
      id,
      archivedAt: null,
      ...scope,
    },
    include: {
      source: true,
      department: true,
      owner: { select: { id: true, name: true, email: true } },
      branch: true,
      closedReason: true,
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
    // Check if it exists out of scope to log unauthorized attempt
    const exists = await prisma.lead.findUnique({ where: { id } });
    if (exists) {
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
    const notFound: any = new Error('Lead not found');
    notFound.statusCode = 404;
    throw notFound;
  }

  // Audit lead open
  await recordAuditLog({
    userId: user.id,
    action: 'LEAD_OPENED',
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
  if (data.language !== undefined) updateData.language = data.language;
  if (data.concern !== undefined) updateData.concern = data.concern;
  if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.consentCalls !== undefined) updateData.consentCalls = data.consentCalls;
  if (data.consentWhatsapp !== undefined) updateData.consentWhatsapp = data.consentWhatsapp;
  if (data.consentSms !== undefined) updateData.consentSms = data.consentSms;
  if (data.doNotContact !== undefined) updateData.doNotContact = data.doNotContact;

  if (data.altMobile !== undefined) {
    updateData.altMobile = data.altMobile;
    updateData.altMobileNorm = data.altMobile ? normalizePhoneNumber(data.altMobile) : null;
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

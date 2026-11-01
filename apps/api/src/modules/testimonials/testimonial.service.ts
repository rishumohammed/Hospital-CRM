import { prisma } from '../../database/client';
import { UserContext, scopeWhere, getEffectiveScope } from '../rbac/scope';
import { Permissions, containsPhoneNumber } from '@hospital-crm/shared';
import { logAudit, recordAuditLog } from '../audit/audit.service';
import { getSetting } from '../settings/settings.service';
import { FastifyRequest } from 'fastify';

export interface ListTestimonialsParams {
  language?: string;
  departmentId?: number;
  type?: string;
  active?: boolean;
}

export interface CreateTestimonialInput {
  title: string;
  type: string;
  url: string;
  language?: string;
  departmentId?: number | null;
  summary: string;
  consentConfirmed: boolean;
  consentReference: string;
}

export interface UpdateTestimonialInput {
  title?: string;
  type?: string;
  url?: string;
  language?: string;
  departmentId?: number | null;
  summary?: string;
  consentConfirmed?: boolean;
  consentReference?: string;
  active?: boolean;
}

export interface SendTestimonialsInput {
  channel: 'whatsapp' | 'sms' | 'email' | 'call_readout' | 'other';
  testimonialIds?: number[];
  testimonial_ids?: number[];
  note?: string | null;
  sentAt?: string | Date;
  sent_at?: string | Date;
  overrideReason?: string | null;
  override_reason?: string | null;
}

export interface EditTestimonialSendInput {
  note?: string | null;
  sentAt?: string | Date;
  sent_at?: string | Date;
}

export interface VoidTestimonialSendInput {
  reason: string;
}

export interface TestimonialReportParams {
  branchId?: number;
  branch_id?: number;
  from?: string;
  to?: string;
}

/**
 * List testimonials from the approved library.
 * Telecallers with only testimonial.view see only active, consent-confirmed items.
 * Managers with testimonial.manage can view all and filter by active status.
 */
export async function listTestimonials(
  params: ListTestimonialsParams,
  user: UserContext
) {
  const canManage = getEffectiveScope(user, Permissions.TESTIMONIAL_MANAGE) !== 'none';

  const where: any = {
    archivedAt: null,
  };

  if (!canManage) {
    where.active = true;
    where.consentConfirmed = true;
  } else if (params.active !== undefined) {
    where.active = params.active;
  }

  if (params.language) {
    where.language = params.language;
  }

  if (params.departmentId) {
    where.departmentId = params.departmentId;
  }

  if (params.type) {
    where.type = params.type;
  }

  return prisma.testimonial.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      department: {
        select: { id: true, code: true, labelEn: true, labelMl: true },
      },
      creator: {
        select: { id: true, name: true, email: true },
      },
      approver: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

/**
 * Create a new approved testimonial in the library.
 * Requires testimonial.manage permission.
 * Strictly verifies confirmed consent, non-empty consent reference, and absence of PII phone numbers.
 */
export async function createTestimonial(
  input: CreateTestimonialInput,
  user: UserContext,
  req?: FastifyRequest
) {
  if (!input.consentConfirmed) {
    throw {
      statusCode: 400,
      code: 'CONSENT_CONFIRMATION_REQUIRED',
      message: 'Testimonial cannot be created without confirmed patient consent.',
    };
  }

  if (!input.consentReference || input.consentReference.trim() === '') {
    throw {
      statusCode: 400,
      code: 'CONSENT_REFERENCE_REQUIRED',
      message: 'A valid consent reference (e.g. consent form number) is required.',
    };
  }

  if (containsPhoneNumber(input.title) || containsPhoneNumber(input.summary)) {
    throw {
      statusCode: 400,
      code: 'PII_DETECTED',
      message: 'Phone numbers or patient contact identifiers are not permitted in title or summary fields.',
    };
  }

  const testimonial = await prisma.testimonial.create({
    data: {
      title: input.title.trim(),
      type: input.type,
      url: input.url.trim(),
      language: input.language || 'en',
      departmentId: input.departmentId ?? null,
      summary: input.summary.trim(),
      consentConfirmed: true,
      consentReference: input.consentReference.trim(),
      approvedBy: user.id,
      approvedAt: new Date(),
      active: true,
      createdBy: user.id,
    },
    include: {
      department: true,
    },
  });

  await logAudit(prisma, {
    userId: user.id,
    action: 'testimonial.create',
    entity: 'testimonial',
    entityId: testimonial.id,
    after: {
      id: testimonial.id,
      title: testimonial.title,
      type: testimonial.type,
      language: testimonial.language,
      consentReference: testimonial.consentReference,
    },
    req,
  });

  return testimonial;
}

/**
 * Update an existing testimonial library item.
 * Requires testimonial.manage permission.
 */
export async function updateTestimonial(
  id: number,
  input: UpdateTestimonialInput,
  user: UserContext,
  req?: FastifyRequest
) {
  const existing = await prisma.testimonial.findUnique({
    where: { id },
  });

  if (!existing || existing.archivedAt) {
    throw {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Testimonial not found.',
    };
  }

  if (
    (input.title && containsPhoneNumber(input.title)) ||
    (input.summary && containsPhoneNumber(input.summary))
  ) {
    throw {
      statusCode: 400,
      code: 'PII_DETECTED',
      message: 'Phone numbers or patient contact identifiers are not permitted in title or summary fields.',
    };
  }

  // Check consent rules if activating or updating consent fields
  const willBeActive = input.active !== undefined ? input.active : existing.active;
  const confirmed = input.consentConfirmed !== undefined ? input.consentConfirmed : existing.consentConfirmed;
  const ref = input.consentReference !== undefined ? input.consentReference.trim() : existing.consentReference;

  if (willBeActive && (!confirmed || !ref)) {
    throw {
      statusCode: 400,
      code: 'CONSENT_REQUIREMENT_VIOLATION',
      message: 'Testimonial cannot be active without confirmed consent and a valid reference.',
    };
  }

  const updated = await prisma.testimonial.update({
    where: { id },
    data: {
      title: input.title?.trim(),
      type: input.type,
      url: input.url?.trim(),
      language: input.language,
      departmentId: input.departmentId,
      summary: input.summary?.trim(),
      consentConfirmed: input.consentConfirmed,
      consentReference: input.consentReference?.trim(),
      active: input.active,
    },
    include: {
      department: true,
    },
  });

  await logAudit(prisma, {
    userId: user.id,
    action: 'testimonial.update',
    entity: 'testimonial',
    entityId: id,
    before: {
      title: existing.title,
      active: existing.active,
      consentConfirmed: existing.consentConfirmed,
    },
    after: {
      title: updated.title,
      active: updated.active,
      consentConfirmed: updated.consentConfirmed,
    },
    req,
  });

  return updated;
}

/**
 * Deactivate a testimonial from the approved library.
 * Requires testimonial.manage permission.
 */
export async function deactivateTestimonial(
  id: number,
  user: UserContext,
  req?: FastifyRequest
) {
  const existing = await prisma.testimonial.findUnique({
    where: { id },
  });

  if (!existing || existing.archivedAt) {
    throw {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Testimonial not found.',
    };
  }

  const updated = await prisma.testimonial.update({
    where: { id },
    data: { active: false },
  });

  await logAudit(prisma, {
    userId: user.id,
    action: 'testimonial.deactivate',
    entity: 'testimonial',
    entityId: id,
    before: { active: existing.active },
    after: { active: false },
    req,
  });

  return updated;
}

/**
 * Record testimonials sent to a lead.
 * Enforces:
 * - Scoping via scopeWhere (403 with audit log on unauthorized access)
 * - Terminal states check (doNotContact, junk, emergencyFlag)
 * - Channel consent (WhatsApp, SMS, Email) with supervisor override (requires testimonial.void & overrideReason)
 * - Testimonial active & consent confirmed check
 * - Atomic database transaction:
 *   1. lead_testimonial_sends
 *   2. lead_testimonial_send_items
 *   3. Recompute lead.testimonials_sent_count and lead.testimonials_last_sent_at
 *   4. interactions (testimonial_sent)
 *   5. audit_logs (lead.testimonials_sent and optional testimonial.consent_override)
 *   6. Follow-up task if testimonial_followup_hours > 0
 */
export async function recordLeadTestimonialSend(
  leadId: number,
  input: SendTestimonialsInput,
  user: UserContext,
  req?: FastifyRequest
) {
  // Check scope
  const scopedWhere = {
    id: leadId,
    ...scopeWhere(user, 'lead', Permissions.TESTIMONIAL_SEND),
  };

  const lead = await prisma.lead.findFirst({
    where: scopedWhere,
  });

  if (!lead) {
    const exists = await prisma.lead.findUnique({ where: { id: leadId } });
    if (exists) {
      await logAudit(prisma, {
        userId: user.id,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        entity: 'lead',
        entityId: leadId,
        before: { reason: 'Lead out of scope for testimonial.send' },
        req,
      });
      throw {
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'You do not have permission to send testimonials to this lead.',
      };
    }
    throw {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Lead not found.',
    };
  }

  // Terminal states validation
  if (lead.doNotContact) {
    throw {
      statusCode: 400,
      code: 'LEAD_DO_NOT_CONTACT',
      message: 'Cannot send testimonials to a lead marked as Do Not Contact.',
    };
  }

  if (lead.status === 'junk') {
    throw {
      statusCode: 400,
      code: 'LEAD_JUNK',
      message: 'Cannot send testimonials to a lead closed as junk.',
    };
  }

  if (lead.emergencyFlag) {
    throw {
      statusCode: 400,
      code: 'LEAD_EMERGENCY',
      message: 'Cannot send testimonials to a lead with an active emergency flag.',
    };
  }

  // Extract testimonial IDs
  const rawTestimonialIds = input.testimonialIds || input.testimonial_ids || [];
  const testimonialIds = Array.from(new Set(rawTestimonialIds.map(Number))).filter((id) => !isNaN(id) && id > 0);

  if (testimonialIds.length === 0) {
    throw {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'At least one testimonial must be selected.',
    };
  }

  // Channel consent check
  const channel = input.channel;
  let hasConsent = true;
  if (channel === 'whatsapp') {
    hasConsent = Boolean(lead.consentWhatsapp);
  } else if (channel === 'sms') {
    hasConsent = Boolean(lead.consentSms);
  } else if (channel === 'email') {
    hasConsent = Boolean((lead as any).consentEmail);
  }

  const overrideReason = (input.overrideReason || input.override_reason)?.trim() || null;

  if (!hasConsent) {
    const canOverride = getEffectiveScope(user, Permissions.TESTIMONIAL_VOID) !== 'none';
    if (!canOverride || !overrideReason) {
      throw {
        statusCode: 400,
        code: 'CONSENT_MISSING',
        message: `Lead has not provided consent for ${channel.toUpperCase()}. A manager with void permission can override with a reason.`,
      };
    }
  }

  // Testimonials active and consentConfirmed check
  const testimonials = await prisma.testimonial.findMany({
    where: {
      id: { in: testimonialIds },
      archivedAt: null,
    },
  });

  if (testimonials.length !== testimonialIds.length) {
    throw {
      statusCode: 400,
      code: 'TESTIMONIAL_NOT_FOUND',
      message: 'One or more requested testimonials were not found in library.',
    };
  }

  const invalidTestimonials = testimonials.filter(
    (t) => !t.active || !t.consentConfirmed
  );
  if (invalidTestimonials.length > 0) {
    throw {
      statusCode: 400,
      code: 'TESTIMONIAL_INACTIVE_OR_UNCONFIRMED',
      message: 'Only active testimonials with confirmed consent can be sent to leads.',
    };
  }

  const rawSentAt = input.sentAt || input.sent_at;
  const sentAt = rawSentAt ? new Date(rawSentAt) : new Date();
  const note = input.note?.trim() || null;

  // Execute atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create send record
    const send = await tx.leadTestimonialSend.create({
      data: {
        leadId: lead.id,
        sentBy: user.id,
        sentAt,
        channel,
        note,
        overrideReason: !hasConsent ? overrideReason : null,
      },
    });

    // 2. Create send items
    await tx.leadTestimonialSendItem.createMany({
      data: testimonialIds.map((tid) => ({
        sendId: send.id,
        testimonialId: tid,
      })),
    });

    // 3. Recompute lead denormalized counters
    const nonVoidedSends = await tx.leadTestimonialSend.findMany({
      where: { leadId: lead.id, voidedAt: null },
      orderBy: { sentAt: 'desc' },
      select: { id: true, sentAt: true },
    });

    const testimonialsSentCount = nonVoidedSends.length;
    const testimonialsLastSentAt = nonVoidedSends.length > 0 ? nonVoidedSends[0].sentAt : null;

    await tx.lead.update({
      where: { id: lead.id },
      data: {
        testimonialsSentCount,
        testimonialsLastSentAt,
      },
    });

    // 4. Create timeline interaction
    await tx.interaction.create({
      data: {
        type: 'testimonial_sent',
        direction: 'outbound',
        userId: user.id,
        leadId: lead.id,
        note,
        details: {
          sendId: send.id,
          channel,
          testimonialIds,
          titles: testimonials.map((t) => t.title),
        },
        overrideReason: !hasConsent ? overrideReason : null,
        occurredAt: sentAt,
      },
    });

    // 5. Audit logs
    if (!hasConsent && overrideReason) {
      await logAudit(tx as any, {
        userId: user.id,
        action: 'testimonial.consent_override',
        entity: 'lead_testimonial_send',
        entityId: send.id,
        after: {
          leadId: lead.id,
          channel,
          overrideReason,
        },
        req,
      });
    }

    await logAudit(tx as any, {
      userId: user.id,
      action: 'lead.testimonials_sent',
      entity: 'lead',
      entityId: lead.id,
      after: {
        sendId: send.id,
        channel,
        testimonialCount: testimonialIds.length,
        testimonialsSentCount,
      },
      req,
    });

    // 6. Optional follow-up task
    const followupSetting = await getSetting('testimonial_followup_hours', { hours: 24 });
    const followupHours =
      typeof followupSetting?.hours === 'number'
        ? followupSetting.hours
        : typeof followupSetting === 'number'
        ? followupSetting
        : 24;

    if (followupHours > 0) {
      const dueAt = new Date(Date.now() + followupHours * 3600 * 1000);
      await tx.task.create({
        data: {
          type: 'call',
          title: 'Check if the testimonials were seen',
          dueAt,
          priority: 'warm',
          ownerId: user.id,
          leadId: lead.id,
          status: 'open',
        },
      });
    }

    return tx.leadTestimonialSend.findUnique({
      where: { id: send.id },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            testimonial: true,
          },
        },
      },
    });
  });

  return result;
}

/**
 * Edit a testimonial send (note and sentAt only, same-day restriction, original sender only).
 */
export async function editLeadTestimonialSend(
  leadId: number,
  sendId: number,
  input: EditTestimonialSendInput,
  user: UserContext,
  req?: FastifyRequest
) {
  const send = await prisma.leadTestimonialSend.findUnique({
    where: { id: sendId },
  });

  if (!send || send.leadId !== leadId) {
    throw {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Testimonial send record not found.',
    };
  }

  if (send.voidedAt) {
    throw {
      statusCode: 400,
      code: 'SEND_VOIDED',
      message: 'Voided records cannot be edited.',
    };
  }

  if (send.sentBy !== user.id) {
    throw {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only the original sender can edit this testimonial record.',
    };
  }

  // Same calendar day check (UTC/local)
  const now = new Date();
  const sameDay =
    send.createdAt.toDateString() === now.toDateString() ||
    send.sentAt.toDateString() === now.toDateString();

  if (!sameDay) {
    throw {
      statusCode: 400,
      code: 'EDIT_EXPIRED',
      message: 'Testimonial sends can only be edited on the same calendar day.',
    };
  }

  const rawSentAt = input.sentAt || input.sent_at;
  const newSentAt = rawSentAt ? new Date(rawSentAt) : undefined;
  const newNote = input.note !== undefined ? input.note?.trim() || null : undefined;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedSend = await tx.leadTestimonialSend.update({
      where: { id: sendId },
      data: {
        note: newNote,
        sentAt: newSentAt,
      },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        items: {
          include: { testimonial: true },
        },
      },
    });

    if (newSentAt) {
      const latestSend = await tx.leadTestimonialSend.findFirst({
        where: { leadId, voidedAt: null },
        orderBy: { sentAt: 'desc' },
      });
      if (latestSend) {
        await tx.lead.update({
          where: { id: leadId },
          data: { testimonialsLastSentAt: latestSend.sentAt },
        });
      }
    }

    await logAudit(tx as any, {
      userId: user.id,
      action: 'testimonial_send.edit',
      entity: 'lead_testimonial_send',
      entityId: sendId,
      before: { note: send.note, sentAt: send.sentAt },
      after: { note: updatedSend.note, sentAt: updatedSend.sentAt },
      req,
    });

    return updatedSend;
  });

  return updated;
}

/**
 * Void a testimonial send with a mandatory reason.
 * Requires testimonial.void permission.
 * Recomputes denormalized lead counters and creates testimonial_void interaction.
 */
export async function voidLeadTestimonialSend(
  leadId: number,
  sendId: number,
  input: VoidTestimonialSendInput,
  user: UserContext,
  req?: FastifyRequest
) {
  const send = await prisma.leadTestimonialSend.findUnique({
    where: { id: sendId },
  });

  if (!send || send.leadId !== leadId) {
    throw {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Testimonial send record not found.',
    };
  }

  if (send.voidedAt) {
    throw {
      statusCode: 400,
      code: 'ALREADY_VOIDED',
      message: 'This testimonial send record has already been voided.',
    };
  }

  const reason = input.reason.trim();
  const voidedAt = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const voided = await tx.leadTestimonialSend.update({
      where: { id: sendId },
      data: {
        voidedAt,
        voidedBy: user.id,
        voidReason: reason,
      },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        voider: { select: { id: true, name: true, email: true } },
        items: { include: { testimonial: true } },
      },
    });

    // Recompute lead counters
    const nonVoidedSends = await tx.leadTestimonialSend.findMany({
      where: { leadId, voidedAt: null },
      orderBy: { sentAt: 'desc' },
      select: { sentAt: true },
    });

    const testimonialsSentCount = nonVoidedSends.length;
    const testimonialsLastSentAt = nonVoidedSends.length > 0 ? nonVoidedSends[0].sentAt : null;

    await tx.lead.update({
      where: { id: leadId },
      data: {
        testimonialsSentCount,
        testimonialsLastSentAt,
      },
    });

    // Write timeline interaction
    await tx.interaction.create({
      data: {
        type: 'testimonial_void',
        direction: 'outbound',
        userId: user.id,
        leadId,
        note: reason,
        details: {
          sendId,
          voidReason: reason,
        },
        occurredAt: voidedAt,
      },
    });

    // Write audit log
    await logAudit(tx as any, {
      userId: user.id,
      action: 'lead.testimonials_void',
      entity: 'lead_testimonial_send',
      entityId: sendId,
      after: {
        voidedBy: user.id,
        voidReason: reason,
        testimonialsSentCount,
      },
      req,
    });

    return voided;
  });

  return updated;
}

/**
 * Get testimonial send history for a lead (including voided records).
 */
export async function getLeadTestimonialHistory(
  leadId: number,
  user: UserContext,
  req?: FastifyRequest
) {
  // Check scope for viewing lead
  const scopedWhere = {
    id: leadId,
    ...scopeWhere(user, 'lead', Permissions.LEAD_VIEW),
  };

  const lead = await prisma.lead.findFirst({
    where: scopedWhere,
  });

  if (!lead) {
    const exists = await prisma.lead.findUnique({ where: { id: leadId } });
    if (exists) {
      await logAudit(prisma, {
        userId: user.id,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        entity: 'lead',
        entityId: leadId,
        before: { reason: 'Lead out of scope for testimonial history view' },
        req,
      });
      throw {
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'You do not have permission to view this lead.',
      };
    }
    throw {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Lead not found.',
    };
  }

  const sends = await prisma.leadTestimonialSend.findMany({
    where: { leadId },
    orderBy: { sentAt: 'desc' },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      voider: { select: { id: true, name: true, email: true } },
      items: {
        include: {
          testimonial: true,
        },
      },
    },
  });

  return {
    leadId,
    testimonialsSentCount: lead.testimonialsSentCount,
    testimonialsLastSentAt: lead.testimonialsLastSentAt,
    sends,
  };
}

/**
 * Generate Testimonials Report metrics.
 * Returns:
 * - totalLeads in period
 * - leadsWithTestimonialsSent
 * - percentage
 * - sendsByChannel
 * - sendsByTelecaller
 * - appointmentBookedRate for leads with vs without testimonials (clearly labeled as association)
 */
export async function getTestimonialsReport(
  params: TestimonialReportParams,
  user: UserContext
) {
  const branchId = params.branchId || params.branch_id;
  const whereLead: any = {
    archivedAt: null,
    ...scopeWhere(user, 'lead', Permissions.REPORT_VIEW),
  };

  if (branchId) {
    whereLead.branchId = branchId;
  }

  if (params.from || params.to) {
    whereLead.createdAt = {};
    if (params.from) whereLead.createdAt.gte = new Date(params.from);
    if (params.to) whereLead.createdAt.lte = new Date(params.to);
  }

  // Fetch leads in the period with appointments and sends
  const leads = await prisma.lead.findMany({
    where: whereLead,
    select: {
      id: true,
      status: true,
      testimonialsSentCount: true,
      appointments: {
        select: { id: true, status: true },
      },
    },
  });

  const totalLeads = leads.length;
  let leadsWithTestimonials = 0;
  let leadsWithoutTestimonials = 0;

  let bookedWithTestimonials = 0;
  let bookedWithoutTestimonials = 0;

  for (const l of leads) {
    const hasTestimonials = l.testimonialsSentCount > 0;
    const isBooked =
      l.status === 'appointment_booked' ||
      l.appointments.some((a) => ['booked', 'visited'].includes(a.status));

    if (hasTestimonials) {
      leadsWithTestimonials++;
      if (isBooked) bookedWithTestimonials++;
    } else {
      leadsWithoutTestimonials++;
      if (isBooked) bookedWithoutTestimonials++;
    }
  }

  const percentage =
    totalLeads > 0 ? Number(((leadsWithTestimonials / totalLeads) * 100).toFixed(1)) : 0;

  const rateWithTestimonials =
    leadsWithTestimonials > 0
      ? Number(((bookedWithTestimonials / leadsWithTestimonials) * 100).toFixed(1))
      : 0;

  const rateWithoutTestimonials =
    leadsWithoutTestimonials > 0
      ? Number(((bookedWithoutTestimonials / leadsWithoutTestimonials) * 100).toFixed(1))
      : 0;

  // Sends query in the period for channels and telecallers
  const leadIds = leads.map((l) => l.id);
  const sendsWhere: any = {
    voidedAt: null,
  };

  if (leadIds.length > 0) {
    sendsWhere.leadId = { in: leadIds };
  } else if (totalLeads === 0 && (whereLead.branchId || whereLead.ownerId)) {
    // If scoped leads list is empty, sends must also be empty
    sendsWhere.leadId = -1;
  }

  if (params.from || params.to) {
    sendsWhere.sentAt = {};
    if (params.from) sendsWhere.sentAt.gte = new Date(params.from);
    if (params.to) sendsWhere.sentAt.lte = new Date(params.to);
  }

  const sends = await prisma.leadTestimonialSend.findMany({
    where: sendsWhere,
    include: {
      sender: { select: { id: true, name: true } },
    },
  });

  const sendsByChannel: Record<string, number> = {
    whatsapp: 0,
    sms: 0,
    email: 0,
    call_readout: 0,
    other: 0,
  };

  const telecallerMap: Record<number, { userId: number; userName: string; count: number }> = {};

  for (const s of sends) {
    sendsByChannel[s.channel] = (sendsByChannel[s.channel] || 0) + 1;
    if (!telecallerMap[s.sentBy]) {
      telecallerMap[s.sentBy] = {
        userId: s.sentBy,
        userName: s.sender?.name || `User #${s.sentBy}`,
        count: 0,
      };
    }
    telecallerMap[s.sentBy].count++;
  }

  return {
    period: {
      from: params.from || null,
      to: params.to || null,
      branchId: branchId || null,
    },
    totalLeads,
    leadsWithTestimonials,
    percentage,
    sendsByChannel,
    sendsByTelecaller: Object.values(telecallerMap).sort((a, b) => b.count - a.count),
    appointmentBookedRate: {
      withTestimonials: {
        totalLeads: leadsWithTestimonials,
        bookedCount: bookedWithTestimonials,
        ratePercentage: rateWithTestimonials,
      },
      withoutTestimonials: {
        totalLeads: leadsWithoutTestimonials,
        bookedCount: bookedWithoutTestimonials,
        ratePercentage: rateWithoutTestimonials,
      },
      associationNotice:
        'Notice: The metrics above reflect statistical correlation and association within current patient cohorts, not direct clinical or operational causation.',
    },
  };
}

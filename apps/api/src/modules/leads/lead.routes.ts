import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  quickCreateLeadSchema,
  leadFilterSchema,
  updateLeadSchema,
  assignLeadSchema,
  closeLeadSchema,
  emergencyRedirectSchema,
  bookAppointmentSchema,
  convertLeadSchema,
  intakeLeadSchema,
  importLeadsPreviewSchema,
  importLeadsCommitSchema,
  normalizePhoneNumber,
  Permissions,
} from '@hospital-crm/shared';
import {
  quickCreateLead,
  listLeads,
  getLeadById,
  updateLead,
  assignLead,
  closeLead,
  emergencyRedirectLead,
  bookAppointmentForLead,
  convertLead,
  checkDuplicateLead,
  calculateFirstResponseDue,
  assignLeadRoundRobin,
} from './lead.service';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import { prisma } from '../../database/client';
import { recordAuditLog } from '../audit/audit.service';

export const leadRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Public Intake API (Webhook / Website Form / Lead Ads)
  fastify.post('/intake/:sourceKey', async (req, reply) => {
    const { sourceKey } = req.params as { sourceKey: string };
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.INTAKE_API_KEY || 'crm-intake-key-2026';

    if (apiKey !== validApiKey) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Invalid intake API key' },
      });
    }

    const parseResult = intakeLeadSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid intake payload',
          details: parseResult.error.format(),
        },
      });
    }

    const body = parseResult.data;

    // Resolve source
    const normSourceKey = sourceKey.toUpperCase();
    let source = await prisma.source.findFirst({
      where: {
        OR: [{ code: sourceKey }, { code: normSourceKey }],
      },
    });
    if (!source) {
      source = await prisma.source.findFirst({ where: { active: true } });
    }
    if (!source) {
      return reply.status(500).send({
        error: { code: 'NO_SOURCE', message: 'No active lead sources available' },
      });
    }

    // Resolve branch
    let branch = await prisma.branch.findUnique({ where: { code: body.branchCode } });
    if (!branch) {
      branch = await prisma.branch.findFirst({ where: { archivedAt: null } });
    }
    if (!branch) {
      return reply.status(500).send({
        error: { code: 'NO_BRANCH', message: 'No active branches available' },
      });
    }

    // Resolve department
    let department = body.departmentCode
      ? await prisma.department.findUnique({ where: { code: body.departmentCode } })
      : null;
    if (!department) {
      department = await prisma.department.findFirst({ where: { active: true } });
    }
    if (!department) {
      return reply.status(500).send({
        error: { code: 'NO_DEPARTMENT', message: 'No active departments available' },
      });
    }

    const normMobile = normalizePhoneNumber(body.mobile);
    if (!normMobile) {
      return reply.status(400).send({
        error: { code: 'INVALID_PHONE', message: 'Invalid phone number' },
      });
    }

    // Check duplicate
    const duplicate = await checkDuplicateLead(normMobile, body.altMobile);
    if (duplicate) {
      // Record intake duplicate note
      await prisma.interaction.create({
        data: {
          type: 'note',
          direction: 'inbound',
          userId: duplicate.owner?.id || 1,
          leadId: duplicate.id,
          note: `Repeat intake enquiry from ${source.labelEn}: ${body.concern || 'No note'}`,
          occurredAt: new Date(),
        },
      });

      return reply.status(200).send({
        success: true,
        duplicate: true,
        leadId: duplicate.id,
        message: 'Intake linked to existing lead enquiry',
      });
    }

    // Calculate SLA
    const firstResponseDueAt = await calculateFirstResponseDue(source.code, branch.id);
    const assignedOwnerId = await assignLeadRoundRobin(branch.id);
    const isAd = source.code.toUpperCase() === 'META_ADS' || source.code.toUpperCase() === 'GOOGLE_ADS';

    const lead = await prisma.lead.create({
      data: {
        name: body.name,
        mobile: body.mobile,
        mobileNorm: normMobile,
        altMobile: body.altMobile ?? null,
        altMobileNorm: body.altMobile ? normalizePhoneNumber(body.altMobile) : null,
        language: body.language,
        concern: body.concern,
        departmentId: department.id,
        sourceId: source.id,
        branchId: branch.id,
        campaignText: body.campaignText ?? null,
        referrerText: body.referrerText ?? null,
        status: 'new',
        priority: isAd ? 'hot' : 'warm',
        ownerId: assignedOwnerId,
        firstResponseDueAt,
        consentCalls: true,
        consentSource: `intake_${source.code}`,
        consentDate: new Date(),
      },
    });

    if (assignedOwnerId) {
      await prisma.notification.create({
        data: {
          userId: assignedOwnerId,
          type: 'lead_assigned',
          title: `New Intake Lead: ${lead.name}`,
          body: `Source: ${source.labelEn}. First response due in ${isAd ? '5' : '15'} minutes.`,
          link: `/leads/${lead.id}`,
        },
      });
    }

    return reply.status(201).send({
      success: true,
      duplicate: false,
      leadId: lead.id,
      firstResponseDueAt: lead.firstResponseDueAt,
    });
  });

  // Authenticated Lead Endpoints
  fastify.register(async (authGroup) => {
    authGroup.addHook('preHandler', authenticate);

    // 1. Check duplicate mobile
    authGroup.get('/leads/check-duplicate', async (req, reply) => {
      const { mobile, altMobile } = req.query as { mobile?: string; altMobile?: string };
      if (!mobile) {
        return reply.status(400).send({
          error: { code: 'MISSING_PARAM', message: 'mobile query param is required' },
        });
      }

      const duplicate = await checkDuplicateLead(mobile, altMobile);
      if (!duplicate) {
        return reply.send({ duplicate: false });
      }

      return reply.send({
        duplicate: true,
        existingLead: {
          id: duplicate.id,
          name: duplicate.name,
          mobile: duplicate.mobileNorm,
          status: duplicate.status,
          ownerName: duplicate.owner?.name ?? 'Unassigned',
          branchName: duplicate.branch.name,
          sourceName: duplicate.source.labelEn,
          createdAt: duplicate.createdAt,
        },
      });
    });

    // 2. Quick Create Lead
    authGroup.post(
      '/leads',
      { preHandler: [requirePermission(Permissions.LEAD_CREATE, 'lead')] },
      async (req, reply) => {
        const parseResult = quickCreateLeadSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid lead payload',
              details: parseResult.error.format(),
            },
          });
        }

        try {
          const lead = await quickCreateLead(
            parseResult.data,
            req.user!,
            req.ip,
            req.headers['user-agent']
          );
          return reply.status(201).send(lead);
        } catch (err: any) {
          if (err.statusCode === 409) {
            return reply.status(409).send({
              error: {
                code: err.code || 'DUPLICATE_LEAD',
                message: err.message,
                details: err.details,
              },
            });
          }
          throw err;
        }
      }
    );

    // 3. List Leads
    authGroup.get(
      '/leads',
      { preHandler: [requirePermission(Permissions.LEAD_VIEW, 'lead')] },
      async (req, reply) => {
        const parseResult = leadFilterSchema.safeParse(req.query);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid filter parameters',
              details: parseResult.error.format(),
            },
          });
        }

        const result = await listLeads(parseResult.data, req.user!);
        return reply.send(result);
      }
    );

    // 4. Get Lead by ID
    authGroup.get(
      '/leads/:id',
      { preHandler: [requirePermission(Permissions.LEAD_VIEW, 'lead')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const leadId = parseInt(id, 10);
        if (isNaN(leadId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Lead ID must be an integer' },
          });
        }

        const lead = await getLeadById(leadId, req.user!, req.ip, req.headers['user-agent']);
        return reply.send(lead);
      }
    );

    // 5. Update Lead
    authGroup.patch(
      '/leads/:id',
      { preHandler: [requirePermission(Permissions.LEAD_EDIT, 'lead')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const leadId = parseInt(id, 10);
        if (isNaN(leadId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Lead ID must be an integer' },
          });
        }

        const parseResult = updateLeadSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid update payload',
              details: parseResult.error.format(),
            },
          });
        }

        const updated = await updateLead(
          leadId,
          parseResult.data,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(updated);
      }
    );

    // 6. Assign / Reassign Lead
    authGroup.post(
      '/leads/:id/assign',
      { preHandler: [requirePermission(Permissions.LEAD_REASSIGN, 'lead')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const leadId = parseInt(id, 10);
        if (isNaN(leadId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Lead ID must be an integer' },
          });
        }

        const parseResult = assignLeadSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid assign payload',
              details: parseResult.error.format(),
            },
          });
        }

        const updated = await assignLead(
          leadId,
          parseResult.data.ownerId,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(updated);
      }
    );

    // 7. Close Lead with Reason
    authGroup.post(
      '/leads/:id/close',
      { preHandler: [requirePermission(Permissions.LEAD_CLOSE, 'lead')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const leadId = parseInt(id, 10);
        if (isNaN(leadId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Lead ID must be an integer' },
          });
        }

        const parseResult = closeLeadSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid close payload',
              details: parseResult.error.format(),
            },
          });
        }

        const updated = await closeLead(
          leadId,
          parseResult.data.closedReasonId,
          parseResult.data.note,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(updated);
      }
    );

    // 8. Emergency Redirect
    authGroup.post(
      '/leads/:id/emergency',
      { preHandler: [requirePermission(Permissions.LEAD_EDIT, 'lead')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const leadId = parseInt(id, 10);
        if (isNaN(leadId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Lead ID must be an integer' },
          });
        }

        const parseResult = emergencyRedirectSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid emergency payload',
              details: parseResult.error.format(),
            },
          });
        }

        const result = await emergencyRedirectLead(
          leadId,
          parseResult.data.note,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.send(result);
      }
    );

    // 8b. Book Appointment
    authGroup.post(
      '/leads/:id/book-appointment',
      { preHandler: [requirePermission(Permissions.LEAD_EDIT, 'lead')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const leadId = parseInt(id, 10);
        if (isNaN(leadId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Lead ID must be an integer' },
          });
        }

        const parseResult = bookAppointmentSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid appointment payload',
              details: parseResult.error.format(),
            },
          });
        }

        const result = await bookAppointmentForLead(
          leadId,
          parseResult.data,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.status(201).send(result);
      }
    );

    // 8c. Mark Visited & Convert Lead to Case
    authGroup.post(
      '/leads/:id/convert',
      { preHandler: [requirePermission(Permissions.LEAD_EDIT, 'lead')] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const leadId = parseInt(id, 10);
        if (isNaN(leadId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Lead ID must be an integer' },
          });
        }

        const parseResult = convertLeadSchema.safeParse(req.body || {});
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid conversion payload',
              details: parseResult.error.format(),
            },
          });
        }

        const result = await convertLead(
          leadId,
          parseResult.data,
          req.user!,
          req.ip,
          req.headers['user-agent']
        );
        return reply.status(200).send(result);
      }
    );

    // 9. CSV Import Preview
    authGroup.post(
      '/leads/import/preview',
      { preHandler: [requirePermission(Permissions.IMPORT_RUN)] },
      async (req, reply) => {
        const parseResult = importLeadsPreviewSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid import rows format',
              details: parseResult.error.format(),
            },
          });
        }

        const { rows } = parseResult.data;
        const processedRows: any[] = [];
        let validCount = 0;
        let invalidCount = 0;
        let duplicateCount = 0;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const normMobile = normalizePhoneNumber(row.mobile);

          if (!normMobile) {
            invalidCount++;
            processedRows.push({
              rowIndex: i + 1,
              ...row,
              status: 'invalid',
              reason: 'Invalid phone number format',
            });
            continue;
          }

          const duplicate = await checkDuplicateLead(normMobile);
          if (duplicate) {
            duplicateCount++;
            processedRows.push({
              rowIndex: i + 1,
              ...row,
              mobileNorm: normMobile,
              status: 'duplicate',
              reason: `Already exists as Lead #${duplicate.id} (${duplicate.name})`,
              existingLeadId: duplicate.id,
            });
            continue;
          }

          validCount++;
          processedRows.push({
            rowIndex: i + 1,
            ...row,
            mobileNorm: normMobile,
            status: 'valid',
          });
        }

        return reply.send({
          totalRows: rows.length,
          validCount,
          invalidCount,
          duplicateCount,
          rows: processedRows,
        });
      }
    );

    // 10. CSV Import Commit
    authGroup.post(
      '/leads/import/commit',
      { preHandler: [requirePermission(Permissions.IMPORT_RUN)] },
      async (req, reply) => {
        const parseResult = importLeadsCommitSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid import commit payload',
              details: parseResult.error.format(),
            },
          });
        }

        const { rows } = parseResult.data;
        const defaultBranch = await prisma.branch.findFirst({ where: { code: 'MAIN' } });
        const defaultSource = await prisma.source.findFirst({ where: { code: 'walk_in' } });
        const defaultDept = await prisma.department.findFirst({ where: { active: true } });

        let createdCount = 0;
        const createdLeadIds: number[] = [];

        for (const row of rows) {
          const normMobile = normalizePhoneNumber(row.mobile);
          if (!normMobile) continue;

          // Check duplicate
          const duplicate = await checkDuplicateLead(normMobile);
          if (duplicate) continue;

          let branch = defaultBranch;
          if (row.branchCode) {
            const foundBranch = await prisma.branch.findUnique({ where: { code: row.branchCode } });
            if (foundBranch) branch = foundBranch;
          }

          let source = defaultSource;
          if (row.sourceCode) {
            const foundSource = await prisma.source.findUnique({ where: { code: row.sourceCode } });
            if (foundSource) source = foundSource;
          }

          let dept = defaultDept;
          if (row.departmentCode) {
            const foundDept = await prisma.department.findUnique({ where: { code: row.departmentCode } });
            if (foundDept) dept = foundDept;
          }

          if (!branch || !source || !dept) continue;

          const firstResponseDueAt = await calculateFirstResponseDue(source.code, branch.id);
          const assignedOwnerId = await assignLeadRoundRobin(branch.id);

          const lead = await prisma.lead.create({
            data: {
              name: row.name,
              mobile: row.mobile,
              mobileNorm: normMobile,
              altMobile: row.altMobile ?? null,
              altMobileNorm: row.altMobile ? normalizePhoneNumber(row.altMobile) : null,
              language: (row.language === 'ml' ? 'ml' : 'en'),
              concern: row.concern ?? '',
              departmentId: dept.id,
              sourceId: source.id,
              branchId: branch.id,
              status: 'new',
              priority: row.priority ?? 'warm',
              ownerId: assignedOwnerId,
              firstResponseDueAt,
            },
          });

          createdCount++;
          createdLeadIds.push(lead.id);
        }

        await recordAuditLog({
          userId: req.user!.id,
          action: 'LEADS_CSV_IMPORTED',
          entity: 'lead',
          after: { totalRows: rows.length, createdCount },
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });

        return reply.status(201).send({
          success: true,
          importedCount: createdCount,
          createdLeadIds,
        });
      }
    );
  });
};

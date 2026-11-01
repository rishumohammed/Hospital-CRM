import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  Permissions,
  createTestimonialSchema,
  updateTestimonialSchema,
  sendTestimonialsSchema,
  editTestimonialSendSchema,
  voidTestimonialSendSchema,
  testimonialReportQuerySchema,
} from '@hospital-crm/shared';
import {
  listTestimonials,
  createTestimonial,
  updateTestimonial,
  deactivateTestimonial,
  recordLeadTestimonialSend,
  editLeadTestimonialSend,
  voidLeadTestimonialSend,
  getLeadTestimonialHistory,
  getTestimonialsReport,
} from './testimonial.service';
import { authenticate, requirePermission } from '../auth/auth.middleware';

export const testimonialRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.register(async (authGroup) => {
    authGroup.addHook('preHandler', authenticate);

    // 1. List Approved Testimonials Library
    authGroup.get(
      '/testimonials',
      { preHandler: [requirePermission(Permissions.TESTIMONIAL_VIEW, 'lead' as any)] },
      async (req, reply) => {
        const query = req.query as Record<string, any>;
        const activeParam =
          query.active === 'true' || query.active === true
            ? true
            : query.active === 'false' || query.active === false
            ? false
            : undefined;

        const departmentId = query.department_id || query.departmentId;

        const testimonials = await listTestimonials(
          {
            language: query.language,
            departmentId: departmentId ? Number(departmentId) : undefined,
            type: query.type,
            active: activeParam,
          },
          req.user!
        );

        return reply.status(200).send({ testimonials });
      }
    );

    // 2. Add Testimonial to Library
    authGroup.post(
      '/testimonials',
      { preHandler: [requirePermission(Permissions.TESTIMONIAL_MANAGE, 'lead' as any)] },
      async (req, reply) => {
        const parseResult = createTestimonialSchema.safeParse(req.body);
        if (!parseResult.success) {
          const isPii = parseResult.error.errors.some((e) =>
            e.message.toLowerCase().includes('phone number')
          );
          return reply.status(400).send({
            error: {
              code: isPii ? 'PII_DETECTED' : 'VALIDATION_ERROR',
              message: isPii
                ? 'Phone numbers or patient contact identifiers are not permitted in title or summary fields.'
                : 'Invalid testimonial data',
              details: parseResult.error.format(),
            },
          });
        }

        try {
          const created = await createTestimonial(parseResult.data, req.user!, req);
          return reply.status(201).send(created);
        } catch (err: any) {
          if (err.statusCode) {
            return reply.status(err.statusCode).send({
              error: {
                code: err.code || 'ERROR',
                message: err.message,
              },
            });
          }
          throw err;
        }
      }
    );

    // 3. Edit Testimonial in Library
    authGroup.patch(
      '/testimonials/:id',
      { preHandler: [requirePermission(Permissions.TESTIMONIAL_MANAGE, 'lead' as any)] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const testimonialId = parseInt(id, 10);
        if (isNaN(testimonialId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Invalid testimonial ID' },
          });
        }

        const parseResult = updateTestimonialSchema.safeParse(req.body);
        if (!parseResult.success) {
          const isPii = parseResult.error.errors.some((e) =>
            e.message.toLowerCase().includes('phone number')
          );
          return reply.status(400).send({
            error: {
              code: isPii ? 'PII_DETECTED' : 'VALIDATION_ERROR',
              message: isPii
                ? 'Phone numbers or patient contact identifiers are not permitted in title or summary fields.'
                : 'Invalid update payload',
              details: parseResult.error.format(),
            },
          });
        }

        try {
          const updated = await updateTestimonial(testimonialId, parseResult.data, req.user!, req);
          return reply.status(200).send(updated);
        } catch (err: any) {
          if (err.statusCode) {
            return reply.status(err.statusCode).send({
              error: {
                code: err.code || 'ERROR',
                message: err.message,
              },
            });
          }
          throw err;
        }
      }
    );

    // 4. Deactivate Testimonial in Library
    authGroup.post(
      '/testimonials/:id/deactivate',
      { preHandler: [requirePermission(Permissions.TESTIMONIAL_MANAGE, 'lead' as any)] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const testimonialId = parseInt(id, 10);
        if (isNaN(testimonialId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Invalid testimonial ID' },
          });
        }

        try {
          const deactivated = await deactivateTestimonial(testimonialId, req.user!, req);
          return reply.status(200).send(deactivated);
        } catch (err: any) {
          if (err.statusCode) {
            return reply.status(err.statusCode).send({
              error: {
                code: err.code || 'ERROR',
                message: err.message,
              },
            });
          }
          throw err;
        }
      }
    );

    // 5. Record Testimonials Sent to Lead
    authGroup.post(
      '/leads/:id/testimonials-sent',
      { preHandler: [requirePermission(Permissions.TESTIMONIAL_SEND, 'lead' as any)] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const leadId = parseInt(id, 10);
        if (isNaN(leadId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Invalid lead ID' },
          });
        }

        const parseResult = sendTestimonialsSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid testimonial send payload',
              details: parseResult.error.format(),
            },
          });
        }

        try {
          const send = await recordLeadTestimonialSend(leadId, parseResult.data as any, req.user!, req);
          return reply.status(201).send(send);
        } catch (err: any) {
          if (err.statusCode) {
            return reply.status(err.statusCode).send({
              error: {
                code: err.code || 'ERROR',
                message: err.message,
              },
            });
          }
          throw err;
        }
      }
    );

    // 6. Edit Testimonial Send (Same day, original sender, note and time only)
    authGroup.patch(
      '/leads/:id/testimonials-sent/:sendId',
      { preHandler: [requirePermission(Permissions.TESTIMONIAL_SEND, 'lead' as any)] },
      async (req, reply) => {
        const { id, sendId } = req.params as { id: string; sendId: string };
        const leadId = parseInt(id, 10);
        const sId = parseInt(sendId, 10);
        if (isNaN(leadId) || isNaN(sId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Invalid lead ID or send ID' },
          });
        }

        const parseResult = editTestimonialSendSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid edit payload',
              details: parseResult.error.format(),
            },
          });
        }

        try {
          const updated = await editLeadTestimonialSend(leadId, sId, parseResult.data as any, req.user!, req);
          return reply.status(200).send(updated);
        } catch (err: any) {
          if (err.statusCode) {
            return reply.status(err.statusCode).send({
              error: {
                code: err.code || 'ERROR',
                message: err.message,
              },
            });
          }
          throw err;
        }
      }
    );

    // 7. Void Testimonial Send (Requires testimonial.void)
    authGroup.post(
      '/leads/:id/testimonials-sent/:sendId/void',
      { preHandler: [requirePermission(Permissions.TESTIMONIAL_VOID, 'lead' as any)] },
      async (req, reply) => {
        const { id, sendId } = req.params as { id: string; sendId: string };
        const leadId = parseInt(id, 10);
        const sId = parseInt(sendId, 10);
        if (isNaN(leadId) || isNaN(sId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Invalid lead ID or send ID' },
          });
        }

        const parseResult = voidTestimonialSendSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Void reason is required',
              details: parseResult.error.format(),
            },
          });
        }

        try {
          const voided = await voidLeadTestimonialSend(leadId, sId, parseResult.data, req.user!, req);
          return reply.status(200).send(voided);
        } catch (err: any) {
          if (err.statusCode) {
            return reply.status(err.statusCode).send({
              error: {
                code: err.code || 'ERROR',
                message: err.message,
              },
            });
          }
          throw err;
        }
      }
    );

    // 8. Lead Testimonials History
    authGroup.get(
      '/leads/:id/testimonials-sent',
      { preHandler: [requirePermission(Permissions.LEAD_VIEW, 'lead' as any)] },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const leadId = parseInt(id, 10);
        if (isNaN(leadId)) {
          return reply.status(400).send({
            error: { code: 'INVALID_ID', message: 'Invalid lead ID' },
          });
        }

        try {
          const history = await getLeadTestimonialHistory(leadId, req.user!, req);
          return reply.status(200).send(history);
        } catch (err: any) {
          if (err.statusCode) {
            return reply.status(err.statusCode).send({
              error: {
                code: err.code || 'ERROR',
                message: err.message,
              },
            });
          }
          throw err;
        }
      }
    );

    // 9. Testimonials Analytics Report
    authGroup.get(
      '/reports/testimonials',
      { preHandler: [requirePermission(Permissions.REPORT_VIEW, 'report' as any)] },
      async (req, reply) => {
        const parseResult = testimonialReportQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid report query parameters',
              details: parseResult.error.format(),
            },
          });
        }

        const data = parseResult.data;
        const report = await getTestimonialsReport(
          {
            branchId: data.branchId || data.branch_id,
            from: data.from,
            to: data.to,
          },
          req.user!
        );

        return reply.status(200).send(report);
      }
    );
  });
};

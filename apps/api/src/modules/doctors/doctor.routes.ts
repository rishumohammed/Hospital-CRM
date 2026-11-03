import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { Permissions, Roles, createDoctorSchema, updateDoctorSchema } from '@hospital-crm/shared';
import { authenticate } from '../auth/auth.middleware';
import { getEffectiveScope } from '../rbac/scope';
import {
  listDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} from './doctor.service';

const ALLOWED_MANAGE_ROLES = [
  Roles.OWNER,
  Roles.ADMIN,
  Roles.CENTER_HEAD,
  Roles.TELECALLER_MANAGER,
  Roles.PRODUCT_MANAGER,
];

async function requireDoctorManage(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    await authenticate(request, reply);
    if (reply.sent) return;
  }

  const user = request.user!;
  const hasRole = ALLOWED_MANAGE_ROLES.includes(user.roleCode as any);
  const scope = getEffectiveScope(user, Permissions.SETTINGS_MANAGE);
  const hasPerm = scope && scope !== 'none';

  if (!hasRole && !hasPerm) {
    return reply.status(403).send({
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied. Doctor directory can only be managed by administrators or center heads.',
      },
    });
  }
}

export const doctorRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // 1. List doctors (optionally filtered by department, active status, or search query)
  fastify.get('/doctors', async (request, reply) => {
    const query = request.query as {
      departmentId?: string;
      activeOnly?: string;
      search?: string;
    };

    const departmentId = query.departmentId ? parseInt(query.departmentId, 10) : undefined;
    const activeOnly = query.activeOnly === undefined ? true : query.activeOnly !== 'false';
    const search = query.search;

    const doctors = await listDoctors({
      departmentId: !isNaN(departmentId as number) ? departmentId : undefined,
      activeOnly,
      search,
    });

    return reply.send(doctors);
  });

  // 2. Get single doctor by ID
  fastify.get('/doctors/:id', async (request, reply) => {
    const { id: rawId } = request.params as { id: string };
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      return reply.status(400).send({
        error: { code: 'INVALID_ID', message: 'Doctor ID must be an integer' },
      });
    }

    const doctor = await getDoctorById(id);
    if (!doctor) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: `Doctor ${id} not found` },
      });
    }

    return reply.send(doctor);
  });

  // 3. Create doctor
  fastify.post('/doctors', { preHandler: [requireDoctorManage] }, async (request, reply) => {
    const parseResult = createDoctorSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid doctor payload',
          details: parseResult.error.format(),
        },
      });
    }

    try {
      const doctor = await createDoctor(parseResult.data, request.user, request);
      return reply.status(201).send(doctor);
    } catch (err: any) {
      return reply.status(400).send({
        error: { code: 'BAD_REQUEST', message: err.message },
      });
    }
  });

  // 4. Update doctor
  fastify.put('/doctors/:id', { preHandler: [requireDoctorManage] }, async (request, reply) => {
    const { id: rawId } = request.params as { id: string };
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      return reply.status(400).send({
        error: { code: 'INVALID_ID', message: 'Doctor ID must be an integer' },
      });
    }

    const parseResult = updateDoctorSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid update payload',
          details: parseResult.error.format(),
        },
      });
    }

    try {
      const updated = await updateDoctor(id, parseResult.data, request.user, request);
      return reply.send(updated);
    } catch (err: any) {
      const isNotFound = err.message && err.message.includes('not found');
      return reply.status(isNotFound ? 404 : 400).send({
        error: { code: isNotFound ? 'NOT_FOUND' : 'BAD_REQUEST', message: err.message },
      });
    }
  });

  // 5. Delete doctor
  fastify.delete('/doctors/:id', { preHandler: [requireDoctorManage] }, async (request, reply) => {
    const { id: rawId } = request.params as { id: string };
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      return reply.status(400).send({
        error: { code: 'INVALID_ID', message: 'Doctor ID must be an integer' },
      });
    }

    try {
      await deleteDoctor(id, request.user, request);
      return reply.send({ success: true, message: `Doctor ${id} removed` });
    } catch (err: any) {
      const isNotFound = err.message && err.message.includes('not found');
      return reply.status(isNotFound ? 404 : 400).send({
        error: { code: isNotFound ? 'NOT_FOUND' : 'BAD_REQUEST', message: err.message },
      });
    }
  });
};

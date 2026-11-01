import { PrismaClient } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { logger } from '../../logger/index';

export interface LogAuditOptions {
  userId?: number | null;
  action: string;
  entity: string;
  entityId?: number | null;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  ip?: string | null;
  userAgent?: string | null;
  req?: FastifyRequest;
}

export async function logAudit(
  prisma: PrismaClient,
  options: LogAuditOptions
) {
  try {
    const ip = options.ip || (options.req ? (options.req.headers['x-forwarded-for'] as string) || options.req.ip : null);
    const userAgent = options.userAgent || (options.req ? (options.req.headers['user-agent'] as string) : null);

    return await prisma.auditLog.create({
      data: {
        userId: options.userId ?? null,
        action: options.action,
        entity: options.entity,
        entityId: options.entityId ?? null,
        before: options.before ? (options.before as any) : undefined,
        after: options.after ? (options.after as any) : undefined,
        ip: ip ? ip.slice(0, 50) : null,
        userAgent: userAgent ? userAgent.slice(0, 255) : null,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Failed to record audit log entry');
    return null;
  }
}

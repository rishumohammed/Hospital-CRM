import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../database/client';
import { verifyAccessToken, verifyRefreshToken, generateAccessToken, TokenPayload } from './token';
import { UserContext, getEffectiveScope, ResourceType } from '../rbac/scope';
import { logAudit } from '../audit/audit.service';

declare module 'fastify' {
  interface FastifyRequest {
    user?: UserContext;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  let token: string | undefined;

  // 1. Try reading from signed or unsigned cookies
  if (request.cookies) {
    token = request.cookies.accessToken || request.cookies.token;
  }

  // 2. Try Authorization Bearer header
  if (!token && request.headers.authorization) {
    const parts = request.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  let payload: TokenPayload | null = token ? verifyAccessToken(token) : null;

  // 3. Fallback: try refresh token if access token is expired or missing
  if (!payload && request.cookies && request.cookies.refreshToken) {
    const refreshPayload = verifyRefreshToken(request.cookies.refreshToken);
    if (refreshPayload) {
      payload = refreshPayload;
      // Issue refreshed access token
      const newAccessToken = generateAccessToken(refreshPayload);
      reply.setCookie('accessToken', newAccessToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60, // 15 mins
      });
    }
  }

  if (!payload) {
    reply.status(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please log in.',
      },
    });
    return;
  }

  // Load active user with roles, permissions, branches, and active grants
  const user = await prisma.user.findFirst({
    where: {
      id: payload.userId,
      status: 'active',
      archivedAt: null,
    },
    include: {
      role: {
        include: {
          permissions: true,
        },
      },
      userBranches: true,
      userTeams: {
        include: {
          team: true,
        },
      },
      permissionGrants: {
        where: {
          endsAt: { gte: new Date() },
        },
      },
    },
  });

  if (!user) {
    reply.status(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'User account not found or deactivated.',
      },
    });
    return;
  }

  // Build permissions dictionary
  const permissions: Record<string, string> = {};
  if (user.role && user.role.permissions) {
    for (const rp of user.role.permissions) {
      permissions[rp.permission] = rp.scope;
    }
  }

  request.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    roleId: user.roleId,
    roleCode: user.role.code,
    branchIds: user.userBranches.map((ub) => ub.branchId),
    teamCodes: user.userTeams.map((ut) => ut.team.code),
    maskPhone: user.role.maskPhone,
    permissions,
    grants: user.permissionGrants.map((g) => ({
      permission: g.permission,
      scope: g.scope,
      startsAt: g.startsAt,
      endsAt: g.endsAt,
    })),
  };
}

/**
 * Middleware factory requiring a specific permission code.
 * If user does not have permission or scope is 'none', responds with 403 Forbidden
 * and logs an audit log entry.
 */
export function requirePermission(permissionCode: string, resource?: ResourceType) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      await authenticate(request, reply);
      if (reply.sent) return;
    }

    const scope = getEffectiveScope(request.user!, permissionCode);
    if (!scope || scope === 'none') {
      await logAudit(prisma, {
        userId: request.user!.id,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        entity: resource || 'system',
        before: { requiredPermission: permissionCode },
        req: request,
      });

      reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. You do not have permission '${permissionCode}'.`,
        },
      });
      return;
    }
  };
}

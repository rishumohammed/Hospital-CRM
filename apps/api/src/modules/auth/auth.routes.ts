import { FastifyPluginAsync } from 'fastify';
import { loginSchema, verifyMfaSchema, normalizePhoneNumber } from '@hospital-crm/shared';
import { prisma } from '../../database/client';
import { verifyPassword } from './password';
import {
  generateAccessToken,
  generateRefreshToken,
  generateMfaToken,
  verifyMfaToken,
  verifyRefreshToken,
} from './token';
import { isAccountLocked, recordFailedAttempt, resetFailedAttempts } from './rate-limiter';
import { verifyMfaCode } from './mfa';
import { authenticate } from './auth.middleware';
import { logAudit } from '../audit/audit.service';
import { config } from '../../config/index';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Login Endpoint
  fastify.post('/auth/login', async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid login payload',
          details: parseResult.error.format(),
        },
      });
    }

    const { identifier, password } = parseResult.data;

    // Check account lockout status (5 failed attempts / 15 minutes lockout)
    const lockStatus = isAccountLocked(identifier);
    if (lockStatus.locked) {
      await logAudit(prisma, {
        action: 'LOGIN_BLOCKED_LOCKED',
        entity: 'user',
        before: { identifier },
        req: request,
      });

      return reply.status(429).send({
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Account is temporarily locked due to 5 consecutive failed login attempts. Try again in ${lockStatus.remainingMinutes} minutes.`,
        },
      });
    }

    // Try finding user by email or normalized mobile
    const normalizedMobile = normalizePhoneNumber(identifier);
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.trim().toLowerCase() },
          ...(normalizedMobile ? [{ mobile: normalizedMobile }] : []),
        ],
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

    if (!user || user.status !== 'active') {
      const { locked, remainingAttempts } = recordFailedAttempt(identifier);
      await logAudit(prisma, {
        action: 'LOGIN_FAILED_NOT_FOUND',
        entity: 'user',
        before: { identifier },
        req: request,
      });

      return reply.status(401).send({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: locked
            ? 'Account is now locked for 15 minutes due to 5 failed attempts.'
            : `Invalid email/mobile or password. ${remainingAttempts} attempts remaining.`,
        },
      });
    }

    // Verify Password with Argon2id
    const isValid = await verifyPassword(user.passwordHash, password);
    if (!isValid) {
      const { locked, remainingAttempts } = recordFailedAttempt(identifier);
      await logAudit(prisma, {
        userId: user.id,
        action: 'LOGIN_FAILED_WRONG_PASSWORD',
        entity: 'user',
        req: request,
      });

      return reply.status(401).send({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: locked
            ? 'Account is now locked for 15 minutes due to 5 failed attempts.'
            : `Invalid email/mobile or password. ${remainingAttempts} attempts remaining.`,
        },
      });
    }

    // Reset failed attempts on valid password
    resetFailedAttempts(identifier);

    // Check if MFA is required
    const mfaRequired = Boolean(user.mfaSecret && (config.MFA_ENABLED_DEFAULT || user.mfaSecret.length > 0));
    if (mfaRequired && user.mfaSecret) {
      const tempToken = generateMfaToken({ userId: user.id, email: user.email });
      return reply.send({
        mfaRequired: true,
        tempToken,
      });
    }

    // Issue Session Tokens
    const branchIds = user.userBranches.map((ub) => ub.branchId);
    const teamCodes = user.userTeams.map((ut) => ut.team.code);

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      roleCode: user.role.code,
      branchIds,
      teamCodes,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      roleCode: user.role.code,
      branchIds,
      teamCodes,
    });

    // Set secure httpOnly cookies
    reply.setCookie('accessToken', accessToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
    });

    reply.setCookie('refreshToken', refreshToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Log successful login audit
    await logAudit(prisma, {
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entity: 'user',
      entityId: user.id,
      req: request,
    });

    // Build permissions dictionary
    const permissions: Record<string, string> = {};
    if (user.role && user.role.permissions) {
      for (const rp of user.role.permissions) {
        permissions[rp.permission] = rp.scope;
      }
    }

    return reply.send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        language: user.language,
        role: {
          id: user.role.id,
          code: user.role.code,
          name: user.role.name,
          maskPhone: user.role.maskPhone,
        },
        branchIds,
        teamCodes,
        permissions,
      },
      accessToken,
    });
  });

  // Verify MFA Endpoint
  fastify.post('/auth/mfa/verify', async (request, reply) => {
    const parseResult = verifyMfaSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid MFA verification payload',
          details: parseResult.error.format(),
        },
      });
    }

    const { tempToken, code } = parseResult.data;
    const mfaPayload = verifyMfaToken(tempToken);
    if (!mfaPayload) {
      return reply.status(401).send({
        error: {
          code: 'INVALID_TEMP_TOKEN',
          message: 'Temporary MFA verification token has expired or is invalid.',
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: mfaPayload.userId },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
        userBranches: true,
        userTeams: { include: { team: true } },
      },
    });

    if (!user || !user.mfaSecret || !verifyMfaCode(user.mfaSecret, code)) {
      await logAudit(prisma, {
        userId: mfaPayload.userId,
        action: 'MFA_VERIFY_FAILED',
        entity: 'user',
        req: request,
      });

      return reply.status(401).send({
        error: {
          code: 'INVALID_MFA_CODE',
          message: 'Invalid 6-digit TOTP code.',
        },
      });
    }

    const branchIds = user.userBranches.map((ub) => ub.branchId);
    const teamCodes = user.userTeams.map((ut) => ut.team.code);

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      roleCode: user.role.code,
      branchIds,
      teamCodes,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      roleCode: user.role.code,
      branchIds,
      teamCodes,
    });

    reply.setCookie('accessToken', accessToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60,
    });

    reply.setCookie('refreshToken', refreshToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
    });

    await logAudit(prisma, {
      userId: user.id,
      action: 'LOGIN_SUCCESS_MFA',
      entity: 'user',
      entityId: user.id,
      req: request,
    });

    // Build permissions dictionary
    const permissions: Record<string, string> = {};
    if (user.role && user.role.permissions) {
      for (const rp of user.role.permissions) {
        permissions[rp.permission] = rp.scope;
      }
    }

    return reply.send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: {
          id: user.role.id,
          code: user.role.code,
          name: user.role.name,
          maskPhone: user.role.maskPhone,
        },
        branchIds,
        teamCodes,
        permissions,
      },
      accessToken,
    });
  });

  // Logout Endpoint
  fastify.post('/auth/logout', async (request, reply) => {
    reply.clearCookie('accessToken', { path: '/' });
    reply.clearCookie('refreshToken', { path: '/' });

    if (request.cookies?.accessToken) {
      const payload = verifyRefreshToken(request.cookies.accessToken);
      if (payload) {
        await logAudit(prisma, {
          userId: payload.userId,
          action: 'LOGOUT',
          entity: 'user',
          req: request,
        });
      }
    }

    return reply.send({ success: true, message: 'Logged out successfully' });
  });

  // Refresh Token Endpoint
  fastify.post('/auth/refresh', async (request, reply) => {
    let token: string | undefined = request.cookies?.refreshToken;
    if (!token && (request.body as any)?.refreshToken) {
      token = (request.body as any).refreshToken;
    }

    if (!token) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Refresh token is missing',
        },
      });
    }

    const payload = verifyRefreshToken(token);
    if (!payload) {
      return reply.status(401).send({
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token is expired or invalid',
        },
      });
    }

    const user = await prisma.user.findFirst({
      where: { id: payload.userId, status: 'active', archivedAt: null },
      include: {
        role: true,
        userBranches: true,
        userTeams: { include: { team: true } },
      },
    });

    if (!user) {
      return reply.status(401).send({
        error: {
          code: 'USER_DEACTIVATED',
          message: 'User account is no longer active',
        },
      });
    }

    const branchIds = user.userBranches.map((ub) => ub.branchId);
    const teamCodes = user.userTeams.map((ut) => ut.team.code);

    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      roleCode: user.role.code,
      branchIds,
      teamCodes,
    });

    reply.setCookie('accessToken', newAccessToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60,
    });

    return reply.send({ accessToken: newAccessToken });
  });

  // Current User Profile Endpoint
  fastify.get('/auth/me', { preHandler: [authenticate] }, async (request, reply) => {
    const user = request.user!;
    const freshAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      roleCode: user.roleCode,
      branchIds: user.branchIds,
      teamCodes: user.teamCodes,
    });
    return reply.send({
      user: request.user,
      accessToken: freshAccessToken,
    });
  });
};

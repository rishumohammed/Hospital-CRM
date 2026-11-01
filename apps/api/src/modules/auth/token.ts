import crypto from 'node:crypto';
import { config } from '../../config/index';

export interface TokenPayload {
  userId: number;
  email: string;
  roleCode: string;
  branchIds: number[];
  teamCodes: string[];
  type?: 'access' | 'refresh' | 'mfa';
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf8');
}

export function signJwt(
  payload: Record<string, any>,
  secret: string,
  expiresInSeconds: number
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyJwt<T = Record<string, any>>(token: string, secret: string): T | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    // Constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload as T;
  } catch {
    return null;
  }
}

export function generateAccessToken(payload: TokenPayload): string {
  return signJwt({ ...payload, type: 'access' }, config.JWT_ACCESS_SECRET, 15 * 60); // 15 minutes
}

export function generateRefreshToken(payload: TokenPayload): string {
  return signJwt({ ...payload, type: 'refresh' }, config.JWT_REFRESH_SECRET, 7 * 24 * 60 * 60); // 7 days
}

export function generateMfaToken(payload: { userId: number; email: string }): string {
  return signJwt({ ...payload, type: 'mfa' }, config.JWT_ACCESS_SECRET, 5 * 60); // 5 minutes
}

export function verifyAccessToken(token: string): TokenPayload | null {
  const payload = verifyJwt<TokenPayload>(token, config.JWT_ACCESS_SECRET);
  if (!payload || payload.type !== 'access') return null;
  return payload;
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  const payload = verifyJwt<TokenPayload>(token, config.JWT_REFRESH_SECRET);
  if (!payload || payload.type !== 'refresh') return null;
  return payload;
}

export function verifyMfaToken(token: string): { userId: number; email: string } | null {
  const payload = verifyJwt<any>(token, config.JWT_ACCESS_SECRET);
  if (!payload || payload.type !== 'mfa') return null;
  return { userId: payload.userId, email: payload.email };
}

import * as OTPAuth from 'otpauth';

export function createTotpInstance(secret: string, label: string = 'User') {
  return new OTPAuth.TOTP({
    issuer: 'Hospital CRM',
    label,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

export function generateMfaSecret(label: string = 'User') {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: 'Hospital CRM',
    label,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  return {
    secret: secret.base32,
    uri: totp.toString(),
  };
}

export function verifyMfaCode(secret: string, code: string): boolean {
  if (!secret || !code) return false;
  try {
    const totp = createTotpInstance(secret);
    // delta is null if invalid, or number of periods offset if valid
    const delta = totp.validate({ token: code.trim(), window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
}

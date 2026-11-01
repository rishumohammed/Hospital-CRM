import pino from 'pino';

export const pinoRedactionPaths = [
  'password',
  'passwordHash',
  'mfaSecret',
  'token',
  'refreshToken',
  'accessToken',
  'mobile',
  'altMobile',
  'mobileNorm',
  'altMobileNorm',
  'name',
  'doctorName',
  'concern',
  'note',
  'notes',
  'reason',
  '*.password',
  '*.*.password',
  '*.mobile',
  '*.*.mobile',
  '*.name',
  '*.*.name',
  '*.concern',
  '*.*.concern',
  '*.note',
  '*.*.note',
  'req.body.password',
  'req.body.mobile',
  'req.body.altMobile',
  'req.body.name',
  'req.body.concern',
  'req.body.note',
  'req.headers.authorization',
  'req.headers.cookie',
];

export function createLogger(options?: pino.LoggerOptions) {
  const isTest = process.env.NODE_ENV === 'test';
  const pinoFactory = (typeof pino === 'function' ? pino : (pino as any).default || (pino as any).pino) as typeof pino;
  return pinoFactory({
    level: isTest ? 'silent' : (process.env.LOG_LEVEL || 'info'),
    redact: {
      paths: pinoRedactionPaths,
      censor: '[REDACTED]',
    },
    ...options,
  });
}

export const logger = createLogger();

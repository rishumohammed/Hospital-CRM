import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

// Load .env from workspace root or current package directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const configSchema = z.object({
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.string().default('info'),
  JWT_ACCESS_SECRET: z.string().min(16).default('dev-jwt-access-secret-minimum-32-chars-key'),
  JWT_REFRESH_SECRET: z.string().min(16).default('dev-jwt-refresh-secret-minimum-32-chars-key'),
  COOKIE_SECRET: z.string().min(16).default('dev-cookie-secret-minimum-32-chars-key'),
  SESSION_IDLE_TIMEOUT_MINUTES: z.coerce.number().default(30),
  MFA_ENABLED_DEFAULT: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
});

// If DATABASE_URL is not explicitly provided, or if DB_PASSWORD is provided, construct safely with encoded special characters
if (!process.env.DATABASE_URL && process.env.DB_PASSWORD) {
  const user = encodeURIComponent(process.env.DB_USER || 'crm_user');
  const pass = encodeURIComponent(process.env.DB_PASSWORD);
  const host = process.env.DB_HOST || 'mysql';
  const port = process.env.DB_PORT || '3306';
  const name = process.env.DB_NAME || 'hospital_crm';
  process.env.DATABASE_URL = `mysql://${user}:${pass}@${host}:${port}/${name}?charset=utf8mb4`;
}

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.format());
  throw new Error('Invalid environment configuration');
}

export const config = parsed.data;

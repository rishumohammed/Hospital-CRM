import { prisma } from '../../database/client';

export interface CallingHoursSetting {
  start: string; // "09:00"
  end: string;   // "20:00"
  timezone: string; // "Asia/Kolkata"
  enforce: boolean;
}

export interface SlaMinutesSetting {
  meta_ads: number;
  google_ads: number;
  default: number;
  business_hours_only: boolean;
}

export interface ContactRulesSetting {
  max_calls_per_day: number;
  max_attempts_per_cycle: number;
  warn_on_excess: boolean;
}

export interface QuietHoursSetting {
  enabled: boolean;
  start: string;
  end: string;
}

const defaultFallbacks: Record<string, any> = {
  calling_hours: {
    start: '09:00',
    end: '20:00',
    timezone: 'Asia/Kolkata',
    enforce: true,
  },
  sla_minutes: {
    meta_ads: 5,
    google_ads: 5,
    default: 15,
    business_hours_only: true,
  },
  contact_rules: {
    max_calls_per_day: 1,
    max_attempts_per_cycle: 3,
    warn_on_excess: true,
  },
  quiet_hours: {
    enabled: true,
    start: '20:00',
    end: '09:00',
  },
  retention_policies: {
    leads_days: 1825,
    audit_days: 2555,
  },
};

export async function getSetting<T = any>(key: string, defaultValue?: T): Promise<T> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  if (setting && setting.value) {
    return setting.value as T;
  }
  return defaultValue !== undefined ? defaultValue : defaultFallbacks[key];
}

export async function getAllSettings(): Promise<Record<string, any>> {
  const settings = await prisma.setting.findMany();
  const result = { ...defaultFallbacks };
  for (const s of settings) {
    result[s.key] = s.value;
  }
  return result;
}

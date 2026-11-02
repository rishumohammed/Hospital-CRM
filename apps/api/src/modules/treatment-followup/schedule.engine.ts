import { addDays, format, parseISO, isBefore, isAfter, isEqual } from 'date-fns';
import { FrequencyTypes, VisitStatuses } from '@hospital-crm/shared';

export interface BranchScheduleConfig {
  openDays: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  holidays: string[]; // YYYY-MM-DD
}

export interface GenerateVisitsInput {
  startDate: string | Date; // YYYY-MM-DD or Date
  endDate?: string | Date | null;
  totalSessions?: number | null;
  frequencyType: string;
  intervalN?: number | null;
  weekdays?: (number | string)[] | null;
  customDates?: (string | Date)[] | null;
  windowStart: string; // HH:mm
  windowEnd: string;   // HH:mm
  config: BranchScheduleConfig;
  startSessionNo?: number; // default 1
  maxSessionsCap?: number; // default 150
}

export interface GeneratedVisitPreview {
  sessionNo: number;
  scheduledDate: string; // YYYY-MM-DD
  windowStart: string;
  windowEnd: string;
  status: string;
  movedFromDate?: string | null;
  movedReason?: string | null;
}

/**
 * Normalizes weekday representations to 0-6 (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 */
export function normalizeWeekday(day: number | string): number {
  if (typeof day === 'number') {
    return ((day % 7) + 7) % 7;
  }
  const clean = day.trim().toLowerCase();
  switch (clean) {
    case 'sunday':
    case 'sun':
      return 0;
    case 'monday':
    case 'mon':
      return 1;
    case 'tuesday':
    case 'tue':
      return 2;
    case 'wednesday':
    case 'wed':
      return 3;
    case 'thursday':
    case 'thu':
      return 4;
    case 'friday':
    case 'fri':
      return 5;
    case 'saturday':
    case 'sat':
      return 6;
    default:
      const parsed = parseInt(clean, 10);
      return isNaN(parsed) ? 1 : ((parsed % 7) + 7) % 7;
  }
}

/**
 * Formats a Date object to YYYY-MM-DD in local/calendar time
 */
export function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD string into a local Date (00:00:00)
 */
export function parseLocalDate(input: string | Date): Date {
  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }
  const parts = input.split('T')[0].split('-');
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

/**
 * Checks whether the branch is open on a given date
 */
export function isBranchOpen(date: Date, config: BranchScheduleConfig): boolean {
  const dateStr = formatDate(date);
  if (config.holidays && config.holidays.includes(dateStr)) {
    return false;
  }
  const dayOfWeek = date.getDay();
  const openDays = config.openDays && config.openDays.length > 0 ? config.openDays : [1, 2, 3, 4, 5, 6];
  return openDays.includes(dayOfWeek);
}

/**
 * Carries a date forward to the next open day if closed
 */
export function getNextOpenDate(
  date: Date,
  config: BranchScheduleConfig
): { date: Date; moved: boolean } {
  let curr = new Date(date);
  let moved = false;
  let safetyCount = 0;

  while (!isBranchOpen(curr, config) && safetyCount < 365) {
    curr = addDays(curr, 1);
    moved = true;
    safetyCount++;
  }

  return { date: curr, moved };
}

/**
 * Pure generator function to preview or generate visit schedule dates
 */
export function generateScheduleVisits(input: GenerateVisitsInput): GeneratedVisitPreview[] {
  const cap = input.maxSessionsCap ?? 150;
  const startSessionNo = input.startSessionNo ?? 1;

  const startDate = parseLocalDate(input.startDate);
  const endDate = input.endDate ? parseLocalDate(input.endDate) : null;
  const targetSessions = input.totalSessions ? Math.min(input.totalSessions, cap) : null;

  const results: GeneratedVisitPreview[] = [];
  const freq = input.frequencyType;
  const config: BranchScheduleConfig = {
    openDays: (input.config.openDays || [1, 2, 3, 4, 5, 6]).map(normalizeWeekday),
    holidays: input.config.holidays || [],
  };

  // Helper to add a session to results
  const addSession = (scheduledDate: Date, originalDate?: Date) => {
    if (results.length >= cap) return false;
    if (targetSessions !== null && results.length >= targetSessions) return false;
    if (endDate !== null && isAfter(scheduledDate, endDate) && !targetSessions) return false;

    const sessionNo = startSessionNo + results.length;
    const moved = originalDate && !isEqual(scheduledDate, originalDate);

    results.push({
      sessionNo,
      scheduledDate: formatDate(scheduledDate),
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      status: VisitStatuses.PLANNED,
      movedFromDate: moved ? formatDate(originalDate!) : null,
      movedReason: moved ? 'Branch closed / holiday' : null,
    });

    return true;
  };

  // --- 1. CUSTOM DATES ---
  if (freq === FrequencyTypes.CUSTOM_DATES) {
    const rawDates = (input.customDates || []).map(parseLocalDate);
    rawDates.sort((a, b) => a.getTime() - b.getTime());

    for (const raw of rawDates) {
      if (endDate && isAfter(raw, endDate) && !targetSessions) break;
      const { date: openDate, moved } = getNextOpenDate(raw, config);
      const added = addSession(openDate, moved ? raw : undefined);
      if (!added) break;
    }
    return results;
  }

  // --- 2. DAILY ---
  if (freq === FrequencyTypes.DAILY) {
    let curr = new Date(startDate);
    let attempts = 0;

    while (attempts < 1000) {
      attempts++;
      if (targetSessions !== null && results.length >= targetSessions) break;
      if (endDate !== null && isAfter(curr, endDate) && targetSessions === null) break;
      if (results.length >= cap) break;

      if (isBranchOpen(curr, config)) {
        addSession(curr);
      }
      curr = addDays(curr, 1);
    }
    return results;
  }

  // --- 3. WEEKLY ---
  if (freq === FrequencyTypes.WEEKLY) {
    const weekdays = (input.weekdays && input.weekdays.length > 0
      ? input.weekdays.map(normalizeWeekday)
      : [startDate.getDay()]
    ).sort((a, b) => a - b);

    let curr = new Date(startDate);
    let attempts = 0;

    // Advance curr until the first matching weekday on or after startDate
    while (!weekdays.includes(curr.getDay()) && attempts < 14) {
      curr = addDays(curr, 1);
      attempts++;
    }

    attempts = 0;
    while (attempts < 1500) {
      attempts++;
      if (targetSessions !== null && results.length >= targetSessions) break;
      if (endDate !== null && isAfter(curr, endDate) && targetSessions === null) break;
      if (results.length >= cap) break;

      if (weekdays.includes(curr.getDay())) {
        const { date: openDate, moved } = getNextOpenDate(curr, config);
        const added = addSession(openDate, moved ? curr : undefined);
        if (!added) break;
      }

      curr = addDays(curr, 1);
    }
    return results;
  }

  // --- 4. ALTERNATE DAYS ---
  if (freq === FrequencyTypes.ALTERNATE_DAYS) {
    let idealDate = new Date(startDate);
    let attempts = 0;

    while (attempts < 1000) {
      attempts++;
      if (targetSessions !== null && results.length >= targetSessions) break;
      if (endDate !== null && isAfter(idealDate, endDate) && targetSessions === null) break;
      if (results.length >= cap) break;

      const { date: openDate, moved } = getNextOpenDate(idealDate, config);
      const added = addSession(openDate, moved ? idealDate : undefined);
      if (!added) break;

      idealDate = addDays(idealDate, 2);
    }
    return results;
  }

  // --- 5. EVERY N DAYS ---
  if (freq === FrequencyTypes.EVERY_N_DAYS) {
    const interval = Math.max(1, input.intervalN || 3);
    let idealDate = new Date(startDate);
    let attempts = 0;

    while (attempts < 1000) {
      attempts++;
      if (targetSessions !== null && results.length >= targetSessions) break;
      if (endDate !== null && isAfter(idealDate, endDate) && targetSessions === null) break;
      if (results.length >= cap) break;

      const { date: openDate, moved } = getNextOpenDate(idealDate, config);
      const added = addSession(openDate, moved ? idealDate : undefined);
      if (!added) break;

      idealDate = addDays(idealDate, interval);
    }
    return results;
  }

  // --- 6. CUSTOM WEEKDAYS ---
  if (freq === FrequencyTypes.CUSTOM_WEEKDAYS) {
    const targetDays = (input.weekdays || [1, 3, 5]).map(normalizeWeekday);
    let curr = new Date(startDate);
    let attempts = 0;

    while (attempts < 1500) {
      attempts++;
      if (targetSessions !== null && results.length >= targetSessions) break;
      if (endDate !== null && isAfter(curr, endDate) && targetSessions === null) break;
      if (results.length >= cap) break;

      if (targetDays.includes(curr.getDay())) {
        const { date: openDate, moved } = getNextOpenDate(curr, config);
        const added = addSession(openDate, moved ? curr : undefined);
        if (!added) break;
      }

      curr = addDays(curr, 1);
    }
    return results;
  }

  return results;
}

/**
 * Regenerates only future planned visits when a schedule is updated
 */
export function regenerateFutureVisits(
  existingVisits: Array<{
    id?: number;
    sessionNo: number;
    scheduledDate: string | Date;
    status: string;
    windowStart: string;
    windowEnd: string;
    movedFromDate?: string | Date | null;
    movedReason?: string | null;
  }>,
  scheduleUpdate: GenerateVisitsInput,
  currentDateStr: string // YYYY-MM-DD
): {
  keptVisits: typeof existingVisits;
  newVisits: GeneratedVisitPreview[];
} {
  const current = parseLocalDate(currentDateStr);

  // Keep visits that are in the past or non-planned (attended, missed, excused, etc.)
  const keptVisits = existingVisits.filter((v) => {
    const vDate = parseLocalDate(v.scheduledDate);
    const isPast = isBefore(vDate, current);
    const isNotPlanned = v.status !== VisitStatuses.PLANNED;
    return isPast || isNotPlanned;
  });

  const remainingSessionsNeeded = scheduleUpdate.totalSessions
    ? Math.max(0, scheduleUpdate.totalSessions - keptVisits.length)
    : null;

  // Determine starting date for new visits
  const lastKeptDate = keptVisits.length > 0
    ? parseLocalDate(keptVisits[keptVisits.length - 1].scheduledDate)
    : null;

  const regenStartDate = lastKeptDate && isAfter(lastKeptDate, current)
    ? addDays(lastKeptDate, 1)
    : current;

  const newVisits = generateScheduleVisits({
    ...scheduleUpdate,
    startDate: regenStartDate,
    totalSessions: remainingSessionsNeeded,
    startSessionNo: keptVisits.length + 1,
  });

  return { keptVisits, newVisits };
}

/**
 * Calculates adherence metrics from a case's scheduled visits
 */
export function calculateAdherenceMetrics(
  visits: Array<{
    scheduledDate: string | Date;
    status: string;
  }>,
  thresholds: {
    mediumRiskRate?: number; // e.g. 80
    highRiskRate?: number;   // e.g. 60
  } = {}
) {
  const mediumThreshold = thresholds.mediumRiskRate ?? 80;
  const highThreshold = thresholds.highRiskRate ?? 60;

  // Filter visits that were due (attended or missed)
  const dueVisits = visits.filter((v) =>
    v.status === VisitStatuses.ATTENDED || v.status === VisitStatuses.MISSED
  );

  const attendedVisits = dueVisits.filter((v) => v.status === VisitStatuses.ATTENDED);
  const attendanceRate = dueVisits.length > 0
    ? Math.round((attendedVisits.length / dueVisits.length) * 100 * 10) / 10
    : 100.0;

  // Compute consecutive missed visits working backwards from most recent due visit
  const sortedDue = [...dueVisits].sort((a, b) =>
    parseLocalDate(b.scheduledDate).getTime() - parseLocalDate(a.scheduledDate).getTime()
  );

  let consecutiveMissed = 0;
  for (const v of sortedDue) {
    if (v.status === VisitStatuses.MISSED) {
      consecutiveMissed++;
    } else {
      break;
    }
  }

  // Last attended date
  const sortedAttended = [...attendedVisits].sort((a, b) =>
    parseLocalDate(b.scheduledDate).getTime() - parseLocalDate(a.scheduledDate).getTime()
  );
  const lastAttendedAt = sortedAttended.length > 0
    ? parseLocalDate(sortedAttended[0].scheduledDate)
    : null;

  // Next planned visit date
  const plannedVisits = visits
    .filter((v) => v.status === VisitStatuses.PLANNED)
    .sort((a, b) =>
      parseLocalDate(a.scheduledDate).getTime() - parseLocalDate(b.scheduledDate).getTime()
    );
  const nextVisitAt = plannedVisits.length > 0
    ? parseLocalDate(plannedVisits[0].scheduledDate)
    : null;

  // Determine risk
  // High risk: 2 consecutive missed visits OR attendance_rate < highThreshold (60%)
  // Medium risk: 1 missed in last 3 OR attendance_rate < mediumThreshold (80%)
  const last3Due = sortedDue.slice(0, 3);
  const missedInLast3 = last3Due.filter((v) => v.status === VisitStatuses.MISSED).length;

  let adherenceRisk: 'low' | 'medium' | 'high' = 'low';

  if (consecutiveMissed >= 2 || (dueVisits.length > 0 && attendanceRate < highThreshold)) {
    adherenceRisk = 'high';
  } else if (missedInLast3 >= 1 || (dueVisits.length > 0 && attendanceRate < mediumThreshold)) {
    adherenceRisk = 'medium';
  }

  return {
    attendanceRate,
    consecutiveMissed,
    lastAttendedAt,
    nextVisitAt,
    adherenceRisk,
  };
}

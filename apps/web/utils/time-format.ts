/**
 * Format a duration in minutes into a human-readable string:
 * - < 1 minute: "<1m"
 * - < 1 hour: "Xm" (e.g. "45m")
 * - < 24 hours: "Xh Ym" or "Xh" (e.g. "1h 30m", "4h")
 * - < 30 days: "Xd Yh" or "Xd" (e.g. "2d 23h", "2d 7h", "1d 9h", "3d")
 * - < 365 days: "Xmo Yd" or "Xmo" (e.g. "1mo 12d", "2mo")
 * - >= 365 days: "Xy Ymo" or "Xy" (e.g. "1y 2mo", "2y")
 */
export function formatDurationHuman(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(Math.abs(totalMinutes)));

  if (mins === 0) return '<1m';
  if (mins < 60) return `${mins}m`;

  const MINUTES_IN_HOUR = 60;
  const MINUTES_IN_DAY = 24 * 60; // 1,440
  const MINUTES_IN_MONTH = 30 * MINUTES_IN_DAY; // 43,200
  const MINUTES_IN_YEAR = 365 * MINUTES_IN_DAY; // 525,600

  // 1 Year or more
  if (mins >= MINUTES_IN_YEAR) {
    const y = Math.floor(mins / MINUTES_IN_YEAR);
    const remMins = mins % MINUTES_IN_YEAR;
    const mo = Math.floor(remMins / MINUTES_IN_MONTH);
    return mo > 0 ? `${y}y ${mo}mo` : `${y}y`;
  }

  // 1 Month to 11 Months
  if (mins >= MINUTES_IN_MONTH) {
    const mo = Math.floor(mins / MINUTES_IN_MONTH);
    const remMins = mins % MINUTES_IN_MONTH;
    const d = Math.floor(remMins / MINUTES_IN_DAY);
    return d > 0 ? `${mo}mo ${d}d` : `${mo}mo`;
  }

  // 1 Day to 29 Days
  if (mins >= MINUTES_IN_DAY) {
    const d = Math.floor(mins / MINUTES_IN_DAY);
    const remMins = mins % MINUTES_IN_DAY;
    const h = Math.floor(remMins / MINUTES_IN_HOUR);
    const m = remMins % MINUTES_IN_HOUR;
    if (h > 0) return `${d}d ${h}h`;
    if (m > 0 && d <= 2) return `${d}d ${m}m`;
    return `${d}d`;
  }

  // 1 Hour to 23 Hours
  const h = Math.floor(mins / MINUTES_IN_HOUR);
  const m = mins % MINUTES_IN_HOUR;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Format First-Response SLA badge text on Leads table:
 * If breached: "Breached by 2d 23h"
 * If remaining: "15m SLA" or "1h 30m SLA" or "2d 4h SLA"
 */
export function formatSlaTimer(dueAtStr: string | Date | number, now = Date.now()): string {
  const dueMs = typeof dueAtStr === 'number' ? dueAtStr : new Date(dueAtStr).getTime();
  const diffMs = dueMs - now;
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin <= 0) {
    return `Breached by ${formatDurationHuman(Math.abs(diffMin))}`;
  }
  return `${formatDurationHuman(diffMin)} SLA`;
}

/**
 * Format SLA Countdown on Dashboard cards:
 * If breached: "BREACHED (-2d 23h)"
 * If remaining < 60m: "14m 32s left"
 * If remaining >= 60m: "1h 30m left"
 */
export function formatSlaRemaining(dueAtStr: string | Date | number, now = Date.now()): string {
  const dueMs = typeof dueAtStr === 'number' ? dueAtStr : new Date(dueAtStr).getTime();
  const diffMs = dueMs - now;

  if (diffMs <= 0) {
    const overdueMin = Math.max(1, Math.floor(Math.abs(diffMs) / 60000));
    return `BREACHED (-${formatDurationHuman(overdueMin)})`;
  }

  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) {
    const sec = Math.floor((diffMs % 60000) / 1000);
    return `${diffMin}m ${sec}s left`;
  }

  return `${formatDurationHuman(diffMin)} left`;
}

/**
 * Format Overdue Due Label on Follow-ups page:
 * If overdue: "Overdue (-2d 23h)" or "Overdue (-45m)"
 * If today: "Today at 10:00 AM"
 * If future: "Nov 12"
 */
export function formatFollowUpDueLabel(dueAtStr: string | Date | number, now = Date.now()): string {
  const dueDate = new Date(dueAtStr);
  const diffMs = dueDate.getTime() - now;

  if (diffMs < 0) {
    const overdueMin = Math.max(1, Math.floor(Math.abs(diffMs) / 60000));
    return `Overdue (-${formatDurationHuman(overdueMin)})`;
  }

  const isToday = dueDate.toDateString() === new Date(now).toDateString();
  if (isToday) {
    return `Today at ${dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  return dueDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
}


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


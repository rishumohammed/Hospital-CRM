interface AttemptRecord {
  count: number;
  lockedUntil: number | null;
  firstAttemptAt: number;
}

const attemptsMap = new Map<string, AttemptRecord>();

const MAX_FAILURES = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const WINDOW_DURATION_MS = 15 * 60 * 1000;

export function isAccountLocked(identifier: string): { locked: boolean; remainingMinutes?: number } {
  const key = identifier.toLowerCase().trim();
  const record = attemptsMap.get(key);
  if (!record) return { locked: false };

  const now = Date.now();
  if (record.lockedUntil) {
    if (now < record.lockedUntil) {
      const remainingMs = record.lockedUntil - now;
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
      return { locked: true, remainingMinutes };
    } else {
      // Lockout expired, reset record
      attemptsMap.delete(key);
      return { locked: false };
    }
  }

  // Clear if beyond window
  if (now - record.firstAttemptAt > WINDOW_DURATION_MS) {
    attemptsMap.delete(key);
    return { locked: false };
  }

  return { locked: false };
}

export function recordFailedAttempt(identifier: string): { locked: boolean; remainingAttempts: number } {
  const key = identifier.toLowerCase().trim();
  const now = Date.now();
  const record = attemptsMap.get(key);

  if (!record || now - record.firstAttemptAt > WINDOW_DURATION_MS) {
    attemptsMap.set(key, {
      count: 1,
      lockedUntil: null,
      firstAttemptAt: now,
    });
    return { locked: false, remainingAttempts: MAX_FAILURES - 1 };
  }

  record.count += 1;

  if (record.count >= MAX_FAILURES) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    return { locked: true, remainingAttempts: 0 };
  }

  return { locked: false, remainingAttempts: MAX_FAILURES - record.count };
}

export function resetFailedAttempts(identifier: string): void {
  attemptsMap.delete(identifier.toLowerCase().trim());
}

export function _clearAllAttempts(): void {
  attemptsMap.clear();
}

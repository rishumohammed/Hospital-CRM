import { describe, it, expect } from 'vitest';
import {
  formatDurationHuman,
  formatSlaTimer,
  formatSlaRemaining,
  formatFollowUpDueLabel,
} from '../utils/time-format';

describe('time-format utils', () => {
  describe('formatDurationHuman', () => {
    it('formats minutes under 1 hour correctly', () => {
      expect(formatDurationHuman(0)).toBe('<1m');
      expect(formatDurationHuman(5)).toBe('5m');
      expect(formatDurationHuman(45)).toBe('45m');
      expect(formatDurationHuman(59)).toBe('59m');
    });

    it('formats hours and minutes correctly', () => {
      expect(formatDurationHuman(60)).toBe('1h');
      expect(formatDurationHuman(75)).toBe('1h 15m');
      expect(formatDurationHuman(120)).toBe('2h');
      expect(formatDurationHuman(150)).toBe('2h 30m');
    });

    it('formats days and hours correctly (including user examples 2000m, 3302m, 4277m)', () => {
      // 1440m = 1 day exactly
      expect(formatDurationHuman(1440)).toBe('1d');
      // 2000m = 1 day 9 hours 20 mins -> 1d 9h
      expect(formatDurationHuman(2000)).toBe('1d 9h');
      // 3302m = 2 days 7 hours 2 mins -> 2d 7h
      expect(formatDurationHuman(3302)).toBe('2d 7h');
      // 4277m = 2 days 23 hours 17 mins -> 2d 23h
      expect(formatDurationHuman(4277)).toBe('2d 23h');
      // 7200m = 5 days exactly
      expect(formatDurationHuman(7200)).toBe('5d');
    });

    it('formats months and days correctly', () => {
      // 43200m = 1 month (30 days)
      expect(formatDurationHuman(43200)).toBe('1mo');
      // 43200 + 1440*5 = 1mo 5d
      expect(formatDurationHuman(50400)).toBe('1mo 5d');
      // 2 months 10 days
      expect(formatDurationHuman(43200 * 2 + 1440 * 10)).toBe('2mo 10d');
    });

    it('formats years and months correctly', () => {
      // 525600m = 365 days
      expect(formatDurationHuman(525600)).toBe('1y');
      // 1 year 2 months
      expect(formatDurationHuman(525600 + 43200 * 2)).toBe('1y 2mo');
    });
  });

  describe('formatSlaTimer', () => {
    it('formats breached SLA with human readable time', () => {
      const now = 1700000000000;
      // 4277 minutes ago
      const dueAt = now - 4277 * 60 * 1000;
      expect(formatSlaTimer(dueAt, now)).toBe('Breached by 2d 23h');

      // 3302 minutes ago
      const dueAt2 = now - 3302 * 60 * 1000;
      expect(formatSlaTimer(dueAt2, now)).toBe('Breached by 2d 7h');

      // 15 minutes ago
      const dueAt3 = now - 15 * 60 * 1000;
      expect(formatSlaTimer(dueAt3, now)).toBe('Breached by 15m');
    });

    it('formats active remaining SLA', () => {
      const now = 1700000000000;
      // 15 minutes left
      const dueAt = now + 15 * 60 * 1000;
      expect(formatSlaTimer(dueAt, now)).toBe('15m SLA');

      // 2 hours left
      const dueAt2 = now + 120 * 60 * 1000;
      expect(formatSlaTimer(dueAt2, now)).toBe('2h SLA');
    });
  });

  describe('formatSlaRemaining', () => {
    it('formats breached countdown badge', () => {
      const now = 1700000000000;
      const dueAt = now - 4277 * 60 * 1000;
      expect(formatSlaRemaining(dueAt, now)).toBe('BREACHED (-2d 23h)');
    });

    it('formats remaining countdown under 1 hour with seconds', () => {
      const now = 1700000000000;
      const dueAt = now + (14 * 60 + 30) * 1000;
      expect(formatSlaRemaining(dueAt, now)).toBe('14m 30s left');
    });

    it('formats remaining countdown over 1 hour', () => {
      const now = 1700000000000;
      const dueAt = now + 90 * 60 * 1000;
      expect(formatSlaRemaining(dueAt, now)).toBe('1h 30m left');
    });
  });

  describe('formatFollowUpDueLabel', () => {
    it('formats overdue follow-ups', () => {
      const now = 1700000000000;
      const dueAt = now - 3302 * 60 * 1000;
      expect(formatFollowUpDueLabel(dueAt, now)).toBe('Overdue (-2d 7h)');
    });
  });
});


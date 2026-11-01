import { describe, it, expect } from 'vitest';
import { calculateStepDueAt } from './cadence.service';
import { toZonedTime } from 'date-fns-tz';

describe('Cadence Due Time Calculations', () => {
  it('calculates minute offsets accurately', () => {
    const base = new Date('2026-11-01T10:00:00.000Z');
    const due = calculateStepDueAt(base, 'minutes', 15);
    expect(due.toISOString()).toBe('2026-11-01T10:15:00.000Z');
  });

  it('calculates hour offsets accurately', () => {
    const base = new Date('2026-11-01T10:00:00.000Z');
    const due = calculateStepDueAt(base, 'hours', 4);
    expect(due.toISOString()).toBe('2026-11-01T14:00:00.000Z');
  });

  it('calculates negative hour offsets for appointment reminders', () => {
    const appointmentTime = new Date('2026-11-05T14:00:00.000Z');
    const reminder24h = calculateStepDueAt(appointmentTime, 'hours', -24);
    expect(reminder24h.toISOString()).toBe('2026-11-04T14:00:00.000Z');

    const reminder2h = calculateStepDueAt(appointmentTime, 'hours', -2);
    expect(reminder2h.toISOString()).toBe('2026-11-05T12:00:00.000Z');
  });

  it('calculates day offsets and aligns to 10:00 AM in Asia/Kolkata timezone', () => {
    // 2026-11-01 in UTC
    const base = new Date('2026-11-01T04:30:00.000Z'); // 10:00 AM IST
    const dueDay2 = calculateStepDueAt(base, 'days', 2, 'Asia/Kolkata');

    // In Asia/Kolkata, target date should be 2026-11-03 at 10:00 AM
    const localTarget = toZonedTime(dueDay2, 'Asia/Kolkata');
    expect(localTarget.getHours()).toBe(10);
    expect(localTarget.getMinutes()).toBe(0);
    expect(localTarget.getSeconds()).toBe(0);

    // 10:00 AM IST is 04:30 UTC
    expect(dueDay2.getUTCHours()).toBe(4);
    expect(dueDay2.getUTCMinutes()).toBe(30);
    expect(dueDay2.getUTCDate()).toBe(3);
  });
});

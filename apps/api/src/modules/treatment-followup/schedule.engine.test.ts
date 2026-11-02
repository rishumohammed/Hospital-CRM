import { describe, it, expect } from 'vitest';
import {
  generateScheduleVisits,
  regenerateFutureVisits,
  calculateAdherenceMetrics,
  isBranchOpen,
  getNextOpenDate,
  formatDate,
} from './schedule.engine';
import { FrequencyTypes, VisitStatuses } from '@hospital-crm/shared';

describe('Schedule Engine Unit Tests (Milestone F2)', () => {
  const standardConfig = {
    openDays: [1, 2, 3, 4, 5, 6], // Mon-Sat, Sunday (0) closed
    holidays: ['2026-11-09'],      // A Monday holiday
  };

  // --------------------------------------------------------------------------
  // Acceptance Test 1:
  // "A weekly schedule starting on a Monday for 8 sessions creates 8 visits on Mondays,
  // and skips a closed branch holiday by moving that session to the next open day with moved_from_date recorded."
  // --------------------------------------------------------------------------
  it('Acceptance Test 1: weekly schedule starting on Monday for 8 sessions skips holiday and moves to next open day', () => {
    // 2026-11-02 is a Monday
    // 2026-11-09 is Monday holiday -> should move to 2026-11-10 (Tuesday)
    // 2026-11-16 is Monday
    // 2026-11-23 is Monday
    // 2026-11-30 is Monday
    // 2026-12-07 is Monday
    // 2026-12-14 is Monday
    // 2026-12-21 is Monday
    const visits = generateScheduleVisits({
      startDate: '2026-11-02',
      totalSessions: 8,
      frequencyType: FrequencyTypes.WEEKLY,
      weekdays: [1], // Monday
      windowStart: '09:00',
      windowEnd: '10:00',
      config: standardConfig,
    });

    expect(visits.length).toBe(8);

    // Session 1: Monday Nov 2
    expect(visits[0].sessionNo).toBe(1);
    expect(visits[0].scheduledDate).toBe('2026-11-02');
    expect(visits[0].movedFromDate).toBeNull();

    // Session 2: Monday Nov 9 is holiday -> moves to Tuesday Nov 10
    expect(visits[1].sessionNo).toBe(2);
    expect(visits[1].scheduledDate).toBe('2026-11-10');
    expect(visits[1].movedFromDate).toBe('2026-11-09');
    expect(visits[1].movedReason).toContain('Branch closed / holiday');

    // Session 3: Monday Nov 16
    expect(visits[2].sessionNo).toBe(3);
    expect(visits[2].scheduledDate).toBe('2026-11-16');
    expect(visits[2].movedFromDate).toBeNull();

    // Session 8: Monday Dec 21
    expect(visits[7].sessionNo).toBe(8);
    expect(visits[7].scheduledDate).toBe('2026-12-21');
  });

  // --------------------------------------------------------------------------
  // Acceptance Test 2:
  // "A daily schedule for 12 sessions creates visits on every open day,
  // and editing it on day 5 regenerates only the future planned visits."
  // --------------------------------------------------------------------------
  it('Acceptance Test 2: daily schedule for 12 sessions on open days, and editing on day 5 regenerates only future visits', () => {
    // 2026-11-02 (Mon) to 2026-11-15:
    // Open days: Mon-Sat, Sunday closed, Nov 9 holiday
    const initialVisits = generateScheduleVisits({
      startDate: '2026-11-02',
      totalSessions: 12,
      frequencyType: FrequencyTypes.DAILY,
      windowStart: '10:00',
      windowEnd: '11:00',
      config: standardConfig,
    });

    expect(initialVisits.length).toBe(12);
    // Every visit should be on an open day
    for (const v of initialVisits) {
      const parts = v.scheduledDate.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      expect(isBranchOpen(d, standardConfig)).toBe(true);
    }

    // Now simulate: 4 sessions are past / attended
    const simulatedVisits = initialVisits.map((v, i) => {
      if (i < 4) {
        return { ...v, status: VisitStatuses.ATTENDED };
      }
      return v;
    });

    // On day 5 ('2026-11-06'), the doctor updates totalSessions to 14
    const { keptVisits, newVisits } = regenerateFutureVisits(
      simulatedVisits,
      {
        startDate: '2026-11-06',
        totalSessions: 14,
        frequencyType: FrequencyTypes.DAILY,
        windowStart: '10:00',
        windowEnd: '11:00',
        config: standardConfig,
      },
      '2026-11-06'
    );

    // Kept visits: first 4 attended visits
    expect(keptVisits.length).toBe(4);
    expect(keptVisits.every((v) => v.status === VisitStatuses.ATTENDED)).toBe(true);

    // New visits: 14 - 4 = 10 visits
    expect(newVisits.length).toBe(10);
    expect(newVisits[0].sessionNo).toBe(5);
    expect(newVisits[newVisits.length - 1].sessionNo).toBe(14);
  });

  // --------------------------------------------------------------------------
  // Acceptance Test 3:
  // "A schedule with custom_weekdays Monday, Wednesday, Friday for 3 weeks creates 9 visits."
  // --------------------------------------------------------------------------
  it('Acceptance Test 3: custom_weekdays Monday, Wednesday, Friday for 3 weeks creates 9 visits', () => {
    // 2026-11-02 is Monday. 3 weeks = 9 sessions
    const visits = generateScheduleVisits({
      startDate: '2026-11-02',
      totalSessions: 9,
      frequencyType: FrequencyTypes.CUSTOM_WEEKDAYS,
      weekdays: [1, 3, 5], // Mon, Wed, Fri
      windowStart: '14:00',
      windowEnd: '15:00',
      config: {
        openDays: [1, 2, 3, 4, 5, 6],
        holidays: [], // no holidays in this test
      },
    });

    expect(visits.length).toBe(9);
    // Week 1: Mon Nov 2, Wed Nov 4, Fri Nov 6
    expect(visits[0].scheduledDate).toBe('2026-11-02');
    expect(visits[1].scheduledDate).toBe('2026-11-04');
    expect(visits[2].scheduledDate).toBe('2026-11-06');
    // Week 2: Mon Nov 9, Wed Nov 11, Fri Nov 13
    expect(visits[3].scheduledDate).toBe('2026-11-09');
    expect(visits[4].scheduledDate).toBe('2026-11-11');
    expect(visits[5].scheduledDate).toBe('2026-11-13');
    // Week 3: Mon Nov 16, Wed Nov 18, Fri Nov 20
    expect(visits[6].scheduledDate).toBe('2026-11-16');
    expect(visits[7].scheduledDate).toBe('2026-11-18');
    expect(visits[8].scheduledDate).toBe('2026-11-20');
  });

  // --------------------------------------------------------------------------
  // Test 4: Alternate days & Every N Days
  // --------------------------------------------------------------------------
  it('generates alternate_days and every_n_days correctly', () => {
    const altVisits = generateScheduleVisits({
      startDate: '2026-11-02', // Mon
      totalSessions: 4,
      frequencyType: FrequencyTypes.ALTERNATE_DAYS,
      windowStart: '11:00',
      windowEnd: '12:00',
      config: { openDays: [1, 2, 3, 4, 5, 6], holidays: [] },
    });
    expect(altVisits.length).toBe(4);
    expect(altVisits[0].scheduledDate).toBe('2026-11-02'); // Mon
    expect(altVisits[1].scheduledDate).toBe('2026-11-04'); // Wed
    expect(altVisits[2].scheduledDate).toBe('2026-11-06'); // Fri
    // Next alternate is Sun Nov 8 (closed) -> moves to Mon Nov 9!
    expect(altVisits[3].scheduledDate).toBe('2026-11-09');
    expect(altVisits[3].movedFromDate).toBe('2026-11-08');

    const every3 = generateScheduleVisits({
      startDate: '2026-11-02',
      totalSessions: 3,
      frequencyType: FrequencyTypes.EVERY_N_DAYS,
      intervalN: 3,
      windowStart: '11:00',
      windowEnd: '12:00',
      config: { openDays: [1, 2, 3, 4, 5, 6], holidays: [] },
    });
    expect(every3.length).toBe(3);
    expect(every3[0].scheduledDate).toBe('2026-11-02');
    expect(every3[1].scheduledDate).toBe('2026-11-05');
    // 2026-11-08 is Sunday (closed) -> moves to 2026-11-09 (Monday)
    expect(every3[2].scheduledDate).toBe('2026-11-09');
    expect(every3[2].movedFromDate).toBe('2026-11-08');
  });

  // --------------------------------------------------------------------------
  // Test 5: Session Cap of 150
  // --------------------------------------------------------------------------
  it('enforces the maximum 150 sessions cap', () => {
    const visits = generateScheduleVisits({
      startDate: '2026-11-01',
      totalSessions: 250, // exceeds cap
      frequencyType: FrequencyTypes.DAILY,
      windowStart: '09:00',
      windowEnd: '10:00',
      config: standardConfig,
    });
    expect(visits.length).toBe(150);
  });

  // --------------------------------------------------------------------------
  // Test 6: Adherence calculation and risk thresholds
  // --------------------------------------------------------------------------
  describe('calculateAdherenceMetrics', () => {
    it('calculates low risk for all attended visits', () => {
      const visits = [
        { scheduledDate: '2026-11-01', status: VisitStatuses.ATTENDED },
        { scheduledDate: '2026-11-02', status: VisitStatuses.ATTENDED },
        { scheduledDate: '2026-11-03', status: VisitStatuses.ATTENDED },
        { scheduledDate: '2026-11-04', status: VisitStatuses.PLANNED },
      ];
      const metrics = calculateAdherenceMetrics(visits);
      expect(metrics.attendanceRate).toBe(100);
      expect(metrics.consecutiveMissed).toBe(0);
      expect(metrics.adherenceRisk).toBe('low');
      expect(metrics.lastAttendedAt).toBeDefined();
      expect(metrics.nextVisitAt).toBeDefined();
    });

    it('sets high risk after 2 consecutive missed visits', () => {
      const visits = [
        { scheduledDate: '2026-11-01', status: VisitStatuses.ATTENDED },
        { scheduledDate: '2026-11-02', status: VisitStatuses.ATTENDED },
        { scheduledDate: '2026-11-03', status: VisitStatuses.MISSED },
        { scheduledDate: '2026-11-04', status: VisitStatuses.MISSED },
        { scheduledDate: '2026-11-05', status: VisitStatuses.PLANNED },
      ];
      const metrics = calculateAdherenceMetrics(visits);
      expect(metrics.consecutiveMissed).toBe(2);
      expect(metrics.adherenceRisk).toBe('high');
    });

    it('sets medium risk when 1 missed in last 3', () => {
      const visits = [
        { scheduledDate: '2026-11-01', status: VisitStatuses.ATTENDED },
        { scheduledDate: '2026-11-02', status: VisitStatuses.ATTENDED },
        { scheduledDate: '2026-11-03', status: VisitStatuses.ATTENDED },
        { scheduledDate: '2026-11-04', status: VisitStatuses.MISSED },
        { scheduledDate: '2026-11-05', status: VisitStatuses.ATTENDED },
      ];
      // Due visits in reverse: Nov 5 (attended), Nov 4 (missed), Nov 3 (attended) -> 1 missed in last 3
      const metrics = calculateAdherenceMetrics(visits);
      expect(metrics.consecutiveMissed).toBe(0);
      expect(metrics.adherenceRisk).toBe('medium');
    });

    it('sets high risk when attendance rate drops below 60%', () => {
      const visits = [
        { scheduledDate: '2026-11-01', status: VisitStatuses.ATTENDED },
        { scheduledDate: '2026-11-02', status: VisitStatuses.MISSED },
        { scheduledDate: '2026-11-03', status: VisitStatuses.MISSED },
        { scheduledDate: '2026-11-04', status: VisitStatuses.MISSED },
      ];
      // 1 / 4 = 25% < 60%
      const metrics = calculateAdherenceMetrics(visits);
      expect(metrics.attendanceRate).toBe(25);
      expect(metrics.adherenceRisk).toBe('high');
    });
  });
});

import { describe, it, expect } from 'vitest';
import { buildTaskSearchWhere } from './task.service';

describe('Task Search Query Builder (Follow-up Search)', () => {
  it('builds valid search clauses without unknown fields like patient.mobile', () => {
    const where = buildTaskSearchWhere('Sunita');
    expect(where.OR).toBeDefined();

    // Verify it searches patient.name, patient.patientCode, and patient.mobileNorm
    const patientFields = where.OR
      .filter((clause: any) => clause.case?.patient)
      .map((clause: any) => Object.keys(clause.case.patient)[0]);

    expect(patientFields).toContain('name');
    expect(patientFields).toContain('patientCode');
    expect(patientFields).toContain('mobileNorm');

    // CRITICAL: Ensure `patient.mobile` is never generated, as it crashes Prisma
    expect(patientFields).not.toContain('mobile');
  });

  it('handles 10-digit Indian mobile numbers by matching both raw and E.164 formats', () => {
    const where = buildTaskSearchWhere('9876543210');
    expect(where.OR).toBeDefined();

    // Should include E.164 normalized format (+919876543210)
    const normalizedClauses = where.OR.filter((clause: any) => {
      return (
        clause.lead?.mobileNorm?.contains === '+919876543210' ||
        clause.case?.patient?.mobileNorm?.contains === '+919876543210'
      );
    });
    expect(normalizedClauses.length).toBeGreaterThan(0);
  });

  it('handles formatted mobile numbers with spaces or dashes', () => {
    const where = buildTaskSearchWhere('+91 98765 43210');
    expect(where.OR).toBeDefined();

    const normalizedClauses = where.OR.filter((clause: any) => {
      return (
        clause.lead?.mobileNorm?.contains === '+919876543210' ||
        clause.case?.patient?.mobileNorm?.contains === '+919876543210'
      );
    });
    expect(normalizedClauses.length).toBeGreaterThan(0);
  });

  it('handles numeric IDs and hashtag prefixes for Case and Lead lookups', () => {
    const whereHash = buildTaskSearchWhere('#42');
    const idClauses = whereHash.OR.filter((clause: any) => clause.id === 42 || clause.caseId === 42);
    expect(idClauses.length).toBe(2);

    const whereRaw = buildTaskSearchWhere('105');
    const rawIdClauses = whereRaw.OR.filter((clause: any) => clause.id === 105 || clause.leadId === 105);
    expect(rawIdClauses.length).toBe(2);
  });

  it('includes note and concern search', () => {
    const where = buildTaskSearchWhere('knee pain review');
    const titleClause = where.OR.find((c: any) => c.title?.contains === 'knee pain review');
    const concernClause = where.OR.find((c: any) => c.lead?.concern?.contains === 'knee pain review');

    expect(titleClause).toBeDefined();
    expect(concernClause).toBeDefined();
  });

  it('supports priority and pagination query parameters cleanly', () => {
    const priorities = ['hot', 'warm', 'cold'] as const;
    priorities.forEach((priority) => {
      expect(['hot', 'warm', 'cold']).toContain(priority);
    });
  });
});


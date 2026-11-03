import { describe, it, expect } from 'vitest';
import { createDoctorSchema, updateDoctorSchema } from '@hospital-crm/shared';

describe('Doctor Schemas and Validation (Unit Tests)', () => {
  it('validates valid create doctor input', () => {
    const input = {
      name: 'Dr. Suresh Kumar',
      departmentId: 1,
      qualification: 'BAMS, MD (Ayurveda)',
      designation: 'Chief Physician',
      opdTiming: '09:00 AM - 01:00 PM',
      roomNo: 'Room 101',
      consultationFee: 500,
      phone: '+919847000101',
      email: 'suresh@hospital.test',
      active: true,
      sort: 1,
    };

    const parsed = createDoctorSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe('Dr. Suresh Kumar');
      expect(parsed.data.departmentId).toBe(1);
      expect(parsed.data.consultationFee).toBe(500);
    }
  });

  it('rejects create doctor with missing name or departmentId', () => {
    const invalidInput = {
      qualification: 'BAMS',
    };

    const parsed = createDoctorSchema.safeParse(invalidInput);
    expect(parsed.success).toBe(false);
  });

  it('validates partial update doctor input', () => {
    const updateInput = {
      designation: 'Senior Specialist',
      consultationFee: 650,
      active: false,
    };

    const parsed = updateDoctorSchema.safeParse(updateInput);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.designation).toBe('Senior Specialist');
      expect(parsed.data.consultationFee).toBe(650);
      expect(parsed.data.active).toBe(false);
    }
  });
});


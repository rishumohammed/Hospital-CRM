import { describe, it, expect } from 'vitest';
import {
  normalizePhoneNumber,
  isValidPhoneNumber,
  maskPhoneNumber,
  formatPhoneNumber,
} from './phone';

describe('Phone Utilities', () => {
  it('normalizes various Indian 10-digit mobile formats to E.164', () => {
    expect(normalizePhoneNumber('9876543210')).toBe('+919876543210');
    expect(normalizePhoneNumber('98765 43210')).toBe('+919876543210');
    expect(normalizePhoneNumber('+91 98765 43210')).toBe('+919876543210');
    expect(normalizePhoneNumber('+919876543210')).toBe('+919876543210');
    expect(normalizePhoneNumber('09876543210')).toBe('+919876543210');
    expect(normalizePhoneNumber('919876543210')).toBe('+919876543210');
  });

  it('rejects invalid phone numbers', () => {
    expect(normalizePhoneNumber('123')).toBeNull();
    expect(normalizePhoneNumber('')).toBeNull();
    expect(normalizePhoneNumber(null)).toBeNull();
    expect(normalizePhoneNumber('abc')).toBeNull();
    expect(isValidPhoneNumber('12345')).toBe(false);
  });

  it('validates proper phone numbers', () => {
    expect(isValidPhoneNumber('9876543210')).toBe(true);
    expect(isValidPhoneNumber('+919876543210')).toBe(true);
  });

  it('masks phone numbers preserving only the last 3 digits', () => {
    const maskedWithPrefix = maskPhoneNumber('+919876543210');
    expect(maskedWithPrefix).toMatch(/\+91\s?\*+210$/);
    expect(maskedWithPrefix.endsWith('210')).toBe(true);

    const maskedPlain = maskPhoneNumber('9876543210');
    expect(maskedPlain.endsWith('210')).toBe(true);
    expect(maskedPlain).toContain('*******210');
  });

  it('formats phone numbers for international display', () => {
    const formatted = formatPhoneNumber('9876543210');
    expect(formatted).toContain('+91');
  });
});

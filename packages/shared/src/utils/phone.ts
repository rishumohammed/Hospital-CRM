import { parsePhoneNumberWithError, CountryCode } from 'libphonenumber-js';

/**
 * Normalizes a phone number string to E.164 format.
 * Defaults to India (+91) if country code is not explicitly provided.
 *
 * @param phone Raw phone string (e.g. "9876543210", "98765 43210", "+91 98765-43210")
 * @param defaultCountry CountryCode default 'IN'
 * @returns E.164 formatted string (e.g. "+919876543210") or null if invalid
 */
export function normalizePhoneNumber(
  phone: string | null | undefined,
  defaultCountry: CountryCode = 'IN'
): string | null {
  if (!phone || typeof phone !== 'string') return null;

  const trimmed = phone.trim();
  if (!trimmed) return null;

  try {
    const parsed = parsePhoneNumberWithError(trimmed, defaultCountry);
    if (parsed.isValid()) {
      return parsed.format('E.164');
    }
  } catch {
    // Attempt fallback for common 10-digit Indian mobile formats with leading 0 or spaces
    const cleanDigits = trimmed.replace(/\D/g, '');
    if (cleanDigits.length === 10) {
      return `+91${cleanDigits}`;
    }
    if (cleanDigits.length === 11 && cleanDigits.startsWith('0')) {
      return `+91${cleanDigits.slice(1)}`;
    }
    if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) {
      return `+${cleanDigits}`;
    }
  }

  return null;
}

/**
 * Validates whether a phone number is valid in the specified country.
 */
export function isValidPhoneNumber(
  phone: string | null | undefined,
  defaultCountry: CountryCode = 'IN'
): boolean {
  return normalizePhoneNumber(phone, defaultCountry) !== null;
}

/**
 * Formats a phone number for UI display.
 */
export function formatPhoneNumber(
  phone: string | null | undefined,
  defaultCountry: CountryCode = 'IN'
): string {
  if (!phone) return '';
  try {
    const parsed = parsePhoneNumberWithError(phone, defaultCountry);
    return parsed.formatInternational();
  } catch {
    return phone;
  }
}

/**
 * Masks a phone number showing only the last 3 digits.
 * E.g., "+919876543210" becomes "+91 *******210" or "*******210".
 */
export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  if (trimmed.length <= 3) return '***';

  try {
    const parsed = parsePhoneNumberWithError(trimmed, 'IN');
    const callingCode = parsed.countryCallingCode;
    const nationalNumber = parsed.nationalNumber;
    if (nationalNumber.length > 3) {
      const last3 = nationalNumber.slice(-3);
      const maskedPart = '*'.repeat(nationalNumber.length - 3);
      return `+${callingCode} ${maskedPart}${last3}`;
    }
  } catch {
    // Fallback if not standard E.164
  }

  const last3 = trimmed.slice(-3);
  return `${'*'.repeat(trimmed.length - 3)}${last3}`;
}

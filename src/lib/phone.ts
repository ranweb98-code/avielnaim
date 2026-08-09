/** Digits only. */
export function phoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Normalizes Israeli numbers to local storage/display (leading 0).
 * Handles +972 / 972 prefixes and 9-digit mobile numbers missing the leading 0.
 */
export function normalizeIsraeliPhoneLocal(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const digits = phoneDigits(trimmed);
  if (!digits) return trimmed;

  if (digits.startsWith("972") && digits.length >= 11) {
    return `0${digits.slice(3)}`;
  }

  if (digits.length === 9 && digits.startsWith("5")) {
    return `0${digits}`;
  }

  if (digits.startsWith("0")) {
    return digits;
  }

  return trimmed;
}

/**
 * Live input helper: normalize when the value is clearly international or complete.
 */
export function formatPhoneInputValue(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const digits = phoneDigits(trimmed);

  if (/^9725\d{8}$/.test(digits)) {
    return `0${digits.slice(3)}`;
  }

  if (digits.startsWith("972") && digits.length > 3) {
    const local = digits.slice(3);
    const withZero = local.startsWith("0") ? local : `0${local}`;
    return withZero.slice(0, 10);
  }

  if (/^5\d{8}$/.test(digits)) {
    return `0${digits}`;
  }

  return raw;
}

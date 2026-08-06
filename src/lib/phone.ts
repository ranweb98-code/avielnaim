/** Digits only (no spaces, dashes, or country prefix formatting). */
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Israeli local mobile/landline with leading 0 (e.g. 0528939342).
 * iOS contact autofill often omits the trunk 0 (528939342).
 */
export function ensureIsraeliLocalPhone(phone: string): string {
  const digits = phoneDigits(phone.trim());
  if (!digits) return phone.trim();

  if (digits.startsWith("972") && digits.length >= 11) {
    return `0${digits.slice(3)}`;
  }
  if (digits.startsWith("0")) {
    return digits;
  }
  if (digits.length === 9) {
    return `0${digits}`;
  }

  return digits;
}

/** Default branding for this deployment (override via env on new instances). */
export const DEFAULT_BUSINESS_NAME =
  process.env.NEXT_PUBLIC_BUSINESS_NAME?.trim() || "Aviel Naim";

export const DEFAULT_BUSINESS_TAGLINE =
  process.env.NEXT_PUBLIC_BUSINESS_TAGLINE?.trim() ||
  "מספרת יוקרה — קביעת תורים online";

/** DB setting from admin wins; otherwise deployment default from env. */
export function resolveBusinessName(fromSettings?: string | null): string {
  const fromDb = fromSettings?.trim();
  if (fromDb) return fromDb;
  return DEFAULT_BUSINESS_NAME;
}

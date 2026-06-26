export const BUSINESS_NAME = "Aviel Naim";

export const DAY_NAMES = [
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שבת",
];

export function parseTags(tags: string): string[] {
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function formatTags(tags: string[]): string {
  return tags.join(",");
}

export function parseInspoIds(ids: string): number[] {
  if (!ids) return [];
  return ids
    .split(",")
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !Number.isNaN(id));
}

export function formatInspoIds(ids: number[]): string {
  return ids.join(",");
}

export function formatPrice(price: number): string {
  return `${price} ₪`;
}

export function formatDuration(minutes: number): string {
  return `${minutes} דק'`;
}

/** Builds a wa.me link from a local IL phone number or international digits. */
export function toWhatsAppUrl(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, "");
  let intl = digits;
  if (intl.startsWith("0")) {
    intl = `972${intl.slice(1)}`;
  }
  const base = `https://wa.me/${intl}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

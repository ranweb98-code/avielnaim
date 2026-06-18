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

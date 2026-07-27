import { toTelUrl, toWhatsAppUrl } from "@/lib/utils";

export { toTelUrl, toWhatsAppUrl };

/** Any haircut-related service shown in admin booking carousel. */
export function isHaircutService(name: string): boolean {
  return name.includes("תספורת") || name.includes("פייד");
}

/** Basic men's haircut (no beard combo). */
export function isHaircutOnlyService(name: string): boolean {
  return name.includes("תספורת") && !name.includes("זקן") && !name.includes("ילדים");
}

/** Haircut + beard combo service. */
export function isHaircutWithBeardService(name: string): boolean {
  return name.includes("תספורת") && name.includes("זקן");
}

export function filterAdminBookingServices<
  T extends { id: number; name: string; sortOrder?: number }
>(services: T[]): T[] {
  const haircuts = services.filter((s) => isHaircutService(s.name));
  return haircuts.length > 0 ? haircuts : services;
}

export function findHaircutService<
  T extends { id: number; name: string; sortOrder?: number }
>(services: T[]): T | undefined {
  return (
    services.find((s) => isHaircutOnlyService(s.name)) ??
    services.find((s) => s.name.includes("תספורת"))
  );
}

export function findHaircutWithBeardService<
  T extends { id: number; name: string }
>(services: T[]): T | undefined {
  return services.find((s) => isHaircutWithBeardService(s.name));
}

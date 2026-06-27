export type PickedContact = {
  name: string;
  phone: string;
  email?: string;
};

type ContactProperty = "name" | "email" | "tel";

type ContactInfo = {
  name?: string[];
  email?: string[];
  tel?: string[];
};

type ContactsManager = {
  select(
    properties: ContactProperty[],
    options?: { multiple?: boolean }
  ): Promise<ContactInfo[]>;
};

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972") && digits.length >= 11) {
    return `0${digits.slice(3)}`;
  }
  return digits;
}

export function isContactPickerSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  const contacts = (navigator as Navigator & { contacts?: ContactsManager })
    .contacts;
  return typeof contacts?.select === "function";
}

export async function pickContactFromDevice(): Promise<PickedContact | null> {
  if (!isContactPickerSupported()) return null;

  try {
    const contacts = (navigator as Navigator & { contacts: ContactsManager })
      .contacts;
    const picked = await contacts.select(["name", "tel", "email"], {
      multiple: false,
    });

    if (!picked.length) return null;

    const contact = picked[0];
    const name = contact.name?.[0]?.trim() ?? "";
    const phone = normalizePhone(contact.tel?.[0] ?? "");
    const email = contact.email?.[0]?.trim();

    if (!name && !phone) return null;

    return {
      name,
      phone,
      email: email || undefined,
    };
  } catch {
    return null;
  }
}

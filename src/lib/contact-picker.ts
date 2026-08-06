import { ensureIsraeliLocalPhone } from "@/lib/phone";

export type PickedContact = {
  name: string;
  phone: string;
  email?: string;
};

export type ContactPickStatus = "picked" | "cancelled" | "unsupported" | "error";

export type ContactPickResult = {
  status: ContactPickStatus;
  contact?: PickedContact;
  message?: string;
};

type ContactProperty = "name" | "email" | "tel";

type ContactInfo = {
  name?: string[];
  email?: string[];
  tel?: string[];
};

type ContactsManager = {
  getProperties?: () => Promise<ContactProperty[]>;
  select(
    properties: ContactProperty[],
    options?: { multiple?: boolean }
  ): Promise<ContactInfo[]>;
};

function getContactsManager(): ContactsManager | null {
  if (typeof navigator === "undefined") return null;
  const contacts = (navigator as Navigator & { contacts?: ContactsManager })
    .contacts;
  return contacts && typeof contacts.select === "function" ? contacts : null;
}

function normalizePhone(raw: string): string {
  return ensureIsraeliLocalPhone(raw);
}

function isValidPhone(phone: string): boolean {
  return phone.replace(/\D/g, "").length >= 9;
}

function pickBestPhone(numbers: string[] | undefined): string {
  if (!numbers?.length) return "";

  const normalized = numbers
    .map((value) => normalizePhone(value))
    .filter(isValidPhone);

  if (normalized.length === 0) return "";

  const israeliMobile = normalized.find((value) => /^05\d{8}$/.test(value));
  if (israeliMobile) return israeliMobile;

  return normalized[0];
}

function mapContactInfo(contact: ContactInfo): PickedContact | null {
  const name = contact.name?.[0]?.trim() ?? "";
  const phone = pickBestPhone(contact.tel);
  const email = contact.email?.[0]?.trim();

  if (!name && !phone) return null;

  return {
    name,
    phone,
    email: email || undefined,
  };
}

export function isContactPickerSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!window.isSecureContext) return false;
  return (
    "contacts" in navigator &&
    "ContactsManager" in window &&
    getContactsManager() !== null
  );
}

async function getSelectableProperties(
  contacts: ContactsManager
): Promise<ContactProperty[]> {
  const fallback: ContactProperty[] = ["name", "tel", "email"];

  if (typeof contacts.getProperties !== "function") {
    return fallback;
  }

  try {
    const properties = await contacts.getProperties();
    const allowed = properties.filter((property) =>
      fallback.includes(property)
    );
    return allowed.length > 0 ? allowed : fallback;
  } catch {
    return fallback;
  }
}

export async function pickContactFromDevice(): Promise<ContactPickResult> {
  const contacts = getContactsManager();

  if (!isContactPickerSupported() || !contacts) {
    return {
      status: "unsupported",
      message: "בחירת איש קשר אינה נתמכת בדפדפן זה",
    };
  }

  try {
    const properties = await getSelectableProperties(contacts);
    const picked = await contacts.select(properties, { multiple: false });

    if (!picked.length) {
      return { status: "cancelled" };
    }

    const contact = mapContactInfo(picked[0]);
    if (!contact) {
      return {
        status: "error",
        message: "לא נמצאו פרטי איש קשר תקינים",
      };
    }

    return { status: "picked", contact };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { status: "cancelled" };
    }

    return {
      status: "error",
      message: "שגיאה בבחירת איש קשר",
    };
  }
}

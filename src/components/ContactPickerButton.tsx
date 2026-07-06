"use client";

import { useEffect, useState } from "react";
import { BookUser } from "lucide-react";
import {
  isContactPickerSupported,
  pickContactFromDevice,
  type PickedContact,
} from "@/lib/contact-picker";
import { cn } from "@/lib/cn";

type ContactPickerButtonProps = {
  onPicked: (contact: PickedContact) => void;
  className?: string;
};

export function ContactPickerButton({
  onPicked,
  className,
}: ContactPickerButtonProps) {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(isContactPickerSupported());
  }, []);

  if (!supported) return null;

  async function handlePick() {
    const contact = await pickContactFromDevice();
    if (contact) onPicked(contact);
  }

  return (
    <button
      type="button"
      className={cn("contact-picker-btn", className)}
      onClick={() => void handlePick()}
    >
      <BookUser className="h-4 w-4 shrink-0" />
      <span>בחר איש קשר</span>
    </button>
  );
}

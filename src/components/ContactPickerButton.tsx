"use client";

import { useEffect, useState } from "react";
import { BookUser } from "lucide-react";
import {
  isContactPickerSupported,
  pickContactFromDevice,
  type PickedContact,
} from "@/lib/contact-picker";
import { isIOSDevice } from "@/lib/device";
import { cn } from "@/lib/cn";

type ContactPickerButtonProps = {
  onPicked: (contact: PickedContact) => void;
  onIOSFallback?: () => void;
  onStatusMessage?: (message: string) => void;
  className?: string;
};

export function ContactPickerButton({
  onPicked,
  onIOSFallback,
  onStatusMessage,
  className,
}: ContactPickerButtonProps) {
  const [nativeSupported, setNativeSupported] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [hint, setHint] = useState("");

  useEffect(() => {
    setNativeSupported(isContactPickerSupported());
    setIsIOS(isIOSDevice());
  }, []);

  async function handlePick() {
    setHint("");

    if (nativeSupported) {
      const result = await pickContactFromDevice();

      if (result.status === "picked" && result.contact) {
        onPicked(result.contact);
        return;
      }

      if (result.status === "cancelled") {
        return;
      }

      if (result.message) {
        setHint(result.message);
        onStatusMessage?.(result.message);
      }
      return;
    }

    if (isIOS) {
      onIOSFallback?.();
      const iosHint = "בחר איש קשר מהרשימה מעל המקלדת";
      setHint(iosHint);
      onStatusMessage?.(iosHint);
      return;
    }

    const fallbackMessage = "חפש לקוח קיים או הזן פרטים ידנית";
    setHint(fallbackMessage);
    onStatusMessage?.(fallbackMessage);
  }

  return (
    <div className={cn("contact-picker", className)}>
      <button
        type="button"
        className="contact-picker-btn"
        onClick={() => void handlePick()}
      >
        <BookUser className="h-4 w-4 shrink-0" />
        <span>בחר איש קשר</span>
      </button>
      {hint && <p className="contact-picker__hint">{hint}</p>}
    </div>
  );
}

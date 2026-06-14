import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/Button";

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <div className="card-app space-y-4 p-6">
        <WifiOff className="mx-auto h-12 w-12 text-gold-start" />
        <h1 className="text-2xl font-bold text-text-primary">
          אין חיבור לאינטרנט
        </h1>
        <p className="text-sm text-text-secondary">
          בדוק את החיבור ונסה שוב.
        </p>
        <Link href="/">
          <Button variant="secondary" className="w-full">
            חזרה לדף הבית
          </Button>
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/Button";

export default function OfflinePage() {
  return (
    <div className="site-container flex min-h-[60vh] flex-col items-center justify-center py-12 text-center">
      <div className="card-app w-full max-w-md space-y-4 p-6">
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

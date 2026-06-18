import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/Button";
import { PageHero } from "@/components/PageHero";

export default function OfflinePage() {
  return (
    <>
      <PageHero
        bottomContent={
          <div className="text-center">
            <WifiOff className="mx-auto h-12 w-12 text-accent-yellow" />
            <h1 className="mt-4 text-2xl font-bold text-white">
              אין חיבור לאינטרנט
            </h1>
            <p className="mt-2 text-sm text-white/70">
              בדוק את החיבור ונסה שוב.
            </p>
          </div>
        }
      />
      <div className="site-container py-8">
        <Link href="/" className="mx-auto block max-w-md">
          <Button variant="secondary" className="w-full">
            חזרה לדף הבית
          </Button>
        </Link>
      </div>
    </>
  );
}

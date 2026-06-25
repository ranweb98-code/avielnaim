import { Suspense } from "react";
import CancelPage from "./page.client";

export default function CancelPageWrapper() {
  return (
    <Suspense fallback={<div className="py-16 text-center">טוען...</div>}>
      <CancelPage />
    </Suspense>
  );
}

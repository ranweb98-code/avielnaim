import { Suspense } from "react";
import ApprovePage from "./page.client";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function ApproveRoutePage() {
  return (
    <Suspense fallback={<LoadingSpinner label="מאשר תור..." />}>
      <ApprovePage />
    </Suspense>
  );
}

import { Suspense } from "react";
import { AdminLoginForm } from "./AdminLoginForm";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-cream/60">טוען...</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}

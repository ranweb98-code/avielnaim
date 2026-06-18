import { Suspense } from "react";
import { AdminLoginForm } from "./AdminLoginForm";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-text-secondary">טוען...</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}

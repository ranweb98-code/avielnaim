import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isAuthenticated } from "@/lib/auth";
import { AdminLoginForm } from "./AdminLoginForm";

export const dynamic = "force-dynamic";

type AdminLoginPageProps = {
  searchParams: Promise<{ redirect?: string }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  if (await isAuthenticated()) {
    const { redirect: redirectTo } = await searchParams;
    redirect(redirectTo?.startsWith("/admin") ? redirectTo : "/admin");
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-text-secondary">טוען...</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}

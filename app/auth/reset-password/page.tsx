import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase";
import { redirect } from "next/navigation";
import ResetPasswordForm from "./reset-password.form";

export default async function ResetPasswordPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/sign-in?error=session_required");
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Yeni Şifre Belirle</h1>
          <p className="text-muted-foreground mt-2">Güvenliğiniz için güçlü bir şifre kullanın.</p>
        </div>
        <ResetPasswordForm />
        <div className="mt-4 text-sm text-center">
          <Link href="/auth/sign-in" className="text-primary underline">Giriş sayfasına dön</Link>
        </div>
      </div>
    </div>
  );
}



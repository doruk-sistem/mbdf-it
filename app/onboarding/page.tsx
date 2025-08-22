import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase";
import { OnboardingCard } from "@/components/auth/onboarding-card";

export default async function OnboardingPage() {
  const cookieStore = cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  
  // Check if user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect("/auth/sign-in");
  }

  // Check if user already completed onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company_id")
    .eq("id", session.user.id)
    .single();

  if (profile?.full_name && profile?.company_id) {
    redirect("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Hoş Geldiniz!</h1>
          <p className="text-muted-foreground mt-2">
            Başlamak için lütfen profil bilgilerinizi tamamlayın
          </p>
        </div>
        
        <OnboardingCard userEmail={session.user.email!} />
      </div>
    </div>
  );
}
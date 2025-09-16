import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase";
import { OnboardingCard } from "@/components/auth/onboarding-card";

export default async function OnboardingPage() {
  const supabase = createServerSupabase();
  
  // Check if user is authenticated
  const { data: { user: authUser }, error } = await supabase.auth.getUser();
  
  if (!authUser || error) {
    redirect("/auth/sign-in");
  }

  // Check if user already completed onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company_id")
    .eq("id", authUser.id)
    .single();

  if (profile?.full_name && profile?.company_id) {
    // Check if user has joined any rooms
    const { data: userRooms } = await supabase
      .from("mbdf_member")
      .select("room_id")
      .eq("user_id", authUser.id)
      .limit(1);

    // If user has completed onboarding and joined at least one room, redirect to dashboard
    if (userRooms && userRooms.length > 0) {
      redirect("/");
    }
    // If user completed onboarding but hasn't joined any rooms, stay on onboarding for substance selection
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
        
        <OnboardingCard userEmail={authUser.email!} />
      </div>
    </div>
  );
}
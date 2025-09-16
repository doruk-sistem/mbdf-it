import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase";
import { CreateRoomForm } from "@/components/rooms/create-room-form";

interface CreateRoomPageProps {
  searchParams: { substance_id?: string };
}

export default async function CreateRoomPage({ searchParams }: CreateRoomPageProps) {
  const supabase = createServerSupabase();
  
  // Check if user is authenticated
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (!user || error) {
    redirect("/auth/sign-in");
  }

  // Check if user has completed onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.full_name || !profile?.company_id) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Yeni MBDF Odası Oluştur
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              KKDİK MBDF süreçlerinizi yönetmek için yeni bir oda oluşturun
            </p>
          </div>
          
          <CreateRoomForm preselectedSubstanceId={searchParams.substance_id} />
        </div>
      </div>
    </div>
  );
}
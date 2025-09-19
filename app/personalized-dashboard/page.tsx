import { Suspense } from "react";
import { redirect } from "next/navigation";
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { PersonalizedDashboardTemplate } from "@/components/dashboard/personalized-dashboard-template";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { createSSRQueryClient } from '@/lib/ssr-query-client';
import { createServerSupabase } from '@/lib/supabase';

export default async function PersonalizedDashboardPage() {
  const supabase = createServerSupabase();
  
  // Check if user is authenticated
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (!user || error) {
    redirect("/auth/sign-in");
  }

  // Check if user completed onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company_id")
    .eq("id", user.id)
    .single();

  const needsProfileOnboarding = !profile?.full_name || !profile?.company_id;
  if (needsProfileOnboarding) {
    redirect("/onboarding");
  }

  const queryClient = createSSRQueryClient();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="container mx-auto p-6 space-y-8">
        <Suspense fallback={<DashboardSkeleton />}>
          <PersonalizedDashboardTemplate />
        </Suspense>
      </div>
    </HydrationBoundary>
  );
}

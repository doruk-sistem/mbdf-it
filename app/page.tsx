import { Suspense } from "react";
import { redirect } from "next/navigation";
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { createSSRQueryClient } from '@/lib/ssr-query-client';
import { prefetchDashboard } from '@/lib/prefetch';
import { createServerSupabase } from '@/lib/supabase';

export default async function DashboardPage() {
  const supabase = createServerSupabase();
  
  // Check if user is authenticated
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (!user || error) {
    redirect("/auth/sign-in");
  }

  // Check if user completed onboarding (both profile and substance selection)
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company_id")
    .eq("id", user.id)
    .single();

  const needsProfileOnboarding = !profile?.full_name || !profile?.company_id;
  if (needsProfileOnboarding) {
    redirect("/onboarding");
  }

  // Check if user has joined any rooms (substance selection completed)
  const { data: userRooms } = await supabase
    .from("mbdf_member")
    .select("room_id")
    .eq("user_id", user.id)
    .limit(1);

  const needsSubstanceSelection = !userRooms || userRooms.length === 0;
  if (needsSubstanceSelection) {
    redirect("/onboarding");
  }

  const queryClient = createSSRQueryClient();
  
  // Prefetch dashboard data for SSR
  await prefetchDashboard(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="container mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">MBDF-IT Dashboard</h1>
          <p className="text-muted-foreground">
            KKDİK MBDF süreçlerinizi yönetin
          </p>
        </div>

        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>
      </div>
    </HydrationBoundary>
  );
}
import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { createSSRQueryClient } from '@/lib/ssr-query-client';
import { prefetchDashboard } from '@/lib/prefetch';

export default async function DashboardPage() {
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
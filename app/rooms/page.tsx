import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { createSSRQueryClient } from '@/lib/ssr-query-client';
import { prefetchRooms } from '@/lib/prefetch';
import RoomsPublicContent from './rooms.public';

export default async function RoomsPage() {
  const queryClient = createSSRQueryClient();
  await prefetchRooms(queryClient);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="container mx-auto p-6">
        <RoomsPublicContent />
      </div>
    </HydrationBoundary>
  );
}



import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { createSSRQueryClient } from '@/lib/ssr-query-client';
import { prefetchRoom } from '@/lib/prefetch';
import RoomPublicContent from './room.public';

interface Params { params: { roomId: string } }

export default async function RoomPublicPage({ params }: Params) {
  const queryClient = createSSRQueryClient();
  await prefetchRoom(queryClient, params.roomId);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="container mx-auto p-6">
        <RoomPublicContent roomId={params.roomId} />
      </div>
    </HydrationBoundary>
  );
}



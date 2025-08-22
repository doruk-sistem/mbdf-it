import { Suspense } from "react";
import { RoomContent } from "@/components/room/room-content";
import { RoomSkeleton } from "@/components/room/room-skeleton";

interface RoomPageProps {
  params: { roomId: string };
}

export default function RoomPage({ params }: RoomPageProps) {
  return (
    <Suspense fallback={<RoomSkeleton />}>
      <RoomContent roomId={params.roomId} />
    </Suspense>
  );
}
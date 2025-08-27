"use client";
import Link from 'next/link';
import { useRooms } from '@/hooks/use-rooms';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';

export default function RoomsPublicContent() {
  const { data, isLoading, error } = useRooms();
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">Odalar yüklenemedi.</p>;
  }

  const rooms = data?.items || [];
  if (rooms.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold">Oda bulunamadı</h2>
        <p className="text-muted-foreground">Daha sonra tekrar deneyin.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {rooms.map((r: any) => (
        <Card key={r.roomId} className="hover:bg-muted/50 transition-colors">
          <Link href={`/rooms/${r.roomId}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{r.substanceName}</CardTitle>
                {r.lrSelected && <Badge variant="secondary">LR seçildi</Badge>}
              </div>
              <CardDescription>
                EC: {r.ec || 'N/A'} • CAS: {r.cas || 'N/A'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {r.memberCount}</span>
                <span>{new Date(r.createdAt).toLocaleDateString('tr-TR')}</span>
              </div>
            </CardContent>
          </Link>
        </Card>
      ))}
    </div>
  );
}



"use client";
import Link from 'next/link';
import { useRoom } from '@/hooks/use-rooms';
import { useCreateJoinRequest } from '@/hooks/use-join-requests';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';

export default function RoomPublicContent({ roomId }: { roomId: string }) {
  const { data, isLoading, error } = useRoom(roomId);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [accept, setAccept] = useState(false);
  const createJoin = useCreateJoinRequest();

  const handleApply = () => {
    if (!accept) return;
    createJoin.mutate({ roomId, message: message || undefined, acceptTerms: accept }, { onSuccess: () => { setOpen(false); setMessage(''); setAccept(false); } });
  };

  if (isLoading) return <p>Yükleniyor...</p>;
  if (error || !data) return <p className="text-destructive">Oda bulunamadı.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{data.substanceName}</h1>
          <p className="text-muted-foreground">EC: {data.ec || 'N/A'} • CAS: {data.cas || 'N/A'}</p>
        </div>
        {data.lrSelected && <Badge>LR seçildi</Badge>}
      </div>

      {data.shortDescription && (
        <Card>
          <CardHeader>
            <CardTitle>Kısa Açıklama</CardTitle>
            <CardDescription>Oda hakkında genel bilgi</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{data.shortDescription}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Üyelik</CardTitle>
          <CardDescription>Üye olmayanlar başvuru ile katılabilir</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Üye sayısı: {data.memberCount}</div>
          <AuthAwareCTA roomId={roomId} open={open} setOpen={setOpen} message={message} setMessage={setMessage} accept={accept} setAccept={setAccept} handleApply={handleApply} pending={createJoin.isPending} />
        </CardContent>
      </Card>
    </div>
  );
}

function AuthAwareCTA({ roomId, open, setOpen, message, setMessage, accept, setAccept, handleApply, pending }: any) {
  const signInHref = `/auth/sign-in?next=/rooms/${roomId}`;
  const isAuthenticated = typeof window !== 'undefined' && document.cookie.includes('sb-access-token=');
  if (!isAuthenticated) {
    return (
      <Button asChild>
        <Link href={signInHref}>Giriş yap ve başvur</Link>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Odaya katıl</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Odaya katılma başvurusu</DialogTitle>
          <DialogDescription>Yöneticilere iletilecek kısa bir mesaj ekleyebilirsiniz.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea placeholder="Mesaj (isteğe bağlı)" value={message} onChange={(e) => setMessage(e.target.value)} />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={accept} onCheckedChange={(v) => setAccept(Boolean(v))} />
            Şartları kabul ediyorum
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button onClick={handleApply} disabled={!accept || pending}>{pending ? 'Gönderiliyor...' : 'Başvur'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post, API_ENDPOINTS } from '@/lib/api';
import { keys } from '@/lib/query-keys';
import { useToast } from '@/components/ui/use-toast';

export const useCreateJoinRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (payload: { roomId: string; message?: string; acceptTerms: boolean }) =>
      post(API_ENDPOINTS.joinRequests, payload),
    onSuccess: (_data, variables) => {
      toast({ title: 'Başvuru alındı', description: 'Oda yöneticileri bilgilendirildi.' });
      queryClient.invalidateQueries({ queryKey: keys.join.list(variables.roomId) });
    },
    onError: (error: any) => {
      toast({ title: 'Başvuru başarısız', description: error?.data?.error || 'İstek gönderilemedi', variant: 'destructive' });
    }
  });
};

export const useApproveJoinRequest = (roomId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (args: { id: string; note?: string }) => post(API_ENDPOINTS.approveJoinRequest(args.id), { note: args.note }),
    onSuccess: () => {
      toast({ title: 'Onaylandı', description: 'Üyelik oluşturuldu.' });
      queryClient.invalidateQueries({ queryKey: keys.join.list(roomId) });
      queryClient.invalidateQueries({ queryKey: keys.rooms.byId(roomId) });
    },
    onError: (error: any) => {
      toast({ title: 'Hata', description: error?.data?.error || 'Onay başarısız', variant: 'destructive' });
    }
  });
};

export const useRejectJoinRequest = (roomId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (args: { id: string; note?: string }) => post(API_ENDPOINTS.rejectJoinRequest(args.id), { note: args.note }),
    onSuccess: () => {
      toast({ title: 'Reddedildi', description: 'Başvuru reddedildi.' });
      queryClient.invalidateQueries({ queryKey: keys.join.list(roomId) });
    },
    onError: (error: any) => {
      toast({ title: 'Hata', description: error?.data?.error || 'Red başarısız', variant: 'destructive' });
    }
  });
};



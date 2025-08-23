import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { keys, invalidationHelpers } from '@/lib/query-keys';
import { get, post, put, API_ENDPOINTS, withQuery } from '@/lib/api';
import { 
  AgreementWithDetails,
  AgreementsListResponseSchema,
  CreateAgreementInput,
  AgreementWithDetailsSchema 
} from '@/lib/schemas';
import { useToast } from '@/components/ui/use-toast';

// Query hooks
export function useAgreements(roomId?: string) {
  return useQuery({
    queryKey: roomId ? keys.agreements.byRoomId(roomId) : keys.agreements.list,
    queryFn: () => get(withQuery(API_ENDPOINTS.agreements, roomId ? { roomId } : {}))
      .then(data => AgreementsListResponseSchema.parse(data)),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useAgreement(agreementId: string) {
  return useQuery({
    queryKey: keys.agreements.byId(agreementId),
    queryFn: () => get(API_ENDPOINTS.agreement(agreementId))
      .then(data => AgreementWithDetailsSchema.parse(data)),
    enabled: !!agreementId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useAgreementSignatureStatus(agreementId: string) {
  return useQuery({
    queryKey: keys.agreements.signatures(agreementId),
    queryFn: () => get(API_ENDPOINTS.pollSignature(agreementId)),
    enabled: !!agreementId,
    staleTime: 1000 * 30, // 30 seconds - more frequent for signature status
    refetchInterval: 1000 * 60, // Poll every minute
  });
}

// Mutation hooks
export function useCreateAgreement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateAgreementInput) => post(API_ENDPOINTS.agreements, data),
    onSuccess: (data, variables) => {
      // Invalidate agreements lists
      invalidationHelpers.agreement(data.id, variables.room_id).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      
      toast({
        title: 'Başarılı',
        description: 'Sözleşme başarıyla oluşturuldu',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error?.data?.message || 'Sözleşme oluşturulamadı',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateAgreement(agreementId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: Partial<Pick<AgreementWithDetails, 'title' | 'description' | 'content' | 'agreement_type'>>) =>
      put(API_ENDPOINTS.agreement(agreementId), data),
    onSuccess: () => {
      // Invalidate agreement details and lists
      invalidationHelpers.agreement(agreementId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      
      toast({
        title: 'Başarılı',
        description: 'Sözleşme başarıyla güncellendi',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error?.data?.message || 'Sözleşme güncellenemedi',
        variant: 'destructive',
      });
    },
  });
}

export function useRequestSignature() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ agreementId, partyIds }: { agreementId: string; partyIds: string[] }) =>
      post(API_ENDPOINTS.requestSignature(agreementId), { party_ids: partyIds }),
    onSuccess: (data, variables) => {
      // Invalidate agreement details and signature status
      queryClient.invalidateQueries({ queryKey: keys.agreements.byId(variables.agreementId) });
      queryClient.invalidateQueries({ queryKey: keys.agreements.signatures(variables.agreementId) });
      
      toast({
        title: 'Başarılı',
        description: 'İmza istekleri başarıyla gönderildi',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error?.data?.message || 'İmza istekleri gönderilemedi',
        variant: 'destructive',
      });
    },
  });
}

export function useSignAgreement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ 
      agreementId, 
      signatureStatus, 
      signatureData 
    }: { 
      agreementId: string; 
      signatureStatus: 'signed' | 'rejected'; 
      signatureData?: any 
    }) =>
      post(API_ENDPOINTS.pollSignature(agreementId), { 
        signature_status: signatureStatus,
        signature_data: signatureData 
      }),
    onSuccess: (data, variables) => {
      // Invalidate agreement details and signature status
      queryClient.invalidateQueries({ queryKey: keys.agreements.byId(variables.agreementId) });
      queryClient.invalidateQueries({ queryKey: keys.agreements.signatures(variables.agreementId) });
      
      const message = variables.signatureStatus === 'signed' 
        ? 'Sözleşme başarıyla imzalandı' 
        : 'Sözleşme reddedildi';
        
      toast({
        title: 'Başarılı',
        description: message,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error?.data?.message || 'İmzalama işlemi başarısız',
        variant: 'destructive',
      });
    },
  });
}

export function useSendKep() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ 
      agreementId, 
      kepAddresses,
      subject,
      message 
    }: { 
      agreementId: string; 
      kepAddresses: string[];
      subject?: string;
      message?: string;
    }) =>
      post(API_ENDPOINTS.sendKep(agreementId), { 
        kep_addresses: kepAddresses,
        subject,
        message 
      }),
    onSuccess: (data, variables) => {
      // Invalidate agreement details
      queryClient.invalidateQueries({ queryKey: keys.agreements.byId(variables.agreementId) });
      
      toast({
        title: 'Başarılı',
        description: 'KEP bildirimleri başarıyla gönderildi',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error?.data?.message || 'KEP bildirimleri gönderilemedi',
        variant: 'destructive',
      });
    },
  });
}

// Combined hook for all user agreements
export function useMyAgreements(userId: string) {
  return useQuery({
    queryKey: keys.agreements.myAgreements(userId),
    queryFn: () => get(withQuery(API_ENDPOINTS.agreements, { userId }))
      .then(data => AgreementsListResponseSchema.parse(data)),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Hook to get agreements that need user's signature
export function usePendingSignatures(userId: string) {
  const { data: agreements } = useAgreements();
  
  return {
    data: agreements?.items.filter(agreement => 
      agreement.agreement_party.some(party => 
        party.user_id === userId && party.signature_status === 'pending'
      )
    ) || [],
    isLoading: false, // Derived from existing query
  };
}
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { keys, invalidationHelpers } from '@/lib/query-keys';
import { get, post, put, del, API_ENDPOINTS, withQuery } from '@/lib/api';
import { 
  KksSubmission,
  KksListResponseSchema,
  CreateKksSubmissionInput,
  KksSubmissionSchema,
  KksEvidenceSchema
} from '@/lib/schemas';
import { useToast } from '@/components/ui/use-toast';

// Query hooks
export function useKKSSubmissions(roomId?: string, userId?: string) {
  const params: any = {};
  if (roomId) params.roomId = roomId;
  if (userId) params.userId = userId;

  return useQuery({
    queryKey: roomId 
      ? keys.kks.byRoomId(roomId) 
      : userId 
      ? keys.kks.mySubmissions(userId)
      : keys.kks.list,
    queryFn: () => get(withQuery(API_ENDPOINTS.kks, params))
      .then(data => KksListResponseSchema.parse(data)),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useKKSSubmission(submissionId: string) {
  return useQuery({
    queryKey: keys.kks.byId(submissionId),
    queryFn: () => get(API_ENDPOINTS.kksSubmission(submissionId))
      .then(data => KksSubmissionSchema.parse(data)),
    enabled: !!submissionId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useKKSEvidence(submissionId: string) {
  return useQuery({
    queryKey: keys.kks.evidence(submissionId),
    queryFn: () => get(API_ENDPOINTS.kksEvidence(submissionId)),
    enabled: !!submissionId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Mutation hooks
export function useCreateKKSSubmission() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateKksSubmissionInput) => post(API_ENDPOINTS.kks, data),
    onSuccess: (data, variables) => {
      // Invalidate KKS lists
      invalidationHelpers.kks(data.id!, variables.room_id!).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      
      toast({
        title: 'Başarılı',
        description: 'KKS gönderimi başarıyla oluşturuldu',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error?.data?.message || 'KKS gönderimi oluşturulamadı',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateKKSSubmission(submissionId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: Partial<Pick<KksSubmission, 'title' | 'description' | 'submission_data' | 'status'>>) =>
      put(API_ENDPOINTS.kksSubmission(submissionId), data),
    onSuccess: () => {
      // Invalidate submission details and lists
      invalidationHelpers.kks(submissionId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      
      toast({
        title: 'Başarılı',
        description: 'KKS gönderimi başarıyla güncellendi',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error?.data?.message || 'KKS gönderimi güncellenemedi',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteKKSSubmission(submissionId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => del(API_ENDPOINTS.kksSubmission(submissionId)),
    onSuccess: () => {
      // Invalidate all KKS lists
      queryClient.invalidateQueries({ queryKey: keys.kks.all });
      
      toast({
        title: 'Başarılı',
        description: 'KKS gönderimi başarıyla silindi',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error?.data?.message || 'KKS gönderimi silinemedi',
        variant: 'destructive',
      });
    },
  });
}

export function useSubmitKKS() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (submissionId: string) => 
      put(API_ENDPOINTS.kksSubmission(submissionId), { status: 'submitted' }),
    onSuccess: (data, submissionId) => {
      // Invalidate submission details and lists
      invalidationHelpers.kks(submissionId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      
      toast({
        title: 'Başarılı',
        description: 'KKS gönderimi başarıyla onaya sunuldu',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error?.data?.message || 'KKS gönderimi onaya sunulamadı',
        variant: 'destructive',
      });
    },
  });
}

export function useGenerateEvidence() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ submissionId, fileType }: { submissionId: string; fileType: 'pdf' | 'xml' | 'json' }) =>
      post(API_ENDPOINTS.kksEvidence(submissionId), { file_type: fileType }),
    onSuccess: (data, variables) => {
      // Invalidate evidence list
      queryClient.invalidateQueries({ queryKey: keys.kks.evidence(variables.submissionId) });
      
      toast({
        title: 'Başarılı',
        description: 'Delil dosyası başarıyla oluşturuldu',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error?.data?.message || 'Delil dosyası oluşturulamadı',
        variant: 'destructive',
      });
    },
  });
}

export function useSendKKS() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ 
      submissionId, 
      recipientEmail,
      officialSend,
      notes 
    }: { 
      submissionId: string; 
      recipientEmail?: string;
      officialSend?: boolean;
      notes?: string;
    }) =>
      post(API_ENDPOINTS.kksSend(submissionId), { 
        recipient_email: recipientEmail,
        official_send: officialSend || false,
        notes 
      }),
    onSuccess: (data, variables) => {
      // Invalidate submission details and lists
      invalidationHelpers.kks(variables.submissionId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      
      const message = data.official_send 
        ? 'KKS gönderimi resmi kayda başarıyla gönderildi'
        : 'KKS gönderimi başarıyla gönderildi';
        
      toast({
        title: 'Başarılı',
        description: message,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error?.data?.message || 'KKS gönderimi gönderilemedi',
        variant: 'destructive',
      });
    },
  });
}

// Helper hooks
export function useMyKKSSubmissions(userId: string) {
  return useKKSSubmissions(undefined, userId);
}

export function useRoomKKSSubmissions(roomId: string) {
  return useKKSSubmissions(roomId);
}

// Hook to get draft submissions for easy access
export function useDraftSubmissions(userId: string) {
  const { data: submissions, ...rest } = useMyKKSSubmissions(userId);
  
  return {
    data: submissions?.items.filter(submission => submission.status === 'draft') || [],
    ...rest,
  };
}

// Hook to get submitted submissions
export function useSubmittedSubmissions(userId: string) {
  const { data: submissions, ...rest } = useMyKKSSubmissions(userId);
  
  return {
    data: submissions?.items.filter(submission => submission.status === 'submitted') || [],
    ...rest,
  };
}

// Hook to get sent submissions
export function useSentSubmissions(userId: string) {
  const { data: submissions, ...rest } = useMyKKSSubmissions(userId);
  
  return {
    data: submissions?.items.filter(submission => submission.status === 'sent') || [],
    ...rest,
  };
}
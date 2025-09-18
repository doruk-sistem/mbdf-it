import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { keys, invalidationHelpers } from '@/lib/query-keys';
import { get, uploadFile, API_ENDPOINTS, withQuery } from '@/lib/api';
import { 
  DocumentWithUploader,
  DocumentsListResponseSchema,
  DocumentWithUploaderSchema 
} from '@/lib/schemas';
import { useToast } from '@/components/ui/use-toast';
import { deleteDocument } from '@/app/actions/documents';

// Query hooks
export function useDocuments(roomId: string) {
  return useQuery({
    queryKey: keys.documents.list(roomId),
    queryFn: () => get(withQuery(API_ENDPOINTS.documents, { roomId }))
      .then(data => DocumentsListResponseSchema.parse(data)),
    enabled: !!roomId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useDocument(documentId: string) {
  return useQuery({
    queryKey: keys.documents.byId(documentId),
    queryFn: () => get(API_ENDPOINTS.document(documentId))
      .then(data => DocumentWithUploaderSchema.parse(data)),
    enabled: !!documentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Mutation hooks
export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: {
      file: File;
      roomId: string;
      title: string;
      description?: string;
      visibility?: 'public' | 'private';
    }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('roomId', data.roomId);
      formData.append('title', data.title);
      if (data.description) formData.append('description', data.description);
      if (data.visibility) formData.append('visibility', data.visibility);

      return uploadFile(API_ENDPOINTS.documentUpload, formData);
    },
    onSuccess: (data, variables) => {
      // Invalidate documents list for the room
      invalidationHelpers.document(variables.roomId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.data?.message || 'Failed to upload document',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteDocument(documentId: string, roomId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => deleteDocument(documentId),
    onSuccess: () => {
      // Invalidate documents list
      invalidationHelpers.document(roomId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      toast({
        title: 'Başarılı',
        description: 'Doküman başarıyla silindi.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error?.message || 'Doküman silinirken bir hata oluştu',
        variant: 'destructive',
      });
    },
  });
}
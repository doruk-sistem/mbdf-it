import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { keys, invalidationHelpers } from '@/lib/query-keys';
import { get, uploadFile, del, API_ENDPOINTS, withQuery } from '@/lib/api';
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

export function useUserDocuments(userId: string) {
  return useQuery({
    queryKey: keys.documents.byUserId(userId),
    queryFn: async () => {
      try {
        const data = await get(API_ENDPOINTS.userDocuments);
        const parsed = DocumentsListResponseSchema.parse(data);
        return parsed;
      } catch (error) {
        console.error('❌ useUserDocuments: Parse error:', error);
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (documentId: string) => deleteDocument(documentId),
    onMutate: async (documentId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: keys.activities.all });
      await queryClient.cancelQueries({ queryKey: keys.documents.all });
      
      // Snapshot the previous values
      const previousActivities = queryClient.getQueriesData({ queryKey: keys.activities.all });
      const previousDocuments = queryClient.getQueriesData({ queryKey: keys.documents.all });
      
      // Optimistically update the activities list
      queryClient.setQueriesData({ queryKey: keys.activities.all }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items?.filter((activity: any) => activity.documentId !== documentId) || []
        };
      });
      
      // Optimistically update the documents list
      queryClient.setQueriesData({ queryKey: keys.documents.all }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items?.filter((doc: any) => doc.id !== documentId) || []
        };
      });
      
      return { previousActivities, previousDocuments };
    },
    onSuccess: () => {
      // Invalidate documents queries
      queryClient.invalidateQueries({ queryKey: keys.documents.all });
      // Invalidate activities queries to update the activity list
      queryClient.invalidateQueries({ queryKey: keys.activities.all });
      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      });
    },
    onError: (error: any, documentId: string, context: any) => {
      // Rollback optimistic update on error
      if (context?.previousActivities) {
        context.previousActivities.forEach(([queryKey, data]: any) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousDocuments) {
        context.previousDocuments.forEach(([queryKey, data]: any) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: 'Error',
        description: error?.message || 'Failed to delete document',
        variant: 'destructive',
      });
    },
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
      // Invalidate activities to show new document upload activity
      queryClient.invalidateQueries({ queryKey: keys.activities.all });
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

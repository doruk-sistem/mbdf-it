import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { keys, invalidationHelpers } from '@/lib/query-keys';
import { get, post, API_ENDPOINTS, withQuery } from '@/lib/api';
import { 
  AccessRequestWithDetails,
  AccessRequestsListResponseSchema,
  CreateAccessRequestInput,
  ApproveAccessRequestInput,
  RejectAccessRequestInput 
} from '@/lib/schemas';
import { useToast } from '@/components/ui/use-toast';

// Query hooks
export function useAccessRequests(roomId: string) {
  return useQuery({
    queryKey: keys.accessRequests.list(roomId),
    queryFn: () => get(withQuery(API_ENDPOINTS.accessRequests, { roomId }))
      .then(data => AccessRequestsListResponseSchema.parse(data)),
    enabled: !!roomId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function usePackages(roomId: string) {
  return useQuery({
    queryKey: keys.packages.list(roomId),
    queryFn: () => get(withQuery(API_ENDPOINTS.packages, { roomId })),
    enabled: !!roomId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useMyAccessRequests(userId: string) {
  return useQuery({
    queryKey: keys.accessRequests.byUserId(userId),
    queryFn: () => get(withQuery(API_ENDPOINTS.accessRequests, { userId })),
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });
}

// Mutation hooks
export function useCreateAccessRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateAccessRequestInput) => 
      post(API_ENDPOINTS.accessRequests, data),
    onSuccess: (data, variables) => {
      // Get roomId from the package (we'd need to fetch this or pass it)
      // For now, invalidate all access request queries
      queryClient.invalidateQueries({ queryKey: keys.accessRequests.all });
      queryClient.invalidateQueries({ queryKey: keys.packages.all });
      
      toast({
        title: 'Success',
        description: 'Access request submitted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.data?.message || 'Failed to submit access request',
        variant: 'destructive',
      });
    },
  });
}

export function useApproveAccessRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApproveAccessRequestInput }) => 
      post(API_ENDPOINTS.approveRequest(id), data),
    onSuccess: (data, variables) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: keys.accessRequests.all });
      queryClient.invalidateQueries({ queryKey: keys.packages.all });
      
      toast({
        title: 'Success',
        description: 'Access request approved successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.data?.message || 'Failed to approve access request',
        variant: 'destructive',
      });
    },
  });
}

export function useRejectAccessRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RejectAccessRequestInput }) => 
      post(API_ENDPOINTS.rejectRequest(id), data),
    onSuccess: (data, variables) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: keys.accessRequests.all });
      queryClient.invalidateQueries({ queryKey: keys.packages.all });
      
      toast({
        title: 'Success',
        description: 'Access request rejected successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.data?.message || 'Failed to reject access request',
        variant: 'destructive',
      });
    },
  });
}

export function useCreatePackage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: {
      room_id: string;
      name: string;
      description?: string;
      package_data?: any;
    }) => post(API_ENDPOINTS.packages, data),
    onSuccess: (data, variables) => {
      // Invalidate packages for the room
      queryClient.invalidateQueries({ queryKey: keys.packages.list(variables.room_id) });
      
      toast({
        title: 'Success',
        description: 'Package created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.data?.message || 'Failed to create package',
        variant: 'destructive',
      });
    },
  });
}
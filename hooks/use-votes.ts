import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { keys, invalidationHelpers } from '@/lib/query-keys';
import { get, post, API_ENDPOINTS, withQuery } from '@/lib/api';
import { 
  VotingSummaryResponseSchema,
  SubmitVoteInput 
} from '@/lib/schemas';
import { useToast } from '@/components/ui/use-toast';

// Query hooks
export function useVotes(roomId: string) {
  return useQuery({
    queryKey: keys.votes.summary(roomId),
    queryFn: () => get(withQuery(API_ENDPOINTS.votes, { roomId }))
      .then(data => VotingSummaryResponseSchema.parse(data)),
    enabled: !!roomId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useMyVote(roomId: string) {
  return useQuery({
    queryKey: keys.votes.me(roomId),
    queryFn: () => get(withQuery(API_ENDPOINTS.votes, { roomId, myVote: true })),
    enabled: !!roomId,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useCandidates(roomId: string) {
  return useQuery({
    queryKey: keys.candidates.list(roomId),
    queryFn: () => get(withQuery(API_ENDPOINTS.candidates, { roomId })),
    enabled: !!roomId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Mutation hooks
export function useSubmitVote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: SubmitVoteInput & { roomId: string }) => {
      const { roomId, ...voteData } = data;
      return post(API_ENDPOINTS.votes, voteData);
    },
    onSuccess: (data, variables) => {
      // Invalidate voting-related queries
      invalidationHelpers.vote(variables.roomId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      
      toast({
        title: 'Success',
        description: 'Vote submitted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.data?.message || 'Failed to submit vote',
        variant: 'destructive',
      });
    },
  });
}

export function useFinalizeLR() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (roomId: string) => post(API_ENDPOINTS.finalizeLr, { roomId }),
    onSuccess: (data, roomId) => {
      // Invalidate voting and room data
      invalidationHelpers.vote(roomId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      invalidationHelpers.room(roomId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      
      toast({
        title: 'Success',
        description: 'Lead Registrant selection finalized successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.data?.message || 'Failed to finalize Lead Registrant selection',
        variant: 'destructive',
      });
    },
  });
}
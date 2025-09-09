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

export function useNominateCandidate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { roomId: string; userId: string }) => {
      return post(API_ENDPOINTS.candidates, {
        room_id: data.roomId,
        user_id: data.userId
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate candidates list
      queryClient.invalidateQueries({ queryKey: keys.candidates.list(variables.roomId) });
      
      toast({
        title: 'Success',
        description: 'Candidate nominated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.data?.message || 'Failed to nominate candidate',
        variant: 'destructive',
      });
    },
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
    onSuccess: async (data, variables) => {
      // Invalidate voting-related queries
      invalidationHelpers.vote(variables.roomId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      
      toast({
        title: 'Success',
        description: 'Vote submitted successfully',
      });

      // Check if all members have voted and auto-finalize if needed
      try {
        // Get fresh voting data after the vote
        const votingData = await queryClient.fetchQuery({
          queryKey: keys.votes.summary(variables.roomId),
          queryFn: () => get(withQuery(API_ENDPOINTS.votes, { roomId: variables.roomId }))
            .then(data => VotingSummaryResponseSchema.parse(data)),
        });

        // Get room members data
        const membersData = await queryClient.fetchQuery({
          queryKey: keys.members.list(variables.roomId),
          queryFn: () => get(withQuery(API_ENDPOINTS.members, { roomId: variables.roomId })),
        });

        const totalMembers = (membersData as any)?.items?.length || 0;
        const isFinalized = votingData?.is_finalized || false;

        // Get candidates to calculate eligible voters (non-candidates)
        const candidates = await queryClient.fetchQuery({
          queryKey: keys.candidates.list(variables.roomId),
          queryFn: () => get(withQuery(API_ENDPOINTS.candidates, { roomId: variables.roomId })),
        });

        const candidateUserIds = (candidates as any)?.items?.map((c: any) => c.user_id) || [];
        const eligibleVoters = totalMembers - candidateUserIds.length; // Non-candidate members

        // Check if all eligible voters have voted for all candidates
        // Each eligible voter should have voted for each candidate
        const expectedTotalVotes = eligibleVoters * (candidates as any)?.items?.length || 0;
        const actualTotalVotes = votingData?.results?.reduce((sum, result) => sum + result.vote_count, 0) || 0;

        // Auto-finalize if all eligible voters have voted for all candidates and not already finalized
        if (eligibleVoters > 0 && actualTotalVotes >= expectedTotalVotes && !isFinalized && votingData?.results?.length > 0) {
          // Check for tie (equal scores)
          const maxScore = Math.max(...votingData.results.map(r => r.total_score));
          const topCandidates = votingData.results.filter(r => r.total_score === maxScore);
          
          if (topCandidates.length > 1) {
            // There's a tie, show tie-breaker message
            toast({
              title: '🔄 Tekrar Oylama Gerekli',
              description: `En yüksek puanlı adaylar eşit (${maxScore.toFixed(1)}/5.0)! Lütfen tekrar değerlendirin.`,
              variant: 'default',
              duration: 10000,
            });
            return; // Don't finalize, require re-voting
          }
          
          // No tie, proceed with finalization
          const bestCandidate = topCandidates[0];

          // Auto-finalize
          try {
            await post(API_ENDPOINTS.finalizeLr, { 
              room_id: variables.roomId, 
              candidate_id: bestCandidate.candidate_id 
            });

            // Invalidate all related queries
            invalidationHelpers.vote(variables.roomId).forEach(key => {
              queryClient.invalidateQueries({ queryKey: key });
            });
            invalidationHelpers.room(variables.roomId).forEach(key => {
              queryClient.invalidateQueries({ queryKey: key });
            });

            // Show success message with more details
            toast({
              title: '🎉 Oylama Tamamlandı!',
              description: `Tüm oy kullanabilen üyeler tüm adayları değerlendirdi (${eligibleVoters} üye × ${(candidates as any)?.items?.length || 0} aday). ${bestCandidate.full_name || 'Seçilen aday'} en yüksek skorla (${bestCandidate.total_score.toFixed(1)}/5.0) LR olarak seçildi!`,
              duration: 8000, // Show longer
            });
          } catch (finalizeError) {
            console.error('Auto-finalize failed:', finalizeError);
            // Show error to user for transparency
            toast({
              title: 'Finalize Hatası',
              description: 'Oylama tamamlandı ama LR seçimi yapılamadı. Lütfen admin ile iletişime geçin.',
              variant: 'destructive',
            });
          }
        }
      } catch (error) {
        console.error('Auto-finalize check failed:', error);
        // Don't show error to user, just log it
      }
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

export function useSubmitAllVotes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { roomId: string; votes: Array<SubmitVoteInput> }) => {
      // Submit all votes sequentially to avoid race conditions
      const results = [];
      for (const vote of data.votes) {
        const result = await post(API_ENDPOINTS.votes, vote);
        results.push(result);
      }
      return results;
    },
    onSuccess: async (data, variables) => {
      // Invalidate voting-related queries
      invalidationHelpers.vote(variables.roomId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      
      toast({
        title: 'Success',
        description: `Tüm adaylar için değerlendirmeleriniz kaydedildi (${variables.votes.length} aday)`,
      });

      // Check if all members have voted and auto-finalize if needed
      try {
        // Get fresh voting data after all votes
        const votingData = await queryClient.fetchQuery({
          queryKey: keys.votes.summary(variables.roomId),
          queryFn: () => get(withQuery(API_ENDPOINTS.votes, { roomId: variables.roomId }))
            .then(data => VotingSummaryResponseSchema.parse(data)),
        });

        // Get room members data
        const membersData = await queryClient.fetchQuery({
          queryKey: keys.members.list(variables.roomId),
          queryFn: () => get(withQuery(API_ENDPOINTS.members, { roomId: variables.roomId })),
        });

        const totalMembers = (membersData as any)?.items?.length || 0;
        const isFinalized = votingData?.is_finalized || false;

        // Get candidates to calculate eligible voters (non-candidates)
        const candidates = await queryClient.fetchQuery({
          queryKey: keys.candidates.list(variables.roomId),
          queryFn: () => get(withQuery(API_ENDPOINTS.candidates, { roomId: variables.roomId })),
        });

        const candidateUserIds = (candidates as any)?.items?.map((c: any) => c.user_id) || [];
        const eligibleVoters = totalMembers - candidateUserIds.length; // Non-candidate members

        // Check if all eligible voters have voted for all candidates
        // Each eligible voter should have voted for each candidate
        const expectedTotalVotes = eligibleVoters * (candidates as any)?.items?.length || 0;
        const actualTotalVotes = votingData?.results?.reduce((sum, result) => sum + result.vote_count, 0) || 0;

        // Auto-finalize if all eligible voters have voted for all candidates and not already finalized
        if (eligibleVoters > 0 && actualTotalVotes >= expectedTotalVotes && !isFinalized && votingData?.results?.length > 0) {
          // Check for tie (equal scores)
          const maxScore = Math.max(...votingData.results.map(r => r.total_score));
          const topCandidates = votingData.results.filter(r => r.total_score === maxScore);
          
          if (topCandidates.length > 1) {
            // There's a tie, show tie-breaker message
            toast({
              title: '🔄 Tekrar Oylama Gerekli',
              description: `En yüksek puanlı adaylar eşit (${maxScore.toFixed(1)}/5.0)! Lütfen tekrar değerlendirin.`,
              variant: 'default',
              duration: 10000,
            });
            return; // Don't finalize, require re-voting
          }
          
          // No tie, proceed with finalization
          const bestCandidate = topCandidates[0];

          // Auto-finalize
          try {
            await post(API_ENDPOINTS.finalizeLr, { 
              room_id: variables.roomId, 
              candidate_id: bestCandidate.candidate_id 
            });

            // Invalidate all related queries
            invalidationHelpers.vote(variables.roomId).forEach(key => {
              queryClient.invalidateQueries({ queryKey: key });
            });
            invalidationHelpers.room(variables.roomId).forEach(key => {
              queryClient.invalidateQueries({ queryKey: key });
            });

            // Show success message with more details
            toast({
              title: '🎉 Oylama Tamamlandı!',
              description: `Tüm oy kullanabilen üyeler tüm adayları değerlendirdi (${eligibleVoters} üye × ${(candidates as any)?.items?.length || 0} aday). ${bestCandidate.full_name || 'Seçilen aday'} en yüksek skorla (${bestCandidate.total_score.toFixed(1)}/5.0) LR olarak seçildi!`,
              duration: 8000, // Show longer
            });
          } catch (finalizeError) {
            console.error('Auto-finalize failed:', finalizeError);
            // Show error to user for transparency
            toast({
              title: 'Finalize Hatası',
              description: 'Oylama tamamlandı ama LR seçimi yapılamadı. Lütfen admin ile iletişime geçin.',
              variant: 'destructive',
            });
          }
        }
      } catch (error) {
        console.error('Auto-finalize check failed:', error);
        // Don't show error to user, just log it
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.data?.message || 'Failed to submit votes',
        variant: 'destructive',
      });
    },
  });
}

export function useFinalizeLR() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { roomId: string; candidateId: string }) => 
      post(API_ENDPOINTS.finalizeLr, { 
        room_id: data.roomId, 
        candidate_id: data.candidateId 
      }),
    onSuccess: (data, variables) => {
      // Invalidate voting and room data
      invalidationHelpers.vote(variables.roomId).forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      invalidationHelpers.room(variables.roomId).forEach(key => {
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
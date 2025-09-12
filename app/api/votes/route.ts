import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';
import { VotingSummaryResponseSchema, SubmitVoteSchema } from '@/lib/schemas';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json(
        { error: 'roomId parameter is required', success: false },
        { status: 400 }
      );
    }

    // Allow all authenticated users to view voting results
    // No membership check needed for viewing

    // Use admin client to bypass RLS for reading voting data
    const adminSupabase = createAdminSupabase();
    
    // Get voting results and user's votes
    const [candidatesData, myVotesResult] = await Promise.all([
      // Get candidates for this room using admin client
      adminSupabase
        .from('lr_candidate')
        .select('*')
        .eq('room_id', roomId),
      // Get current user's votes using regular client (user can see their own votes)
      supabase
        .from('lr_vote')
        .select('*')
        .eq('room_id', roomId)
        .eq('voter_id', user.id)
    ]);

    if (candidatesData.error) {
      console.error('Error fetching candidates:', candidatesData.error);
      return NextResponse.json(
        { error: 'Failed to fetch candidates', success: false },
        { status: 500 }
      );
    }

    // Get vote counts and scores for each candidate
    const candidatesWithScores = await Promise.all(
      (candidatesData.data || []).map(async (candidate: any) => {
        // Get profile for this candidate using admin client
        const { data: profile } = await adminSupabase
          .from('profiles')
          .select('full_name')
          .eq('id', candidate.user_id)
          .single() as { data: { full_name: string } | null };
        // Get votes for this candidate using admin client
        const { data: votes } = await adminSupabase
          .from('lr_vote')
          .select('*')
          .eq('candidate_id', candidate.id);

        if (!votes || votes.length === 0) {
          return {
            candidate_id: candidate.id,
            user_id: candidate.user_id,
            full_name: profile?.full_name || 'Unknown',
            total_score: 0,
            vote_count: 0
          };
        }

        // Calculate average score per vote, then average across all votes
        const voteAverages = votes.map((vote: any) => {
          const voteTotal = (vote.technical_score || 0) + (vote.experience_score || 0) + 
                           (vote.availability_score || 0) + (vote.communication_score || 0) + 
                           (vote.leadership_score || 0);
          return voteTotal / 5; // 5 criteria per vote
        });

        const averageScore = voteAverages.reduce((sum: number, avg: number) => sum + avg, 0) / votes.length;

        return {
          candidate_id: candidate.id,
          user_id: candidate.user_id,
          full_name: profile?.full_name || 'Unknown',
          total_score: averageScore,
          vote_count: votes.length
        };
      })
    );

    // Check if voting is finalized by looking at lr_candidate table
    // Voting is finalized if any candidate has is_selected = true
    const { data: selectedCandidate } = await adminSupabase
      .from('lr_candidate')
      .select('is_selected')
      .eq('room_id', roomId)
      .eq('is_selected', true)
      .single();

    // Check if all room members have voted
    const { data: roomMembers } = await adminSupabase
      .from('mbdf_member')
      .select('user_id')
      .eq('room_id', roomId);

    const { data: allVotes } = await adminSupabase
      .from('lr_vote')
      .select('voter_id')
      .eq('room_id', roomId);

    // Get unique voters
    const uniqueVoters = new Set(allVotes?.map((vote: any) => vote.voter_id) || []);
    const totalMembers = roomMembers?.length || 0;
    const totalVoters = uniqueVoters.size;

    // Check for tie (equal scores)
    const maxScore = candidatesWithScores.length > 0 ? Math.max(...candidatesWithScores.map(r => r.total_score)) : 0;
    const topCandidates = candidatesWithScores.filter(r => r.total_score === maxScore);
    const hasTie = topCandidates.length > 1 && maxScore > 0;

    // Voting is finalized only if:
    // 1. A candidate is selected AND
    // 2. All members have voted AND
    // 3. No tie exists
    const isVotingFinalized = !!selectedCandidate && totalVoters >= totalMembers && !hasTie;

    // Auto-reset is_selected if conditions are not met
    if (selectedCandidate && (!isVotingFinalized)) {
      await (adminSupabase as any)
        .from('lr_candidate')
        .update({ is_selected: false })
        .eq('room_id', roomId)
        .eq('is_selected', true);
    }

    const response = VotingSummaryResponseSchema.parse({
      results: candidatesWithScores,
      my_vote: myVotesResult.error ? null : myVotesResult.data,
      is_finalized: isVotingFinalized,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error in GET /api/votes:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid response format', details: error.issues, success: false },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = SubmitVoteSchema.parse(body);

    // Use admin client to bypass RLS for vote submission
    const adminSupabase = createAdminSupabase();

    // Get room ID and creation time from candidate using admin client
    const { data: candidate, error: candidateError } = await adminSupabase
      .from('lr_candidate')
      .select('room_id, created_at')
      .eq('id', validatedData.candidate_id!)
      .single() as { data: { room_id: string; created_at: string } | null; error: any };

    if (candidateError || !candidate) {
      console.error('Error fetching candidate:', candidateError);
      return NextResponse.json(
        { error: 'Candidate not found', success: false },
        { status: 404 }
      );
    }

    // Server-side voting time validation - use first candidate's time
    const now = new Date();
    
    // Get the first candidate (earliest created) for timing
    const { data: firstCandidate } = await adminSupabase
      .from('lr_candidate')
      .select('created_at')
      .eq('room_id', candidate.room_id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single() as { data: { created_at: string } | null; error: any };
    
    if (!firstCandidate) {
      return NextResponse.json(
        { error: 'No candidates found', success: false },
        { status: 404 }
      );
    }
    
    const firstCandidateCreatedAt = new Date(firstCandidate.created_at);
    const votingStartTime = new Date(firstCandidateCreatedAt.getTime() + (60 * 1000)); // +1 minute
    const votingEndTime = new Date(votingStartTime.getTime() + (60 * 1000) + (5 * 1000)); // +1 minute + 5 seconds tolerance
    
    // Only check if voting has started, allow voting even after time expires
    if (now < votingStartTime) {
      return NextResponse.json(
        { error: 'Voting has not started yet', success: false },
        { status: 400 }
      );
    }
    
    // Check if user has access to this room using admin client
    const { data: membership, error: memberError } = await adminSupabase
      .from('mbdf_member')
      .select('id')
      .eq('room_id', candidate.room_id)
      .eq('user_id', user.id)
      .single();

    if (memberError) {
      console.error('Error checking membership:', memberError);
      return NextResponse.json(
        { error: 'Access denied', success: false },
        { status: 403 }
      );
    }

    // Check if user is a candidate (candidates cannot vote)
    const { data: isCandidate, error: candidateCheckError } = await adminSupabase
      .from('lr_candidate')
      .select('id')
      .eq('room_id', candidate.room_id)
      .eq('user_id', user.id)
      .single();

    if (candidateCheckError && candidateCheckError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (user is not a candidate)
      console.error('Error checking if user is candidate:', candidateCheckError);
      return NextResponse.json(
        { error: 'Failed to verify candidate status', success: false },
        { status: 500 }
      );
    }

    if (isCandidate) {
      return NextResponse.json(
        { error: 'Candidates cannot vote for themselves or other candidates', success: false },
        { status: 403 }
      );
    }

    // Upsert vote using admin client with proper conflict resolution
    const { data: vote, error } = await adminSupabase
      .from('lr_vote')
      .upsert([
        {
          room_id: candidate.room_id,
          candidate_id: validatedData.candidate_id!,
          voter_id: user.id,
          technical_score: validatedData.technical_score,
          experience_score: validatedData.experience_score,
          communication_score: validatedData.communication_score,
          leadership_score: validatedData.leadership_score,
          availability_score: validatedData.availability_score,
        },
      ] as any, {
        onConflict: 'room_id,voter_id,candidate_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error submitting vote:', error);
      return NextResponse.json(
        { error: 'Failed to submit vote', success: false },
        { status: 500 }
      );
    }

    return NextResponse.json(vote);
  } catch (error) {
    console.error('API Error in POST /api/votes:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues, success: false },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';
import { z } from 'zod';

const FinalizeLRSchema = z.object({
  room_id: z.string().uuid(),
  candidate_id: z.string().uuid(),
});

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
    console.log('Finalize LR body:', body);
    const validatedData = FinalizeLRSchema.parse(body);

    // Use admin client to bypass RLS
    const adminSupabase = createAdminSupabase();

    // Check if user is a member of the room
    const { data: membership, error: memberError } = await adminSupabase
      .from('mbdf_member')
      .select('role')
      .eq('room_id', validatedData.room_id)
      .eq('user_id', user.id)
      .single() as { data: { role: string } | null; error: any };

    if (memberError || !membership) {
      return NextResponse.json(
        { error: 'Access denied: You must be a member of this room', success: false },
        { status: 403 }
      );
    }

    // Any room member can finalize LR selection (democratic process)
    // No special admin privileges required

    // Verify candidate exists and is in the correct room
    const { data: candidate, error: candidateError } = await adminSupabase
      .from('lr_candidate')
      .select('id, user_id, is_selected')
      .eq('id', validatedData.candidate_id)
      .eq('room_id', validatedData.room_id)
      .single() as { data: { id: string; user_id: string; is_selected: boolean } | null; error: any };

    if (candidateError || !candidate) {
      console.error('Error fetching candidate:', candidateError);
      return NextResponse.json(
        { error: 'Candidate not found in this room', success: false },
        { status: 404 }
      );
    }

    // Check if LR is already finalized
    if (candidate.is_selected) {
      return NextResponse.json(
        { error: 'LR selection is already finalized', success: false },
        { status: 400 }
      );
    }

    // Get all voting results for tie checking
    const { data: allVotes } = await adminSupabase
      .from('lr_vote')
      .select('candidate_id, technical_score, experience_score, availability_score, communication_score, leadership_score')
      .eq('room_id', validatedData.room_id);

    // Calculate scores for all candidates
    const candidateScores: { [key: string]: number } = {};
    
    if (allVotes && allVotes.length > 0) {
      // Group votes by candidate
      const votesByCandidate = allVotes.reduce((acc: any, vote: any) => {
        if (!acc[vote.candidate_id]) {
          acc[vote.candidate_id] = [];
        }
        acc[vote.candidate_id].push(vote);
        return acc;
      }, {});

      // Calculate average score for each candidate
      Object.keys(votesByCandidate).forEach(candidateId => {
        const candidateVotes = votesByCandidate[candidateId];
        const voteAverages = candidateVotes.map((vote: any) => {
          const voteTotal = (vote.technical_score || 0) + (vote.experience_score || 0) + 
                           (vote.availability_score || 0) + (vote.communication_score || 0) + 
                           (vote.leadership_score || 0);
          return voteTotal / 5; // 5 criteria per vote
        });
        candidateScores[candidateId] = voteAverages.reduce((sum: number, avg: number) => sum + avg, 0) / candidateVotes.length;
      });
    }

    // Check for tie (multiple candidates with same highest score)
    const scores = Object.values(candidateScores);
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const topCandidates = Object.keys(candidateScores).filter(candidateId => 
      candidateScores[candidateId] === maxScore
    );

    // Prevent finalization if there's a tie
    if (topCandidates.length > 1 && maxScore > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot finalize: Multiple candidates have the same highest score. Please resolve the tie first.', 
          success: false,
          tie_detected: true,
          top_candidates: topCandidates,
          max_score: maxScore
        },
        { status: 409 }
      );
    }

    // Get selected candidate's score for logging
    const selectedCandidateScore = candidateScores[validatedData.candidate_id] || 0;
    const selectedCandidateVotes = allVotes?.filter((vote: any) => vote.candidate_id === validatedData.candidate_id) || [];

    // Start transaction-like operations
    try {
      // 1. Reset all candidates in the room (unselect all)
      const { error: resetError } = await (adminSupabase as any)
        .from('lr_candidate')
        .update({ is_selected: false })
        .eq('room_id', validatedData.room_id);

      if (resetError) {
        console.error('Error resetting candidates:', resetError);
        throw new Error('Failed to reset candidates');
      }

      // 2. Select the chosen candidate
      const { error: selectError } = await (adminSupabase as any)
        .from('lr_candidate')
        .update({ is_selected: true })
        .eq('id', validatedData.candidate_id);

      if (selectError) {
        console.error('Error selecting candidate:', selectError);
        throw new Error('Failed to select candidate');
      }

      // 3. Update member role to LR
      const { error: roleError } = await (adminSupabase as any)
        .from('mbdf_member')
        .update({ role: 'lr' })
        .eq('room_id', validatedData.room_id)
        .eq('user_id', candidate.user_id);

      if (roleError) {
        console.error('Error updating member role:', roleError);
        throw new Error('Failed to update member role');
      }

      // 4. Log the action
      const { error: logError } = await adminSupabase
        .from('audit_log')
        .insert({
          room_id: validatedData.room_id,
          user_id: user.id,
          action: 'lr_selected',
          resource_type: 'lr_candidate',
          resource_id: validatedData.candidate_id,
          new_values: { 
            candidate_user_id: candidate.user_id,
            total_score: selectedCandidateScore,
            vote_count: selectedCandidateVotes.length
          }
        } as any);

      if (logError) {
        console.error('Error logging action:', logError);
        // Don't throw error for logging failure, just log it
      }

      // Get candidate profile for response
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', candidate.user_id)
        .single() as { data: { full_name: string; email: string } | null };

      return NextResponse.json({
        success: true,
        message: 'LR selection finalized successfully',
        data: {
          candidate_id: validatedData.candidate_id,
          candidate_name: profile?.full_name || 'Unknown',
          candidate_email: profile?.email || 'Unknown',
          total_score: selectedCandidateScore,
          vote_count: selectedCandidateVotes.length
        }
      });

    } catch (transactionError) {
      console.error('Transaction error during LR finalization:', transactionError);
      return NextResponse.json(
        { error: 'Failed to finalize LR selection', success: false },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('API Error in POST /api/lr/finalize:', error);
    
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

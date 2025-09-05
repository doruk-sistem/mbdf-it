import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
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

    // Get voting results and user's vote
    const [votingResults, myVote] = await Promise.all([
      // Get aggregated voting results
      supabase.rpc('get_voting_results', { room_id_param: roomId }),
      // Get current user's vote
      supabase
        .from('lr_vote')
        .select('*')
        .eq('room_id', roomId)
        .eq('voter_id', user.id)
        .single()
    ]);

    if (votingResults.error) {
      console.error('Error fetching voting results:', votingResults.error);
      return NextResponse.json(
        { error: 'Failed to fetch voting results', success: false },
        { status: 500 }
      );
    }

    // Check if voting is finalized (this would be a room setting)
    const { data: roomData } = await supabase
      .from('mbdf_room')
      .select('status')
      .eq('id', roomId)
      .single();

    const response = VotingSummaryResponseSchema.parse({
      results: votingResults.data || [],
      my_vote: myVote.error ? null : myVote.data,
      is_finalized: roomData?.status === 'closed',
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

    // Get room ID from candidate
    const { data: candidate, error: candidateError } = await supabase
      .from('lr_candidate')
      .select('room_id')
      .eq('id', validatedData.candidate_id)
      .single();

    if (candidateError) {
      return NextResponse.json(
        { error: 'Candidate not found', success: false },
        { status: 404 }
      );
    }

    // Check if user has access to this room
    const { data: membership, error: memberError } = await supabase
      .from('mbdf_member')
      .select('id')
      .eq('room_id', candidate.room_id)
      .eq('user_id', user.id)
      .single();

    if (memberError) {
      return NextResponse.json(
        { error: 'Access denied', success: false },
        { status: 403 }
      );
    }

    // Upsert vote
    const { data: vote, error } = await supabase
      .from('lr_vote')
      .upsert([
        {
          room_id: candidate.room_id,
          candidate_id: validatedData.candidate_id,
          voter_id: user.id,
          technical_score: validatedData.technical_score,
          experience_score: validatedData.experience_score,
          communication_score: validatedData.communication_score,
          leadership_score: validatedData.leadership_score,
          availability_score: validatedData.availability_score,
        },
      ])
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
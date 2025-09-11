import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';
import { z } from 'zod';

const CreateCandidateSchema = z.object({
  room_id: z.string().uuid(),
  user_id: z.string().uuid(),
});

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

    // Use admin client to bypass RLS for reading candidates
    const adminSupabase = createAdminSupabase();
    
    // Get candidates for this room
    const { data: candidates, error } = await adminSupabase
      .from('lr_candidate')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching candidates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch candidates', success: false },
        { status: 500 }
      );
    }

    // Get profile details for each candidate
    const candidatesWithProfiles = await Promise.all(
      (candidates || []).map(async (candidate: any) => {
        const { data: profile, error: profileError } = await adminSupabase
          .from('profiles')
          .select(`
            id,
            full_name,
            email,
            company:company_id (
              id,
              name
            )
          `)
          .eq('id', candidate.user_id)
          .single();


        return {
          ...candidate,
          profiles: profile
        };
      })
    );

    return NextResponse.json({
      items: candidatesWithProfiles || [],
      total: candidatesWithProfiles?.length || 0,
    });
  } catch (error) {
    console.error('API Error in GET /api/candidates:', error);
    
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
    const validatedData = CreateCandidateSchema.parse(body);

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

    // Check if user is trying to nominate themselves or if they have admin/lr role
    const isSelfNomination = user.id === validatedData.user_id;
    const hasAdminRole = ['admin', 'lr'].includes(membership.role);

    if (!isSelfNomination && !hasAdminRole) {
      return NextResponse.json(
        { error: 'Access denied: You can only nominate yourself or need admin/LR role to nominate others', success: false },
        { status: 403 }
      );
    }

    // Check if the user to be nominated is a member of the room
    const { data: targetMember, error: targetMemberError } = await adminSupabase
      .from('mbdf_member')
      .select('id')
      .eq('room_id', validatedData.room_id)
      .eq('user_id', validatedData.user_id)
      .single();

    if (targetMemberError || !targetMember) {
      return NextResponse.json(
        { error: 'User is not a member of this room', success: false },
        { status: 400 }
      );
    }

    // Check if candidate already exists
    const { data: existingCandidate, error: existingError } = await adminSupabase
      .from('lr_candidate')
      .select('id')
      .eq('room_id', validatedData.room_id)
      .eq('user_id', validatedData.user_id)
      .single();

    if (existingCandidate) {
      return NextResponse.json(
        { error: 'User is already a candidate', success: false },
        { status: 400 }
      );
    }

    // Create candidate using admin client
    const { data: candidate, error } = await adminSupabase
      .from('lr_candidate')
      .insert([{
        room_id: validatedData.room_id,
        user_id: validatedData.user_id,
        is_selected: false,
      }] as any)
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email,
          company:company_id (
            id,
            name
          )
        )
      `)
      .single() as { data: { id: string } | null; error: any };

    if (error || !candidate) {
      console.error('Error creating candidate:', error);
      return NextResponse.json(
        { error: 'Failed to create candidate', success: false },
        { status: 500 }
      );
    }

    // Log the action using admin client
    await adminSupabase
      .from('audit_log')
      .insert({
        room_id: validatedData.room_id,
        user_id: user.id,
        action: 'candidate_nominated',
        resource_type: 'lr_candidate',
        resource_id: candidate.id,
        new_values: { candidate_user_id: validatedData.user_id }
      } as any);

    return NextResponse.json(candidate);
  } catch (error) {
    console.error('API Error in POST /api/candidates:', error);
    
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

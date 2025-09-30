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

    // Get profile details for each candidate including tonnage
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

        // Get member tonnage data for this room
        const { data: memberData } = await adminSupabase
          .from('mbdf_member')
          .select('tonnage_range')
          .eq('room_id', roomId)
          .eq('user_id', candidate.user_id)
          .single();

        // Create profile object with tonnage
        const profileWithTonnage = {
          id: (profile as any)?.id || null,
          full_name: (profile as any)?.full_name || null,
          email: (profile as any)?.email || null,
          company: (profile as any)?.company || null,
          tonnage_range: (memberData as any)?.tonnage_range || null
        };

        return {
          ...candidate,
          profiles: profileWithTonnage
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

    // Allow all authenticated users to nominate candidates
    // No membership check needed - all users can nominate candidates

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

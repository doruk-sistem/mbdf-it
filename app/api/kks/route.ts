import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { 
  KksListResponseSchema,
  CreateKksSubmissionSchema,
  KksSubmissionSchema 
} from '@/lib/schemas';
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
    const userId = searchParams.get('userId');

    let query = supabase
      .from('kks_submission')
      .select(`
        *,
        created_by_profile:profiles!kks_submission_created_by_fkey (*),
        room:mbdf_room!kks_submission_room_id_fkey (
          *,
          substance:substance!mbdf_room_substance_id_fkey (*)
        )
      `)
      .order('created_at', { ascending: false });

    // Filter by room if provided
    if (roomId) {
      query = query.eq('room_id', roomId);
    }

    // Filter by user if provided (for "my submissions")
    if (userId) {
      query = query.eq('created_by', userId);
    }

    // If no specific filters, get user's submissions
    if (!roomId && !userId) {
      query = query.eq('created_by', user.id);
    }

    const { data: submissions, error } = await query;

    if (error) {
      console.error('Error fetching KKS submissions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch KKS submissions', success: false },
        { status: 500 }
      );
    }

    // Validate response
    const response = KksListResponseSchema.parse({
      items: submissions || [],
      total: submissions?.length || 0,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error in GET /api/kks:', error);
    
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
    const validatedData = CreateKksSubmissionSchema.parse(body);

    // Check if user has access to this room
    const { data: membership, error: memberError } = await supabase
      .from('mbdf_member')
      .select('id')
      .eq('room_id', validatedData.room_id)
      .eq('user_id', user.id)
      .single();

    if (memberError) {
      return NextResponse.json(
        { error: 'Access denied', success: false },
        { status: 403 }
      );
    }

    // Create KKS submission
    const { data: submission, error } = await supabase
      .from('kks_submission')
      .insert([
        {
          room_id: validatedData.room_id,
          title: validatedData.title,
          description: validatedData.description || null,
          submission_data: validatedData.submission_data,
          status: 'draft',
          created_by: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating KKS submission:', error);
      return NextResponse.json(
        { error: 'Failed to create KKS submission', success: false },
        { status: 500 }
      );
    }

    // Validate response
    const validatedSubmission = KksSubmissionSchema.parse(submission);

    return NextResponse.json(validatedSubmission, { status: 201 });
  } catch (error) {
    console.error('API Error in POST /api/kks:', error);
    
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
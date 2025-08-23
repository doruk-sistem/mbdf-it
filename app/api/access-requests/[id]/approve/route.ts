import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { ApproveAccessRequestSchema, MessageResponseSchema } from '@/lib/schemas';
import { z } from 'zod';
import { randomBytes } from 'crypto';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = createServerSupabase();
    const { id } = params;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validatedData = ApproveAccessRequestSchema.parse(body);

    // Get access request with package and room info
    const { data: request_data, error: requestError } = await supabase
      .from('access_request')
      .select(`
        *,
        access_package!inner (
          *,
          room_id
        )
      `)
      .eq('id', id)
      .single();

    if (requestError) {
      return NextResponse.json(
        { error: 'Access request not found', success: false },
        { status: 404 }
      );
    }

    if (request_data.status !== 'pending') {
      return NextResponse.json(
        { error: 'Access request is not pending', success: false },
        { status: 400 }
      );
    }

    // Check if user is admin of the room
    const { data: membership, error: memberError } = await supabase
      .from('mbdf_member')
      .select('role')
      .eq('room_id', request_data.access_package.room_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required', success: false },
        { status: 403 }
      );
    }

    // Generate access token if not provided
    const accessToken = validatedData.access_token || randomBytes(32).toString('hex');

    // Approve the request
    const { error: updateError } = await supabase
      .from('access_request')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        access_token: accessToken,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error approving access request:', updateError);
      return NextResponse.json(
        { error: 'Failed to approve access request', success: false },
        { status: 500 }
      );
    }

    // Return the access token
    const response = MessageResponseSchema.parse({
      success: true,
      message: 'Access request approved successfully',
    });

    return NextResponse.json({
      ...response,
      access_token: accessToken,
    });
  } catch (error) {
    console.error('API Error in POST /api/access-requests/[id]/approve:', error);
    
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
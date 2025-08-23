import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { 
  AccessRequestsListResponseSchema,
  CreateAccessRequestSchema,
  AccessRequestWithDetailsSchema 
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

    if (!roomId) {
      return NextResponse.json(
        { error: 'roomId parameter is required', success: false },
        { status: 400 }
      );
    }

    // Check if user has access to this room
    const { data: membership, error: memberError } = await supabase
      .from('mbdf_member')
      .select('role')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (memberError) {
      return NextResponse.json(
        { error: 'Access denied', success: false },
        { status: 403 }
      );
    }

    // Get access requests for packages in this room
    const { data: requests, error } = await supabase
      .from('access_request')
      .select(`
        *,
        access_package!inner (*),
        profiles:requester_id (*),
        approved_by_profile:profiles!access_request_approved_by_fkey (*)
      `)
      .eq('access_package.room_id', roomId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching access requests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch access requests', success: false },
        { status: 500 }
      );
    }

    // Validate response
    const response = AccessRequestsListResponseSchema.parse({
      items: requests || [],
      total: requests?.length || 0,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error in GET /api/access-requests:', error);
    
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
    const validatedData = CreateAccessRequestSchema.parse(body);

    // Check if package exists and get room info
    const { data: package_data, error: packageError } = await supabase
      .from('access_package')
      .select('room_id')
      .eq('id', validatedData.package_id)
      .single();

    if (packageError) {
      return NextResponse.json(
        { error: 'Package not found', success: false },
        { status: 404 }
      );
    }

    // Check if user has access to the room
    const { data: membership, error: memberError } = await supabase
      .from('mbdf_member')
      .select('id')
      .eq('room_id', package_data.room_id)
      .eq('user_id', user.id)
      .single();

    if (memberError) {
      return NextResponse.json(
        { error: 'Access denied', success: false },
        { status: 403 }
      );
    }

    // Check if user already has a pending or approved request for this package
    const { data: existingRequest, error: existingError } = await supabase
      .from('access_request')
      .select('id, status')
      .eq('package_id', validatedData.package_id)
      .eq('requester_id', user.id)
      .in('status', ['pending', 'approved'])
      .single();

    if (existingRequest) {
      const message = existingRequest.status === 'approved' 
        ? 'You already have approved access to this package'
        : 'You already have a pending request for this package';
      
      return NextResponse.json(
        { error: message, success: false },
        { status: 400 }
      );
    }

    // Create access request
    const { data: request_data, error } = await supabase
      .from('access_request')
      .insert([
        {
          package_id: validatedData.package_id,
          requester_id: user.id,
          justification: validatedData.justification,
          status: 'pending',
        },
      ])
      .select(`
        *,
        access_package (*),
        profiles:requester_id (*)
      `)
      .single();

    if (error) {
      console.error('Error creating access request:', error);
      return NextResponse.json(
        { error: 'Failed to create access request', success: false },
        { status: 500 }
      );
    }

    // Validate response
    const validatedRequest = AccessRequestWithDetailsSchema.parse(request_data);

    return NextResponse.json(validatedRequest, { status: 201 });
  } catch (error) {
    console.error('API Error in POST /api/access-requests:', error);
    
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
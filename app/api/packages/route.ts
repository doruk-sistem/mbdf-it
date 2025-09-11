import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { AccessPackageSchema } from '@/lib/schemas';
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

    // Allow all authenticated users to view packages
    // No membership check needed for viewing

    // Get packages for this room
    const { data: packages, error } = await supabase
      .from('access_package')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching packages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch packages', success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({
      items: packages || [],
      total: packages?.length || 0,
    });
  } catch (error) {
    console.error('API Error in GET /api/packages:', error);
    
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

    // Parse request body
    const body = await request.json();
    const { room_id, name, description, package_data } = body;

    if (!room_id || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: room_id, name', success: false },
        { status: 400 }
      );
    }

    // Check if user is admin of this room
    const { data: membership, error: memberError } = await supabase
      .from('mbdf_member')
      .select('role')
      .eq('room_id', room_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !['admin', 'lr'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Admin or LR access required', success: false },
        { status: 403 }
      );
    }

    // Create package
    const { data: package_data_result, error } = await supabase
      .from('access_package')
      .insert([
        {
          room_id,
          name,
          description: description || null,
          package_data: package_data || null,
          created_by: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating package:', error);
      return NextResponse.json(
        { error: 'Failed to create package', success: false },
        { status: 500 }
      );
    }

    // Validate response
    const validatedPackage = AccessPackageSchema.parse(package_data_result);

    return NextResponse.json(validatedPackage, { status: 201 });
  } catch (error) {
    console.error('API Error in POST /api/packages:', error);
    
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
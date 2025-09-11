import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { AgreementWithDetailsSchema } from '@/lib/schemas';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(
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

    // Get agreement with details
    const { data: agreement, error } = await supabase
      .from('agreement')
      .select(`
        *,
        created_by_profile:profiles!agreement_created_by_fkey (*),
        agreement_party (
          *,
          profiles (*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Agreement not found', success: false },
          { status: 404 }
        );
      }
      
      console.error('Error fetching agreement:', error);
      return NextResponse.json(
        { error: 'Failed to fetch agreement', success: false },
        { status: 500 }
      );
    }

    // Check if user has access (is a party or room member)
    const isParty = agreement.agreement_party.some(
      (party: any) => party.user_id === user.id
    );

    if (!isParty) {
      // Check room membership
      const { data: membership, error: memberError } = await supabase
        .from('mbdf_member')
        .select('id')
        .eq('room_id', agreement.room_id)
        .eq('user_id', user.id)
        .single();

      if (memberError) {
        return NextResponse.json(
          { error: 'Access denied', success: false },
          { status: 403 }
        );
      }
    }

    // Validate response
    const validatedAgreement = AgreementWithDetailsSchema.parse(agreement);

    return NextResponse.json(validatedAgreement);
  } catch (error) {
    console.error('API Error in GET /api/agreements/[id]:', error);
    
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

export async function PUT(
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

    // Check if agreement exists and user is creator or admin
    const { data: agreement, error: agreementError } = await supabase
      .from('agreement')
      .select('created_by, room_id')
      .eq('id', id)
      .single();

    if (agreementError) {
      return NextResponse.json(
        { error: 'Agreement not found', success: false },
        { status: 404 }
      );
    }

    // Check permissions
    let hasPermission = agreement.created_by === user.id;

    if (!hasPermission) {
      // Check if user is admin of the room
      const { data: membership } = await supabase
        .from('mbdf_member')
        .select('role')
        .eq('room_id', agreement.room_id)
        .eq('user_id', user.id)
        .single();

      hasPermission = ['admin', 'lr'].includes(membership?.role);
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions', success: false },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const updateData: Partial<{
      title: string;
      description: string | null;
      content: string;
      agreement_type: string;
    }> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.agreement_type !== undefined) updateData.agreement_type = body.agreement_type;

    // Update agreement
    const { data: updatedAgreement, error } = await supabase
      .from('agreement')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        created_by_profile:profiles!agreement_created_by_fkey (*),
        agreement_party (
          *,
          profiles (*)
        )
      `)
      .single();

    if (error) {
      console.error('Error updating agreement:', error);
      return NextResponse.json(
        { error: 'Failed to update agreement', success: false },
        { status: 500 }
      );
    }

    // Validate response
    const validatedAgreement = AgreementWithDetailsSchema.parse(updatedAgreement);

    return NextResponse.json(validatedAgreement);
  } catch (error) {
    console.error('API Error in PUT /api/agreements/[id]:', error);
    
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
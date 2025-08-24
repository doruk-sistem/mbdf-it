import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { 
  AgreementsListResponseSchema,
  CreateAgreementSchema,
  AgreementWithDetailsSchema 
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

    let query = supabase
      .from('agreement')
      .select(`
        *,
        created_by_profile:profiles!agreement_created_by_fkey (*),
        room:mbdf_room!agreement_room_id_fkey (
          *,
          substance:substance!mbdf_room_substance_id_fkey (*)
        ),
        agreement_party (
          *,
          profiles (*)
        )
      `)
      .order('created_at', { ascending: false });

    // Filter by room if provided
    if (roomId) {
      query = query.eq('room_id', roomId);
    }

    const { data: agreements, error } = await query;

    if (error) {
      console.error('Error fetching agreements:', error);
      return NextResponse.json(
        { error: 'Failed to fetch agreements', success: false },
        { status: 500 }
      );
    }

    // Validate response
    const response = AgreementsListResponseSchema.parse({
      items: agreements || [],
      total: agreements?.length || 0,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error in GET /api/agreements:', error);
    
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
    const validatedData = CreateAgreementSchema.parse(body);

    // Check if user has access to this room
    const { data: membership, error: memberError } = await supabase
      .from('mbdf_member')
      .select('role')
      .eq('room_id', validatedData.room_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required', success: false },
        { status: 403 }
      );
    }

    // Create agreement
    const { data: agreement, error } = await supabase
      .from('agreement')
      .insert([
        {
          room_id: validatedData.room_id,
          title: validatedData.title,
          description: validatedData.description || null,
          content: validatedData.content,
          agreement_type: validatedData.agreement_type,
          created_by: user.id,
        },
      ])
      .select(`
        *,
        created_by_profile:profiles!agreement_created_by_fkey (*)
      `)
      .single();

    if (error) {
      console.error('Error creating agreement:', error);
      return NextResponse.json(
        { error: 'Failed to create agreement', success: false },
        { status: 500 }
      );
    }

    // Create agreement parties
    if (validatedData.party_ids && validatedData.party_ids.length > 0) {
      const parties = validatedData.party_ids.map(partyId => ({
        agreement_id: agreement.id,
        user_id: partyId,
        signature_status: 'pending' as const,
      }));

      const { error: partiesError } = await supabase
        .from('agreement_party')
        .insert(parties);

      if (partiesError) {
        console.error('Error creating agreement parties:', partiesError);
        // Continue anyway, agreement is created
      }
    }

    // Get complete agreement with parties
    const { data: completeAgreement, error: fetchError } = await supabase
      .from('agreement')
      .select(`
        *,
        created_by_profile:profiles!agreement_created_by_fkey (*),
        agreement_party (
          *,
          profiles (*)
        )
      `)
      .eq('id', agreement.id)
      .single();

    if (fetchError) {
      console.error('Error fetching complete agreement:', fetchError);
      return NextResponse.json(agreement, { status: 201 });
    }

    // Validate response
    const validatedAgreement = AgreementWithDetailsSchema.parse(completeAgreement);

    return NextResponse.json(validatedAgreement, { status: 201 });
  } catch (error) {
    console.error('API Error in POST /api/agreements:', error);
    
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
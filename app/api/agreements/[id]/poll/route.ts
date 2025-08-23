import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { z } from 'zod';

const SignatureStatusSchema = z.object({
  party_id: z.string(),
  user_id: z.string(),
  full_name: z.string().nullable(),
  email: z.string(),
  signature_status: z.enum(['pending', 'signed', 'rejected']),
  signed_at: z.string().nullable(),
  signature_data: z.any().nullable(),
});

const PollResponseSchema = z.object({
  agreement_id: z.string(),
  title: z.string(),
  all_signed: z.boolean(),
  signature_count: z.number(),
  total_parties: z.number(),
  parties: z.array(SignatureStatusSchema),
});

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

    // Get agreement with signature status
    const { data: agreement, error: agreementError } = await supabase
      .from('agreement')
      .select(`
        id,
        title,
        created_by,
        room_id,
        agreement_party (
          id,
          user_id,
          signature_status,
          signed_at,
          signature_data,
          profiles (
            full_name,
            email
          )
        )
      `)
      .eq('id', id)
      .single();

    if (agreementError) {
      return NextResponse.json(
        { error: 'Agreement not found', success: false },
        { status: 404 }
      );
    }

    // Check if user has access
    const isCreator = agreement.created_by === user.id;
    const isParty = agreement.agreement_party.some(
      (party: any) => party.user_id === user.id
    );

    if (!isCreator && !isParty) {
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

    // Transform party data
    const parties = agreement.agreement_party.map((party: any) => ({
      party_id: party.id,
      user_id: party.user_id,
      full_name: party.profiles.full_name,
      email: party.profiles.email,
      signature_status: party.signature_status,
      signed_at: party.signed_at,
      signature_data: party.signature_data,
    }));

    const signedCount = parties.filter(p => p.signature_status === 'signed').length;
    const allSigned = parties.length > 0 && signedCount === parties.length;

    const response = PollResponseSchema.parse({
      agreement_id: agreement.id,
      title: agreement.title,
      all_signed: allSigned,
      signature_count: signedCount,
      total_parties: parties.length,
      parties,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error in GET /api/agreements/[id]/poll:', error);
    
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
    const { signature_status, signature_data } = body;

    if (!signature_status || !['signed', 'rejected'].includes(signature_status)) {
      return NextResponse.json(
        { error: 'Valid signature_status is required (signed or rejected)', success: false },
        { status: 400 }
      );
    }

    // Get user's party record for this agreement
    const { data: party, error: partyError } = await supabase
      .from('agreement_party')
      .select('id, signature_status')
      .eq('agreement_id', id)
      .eq('user_id', user.id)
      .single();

    if (partyError) {
      return NextResponse.json(
        { error: 'You are not a party to this agreement', success: false },
        { status: 403 }
      );
    }

    if (party.signature_status === 'signed') {
      return NextResponse.json(
        { error: 'Agreement already signed', success: false },
        { status: 400 }
      );
    }

    // Update signature status
    const updateData: any = {
      signature_status,
      signed_at: signature_status === 'signed' ? new Date().toISOString() : null,
    };

    if (signature_data && signature_status === 'signed') {
      updateData.signature_data = signature_data;
    }

    const { error: updateError } = await supabase
      .from('agreement_party')
      .update(updateData)
      .eq('id', party.id);

    if (updateError) {
      console.error('Error updating signature status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update signature status', success: false },
        { status: 500 }
      );
    }

    // Log the action
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        action: signature_status === 'signed' ? 'agreement_signed' : 'agreement_rejected',
        resource_type: 'agreement',
        resource_id: id,
        metadata: { party_id: party.id },
      });

    // Return updated poll status
    return GET(request, { params });
  } catch (error) {
    console.error('API Error in POST /api/agreements/[id]/poll:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
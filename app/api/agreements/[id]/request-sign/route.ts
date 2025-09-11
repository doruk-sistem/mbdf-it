import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { MessageResponseSchema } from '@/lib/schemas';
import { z } from 'zod';

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
    const { party_ids } = body;

    if (!party_ids || !Array.isArray(party_ids) || party_ids.length === 0) {
      return NextResponse.json(
        { error: 'party_ids array is required', success: false },
        { status: 400 }
      );
    }

    // Check if agreement exists and user has permission
    const { data: agreement, error: agreementError } = await supabase
      .from('agreement')
      .select('created_by, room_id, title')
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

    // Get or create agreement parties
    const parties = party_ids.map(partyId => ({
      agreement_id: id,
      user_id: partyId,
      signature_status: 'pending' as const,
    }));

    // Upsert agreement parties
    const { error: partiesError } = await supabase
      .from('agreement_party')
      .upsert(parties, {
        onConflict: 'agreement_id,user_id',
        ignoreDuplicates: false,
      });

    if (partiesError) {
      console.error('Error creating/updating agreement parties:', partiesError);
      return NextResponse.json(
        { error: 'Failed to request signatures', success: false },
        { status: 500 }
      );
    }

    // TODO: Send signature request notifications/emails here
    // This would integrate with your email service to notify parties

    // Get party details for notification (optional)
    const { data: partyDetails } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', party_ids);

    // Log the signature request in audit log (optional)
    const auditPromises = party_ids.map(partyId =>
      supabase
        .from('audit_log')
        .insert({
          user_id: user.id,
          action: 'signature_requested',
          resource_type: 'agreement',
          resource_id: id,
          metadata: { 
            party_id: partyId, 
            agreement_title: agreement.title 
          },
        })
    );

    await Promise.allSettled(auditPromises);

    const response = MessageResponseSchema.parse({
      success: true,
      message: `Signature requests sent to ${party_ids.length} parties`,
    });

    return NextResponse.json({
      ...response,
      requested_parties: partyDetails || [],
    });
  } catch (error) {
    console.error('API Error in POST /api/agreements/[id]/request-sign:', error);
    
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
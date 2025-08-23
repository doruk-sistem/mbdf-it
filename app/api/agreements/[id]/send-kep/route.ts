import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { MessageResponseSchema } from '@/lib/schemas';
import { z } from 'zod';

const SendKepRequestSchema = z.object({
  kep_addresses: z.array(z.string().email()),
  subject: z.string().optional(),
  message: z.string().optional(),
});

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

    // Parse and validate request body
    const body = await request.json();
    const { kep_addresses, subject, message } = SendKepRequestSchema.parse(body);

    // Get agreement details
    const { data: agreement, error: agreementError } = await supabase
      .from('agreement')
      .select(`
        id,
        title,
        content,
        created_by,
        room_id,
        agreement_party (
          id,
          user_id,
          signature_status,
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

    // Check permissions
    let hasPermission = agreement.created_by === user.id;

    if (!hasPermission) {
      const { data: membership } = await supabase
        .from('mbdf_member')
        .select('role')
        .eq('room_id', agreement.room_id)
        .eq('user_id', user.id)
        .single();

      hasPermission = membership?.role === 'admin';
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions', success: false },
        { status: 403 }
      );
    }

    // Check if all parties have signed
    const allSigned = agreement.agreement_party.every(
      (party: any) => party.signature_status === 'signed'
    );

    if (!allSigned) {
      return NextResponse.json(
        { error: 'Cannot send KEP - not all parties have signed the agreement', success: false },
        { status: 400 }
      );
    }

    // Prepare KEP notifications
    const kepNotifications = kep_addresses.map(kep_address => ({
      agreement_id: id,
      kep_address,
      recipient_id: user.id, // The sender for now, could be mapped differently
      content: message || `Agreement "${agreement.title}" has been finalized and signed by all parties.`,
      status: 'pending',
    }));

    // Insert KEP notifications
    const { data: notifications, error: notificationError } = await supabase
      .from('kep_notification')
      .insert(kepNotifications)
      .select();

    if (notificationError) {
      console.error('Error creating KEP notifications:', notificationError);
      return NextResponse.json(
        { error: 'Failed to queue KEP notifications', success: false },
        { status: 500 }
      );
    }

    // TODO: Implement actual KEP sending logic here
    // This would integrate with Turkey's KEP (Kayıtlı Elektronik Posta) system
    // For now, we'll just mark the notifications as sent

    // Update notification status to sent (mock implementation)
    const { error: updateError } = await supabase
      .from('kep_notification')
      .update({ 
        status: 'sent', 
        sent_at: new Date().toISOString(),
        provider_response: { mock: true, message: 'KEP integration not implemented' }
      })
      .in('id', notifications.map(n => n.id));

    if (updateError) {
      console.error('Error updating KEP notification status:', updateError);
    }

    // Log the action
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        action: 'kep_sent',
        resource_type: 'agreement',
        resource_id: id,
        metadata: { 
          kep_addresses, 
          notification_count: notifications.length 
        },
      });

    const response = MessageResponseSchema.parse({
      success: true,
      message: `KEP notifications sent to ${kep_addresses.length} addresses`,
    });

    return NextResponse.json({
      ...response,
      sent_notifications: notifications.length,
      kep_addresses,
    });
  } catch (error) {
    console.error('API Error in POST /api/agreements/[id]/send-kep:', error);
    
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
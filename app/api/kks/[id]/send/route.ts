import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { MessageResponseSchema } from '@/lib/schemas';
import { z } from 'zod';

const SendKksRequestSchema = z.object({
  recipient_email: z.string().email().optional(),
  official_send: z.boolean().default(false),
  notes: z.string().optional(),
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
    const { recipient_email, official_send, notes } = SendKksRequestSchema.parse(body);

    // Get submission details
    const { data: submission, error: submissionError } = await supabase
      .from('kks_submission')
      .select('*')
      .eq('id', id)
      .single();

    if (submissionError) {
      return NextResponse.json(
        { error: 'KKS submission not found', success: false },
        { status: 404 }
      );
    }

    if (submission.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Only the creator can send this submission', success: false },
        { status: 403 }
      );
    }

    if (submission.status !== 'submitted') {
      return NextResponse.json(
        { error: 'Submission must be in submitted status to send', success: false },
        { status: 400 }
      );
    }

    if (submission.status === 'sent') {
      return NextResponse.json(
        { error: 'Submission has already been sent', success: false },
        { status: 400 }
      );
    }

    // Check if there's evidence generated
    const { data: evidence, error: evidenceError } = await supabase
      .from('kks_evidence')
      .select('id')
      .eq('submission_id', id)
      .limit(1);

    if (evidenceError) {
      console.error('Error checking evidence:', evidenceError);
    }

    if (!evidence || evidence.length === 0) {
      return NextResponse.json(
        { error: 'No evidence files found. Generate evidence before sending', success: false },
        { status: 400 }
      );
    }

    // Update submission status to sent
    const { error: updateError } = await supabase
      .from('kks_submission')
      .update({ 
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating submission status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update submission status', success: false },
        { status: 500 }
      );
    }

    // TODO: Implement actual KKS sending logic here
    // This would integrate with the official KKS system API
    // For now, we'll simulate the sending process

    let sendResult = {
      success: true,
      message: 'KKS submission sent successfully',
      tracking_number: `KKS-${Date.now()}-${id.slice(0, 8).toUpperCase()}`,
      sent_at: new Date().toISOString(),
    };

    if (official_send) {
      // This would be where official API integration happens
      sendResult.message = 'KKS submission sent to official registry';
    } else if (recipient_email) {
      // This would be where email notification is sent
      sendResult.message = `KKS submission sent to ${recipient_email}`;
    }

    // Log the action
    await supabase
      .from('audit_log')
      .insert({
        user_id: user.id,
        action: 'kks_sent',
        resource_type: 'kks_submission',
        resource_id: id,
        metadata: { 
          official_send,
          recipient_email,
          notes,
          tracking_number: sendResult.tracking_number,
        },
      });

    // Create a notification record (optional)
    if (recipient_email || official_send) {
      await supabase
        .from('kep_notification')
        .insert({
          agreement_id: null, // This is for KKS, not agreement
          kep_address: recipient_email || 'official@kks.gov.tr',
          recipient_id: user.id,
          content: `KKS Submission "${submission.title}" has been sent. Tracking: ${sendResult.tracking_number}`,
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider_response: { 
            type: 'kks_submission',
            tracking_number: sendResult.tracking_number,
            mock: !official_send // Mark as mock if not official
          },
        });
    }

    const response = MessageResponseSchema.parse({
      success: true,
      message: sendResult.message,
    });

    return NextResponse.json({
      ...response,
      tracking_number: sendResult.tracking_number,
      sent_at: sendResult.sent_at,
      official_send,
    });
  } catch (error) {
    console.error('API Error in POST /api/kks/[id]/send:', error);
    
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
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { KksSubmissionSchema } from '@/lib/schemas';
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

    // Get KKS submission
    const { data: submission, error } = await supabase
      .from('kks_submission')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'KKS submission not found', success: false },
          { status: 404 }
        );
      }
      
      console.error('Error fetching KKS submission:', error);
      return NextResponse.json(
        { error: 'Failed to fetch KKS submission', success: false },
        { status: 500 }
      );
    }

    // Check if user has access (creator or room member)
    if (submission.created_by !== user.id) {
      const { data: membership, error: memberError } = await supabase
        .from('mbdf_member')
        .select('id')
        .eq('room_id', submission.room_id)
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
    const validatedSubmission = KksSubmissionSchema.parse(submission);

    return NextResponse.json(validatedSubmission);
  } catch (error) {
    console.error('API Error in GET /api/kks/[id]:', error);
    
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

    // Check if submission exists and user is creator
    const { data: submission, error: submissionError } = await supabase
      .from('kks_submission')
      .select('created_by, status')
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
        { error: 'Only the creator can update this submission', success: false },
        { status: 403 }
      );
    }

    if (submission.status === 'sent') {
      return NextResponse.json(
        { error: 'Cannot update a sent submission', success: false },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const updateData: Partial<{
      title: string;
      description: string | null;
      submission_data: any;
      status: 'draft' | 'submitted' | 'sent';
    }> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.submission_data !== undefined) updateData.submission_data = body.submission_data;
    if (body.status !== undefined) updateData.status = body.status;

    // If status is being changed to submitted, set submitted_at
    if (updateData.status === 'submitted') {
      (updateData as any).submitted_at = new Date().toISOString();
    }

    // Update submission
    const { data: updatedSubmission, error } = await supabase
      .from('kks_submission')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating KKS submission:', error);
      return NextResponse.json(
        { error: 'Failed to update KKS submission', success: false },
        { status: 500 }
      );
    }

    // Validate response
    const validatedSubmission = KksSubmissionSchema.parse(updatedSubmission);

    return NextResponse.json(validatedSubmission);
  } catch (error) {
    console.error('API Error in PUT /api/kks/[id]:', error);
    
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

export async function DELETE(
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

    // Check if submission exists and user is creator
    const { data: submission, error: submissionError } = await supabase
      .from('kks_submission')
      .select('created_by, status')
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
        { error: 'Only the creator can delete this submission', success: false },
        { status: 403 }
      );
    }

    if (submission.status === 'sent') {
      return NextResponse.json(
        { error: 'Cannot delete a sent submission', success: false },
        { status: 400 }
      );
    }

    // Delete related evidence first
    const { error: evidenceError } = await supabase
      .from('kks_evidence')
      .delete()
      .eq('submission_id', id);

    if (evidenceError) {
      console.error('Error deleting KKS evidence:', evidenceError);
      // Continue anyway
    }

    // Delete submission
    const { error } = await supabase
      .from('kks_submission')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting KKS submission:', error);
      return NextResponse.json(
        { error: 'Failed to delete KKS submission', success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'KKS submission deleted successfully' 
    });
  } catch (error) {
    console.error('API Error in DELETE /api/kks/[id]:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { DocumentWithUploaderSchema } from '@/lib/schemas';
import { z } from 'zod';

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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const roomId = formData.get('roomId') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const visibility = formData.get('visibility') as string || 'public';

    // Validate required fields
    if (!file || !roomId || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: file, roomId, title', success: false },
        { status: 400 }
      );
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 50MB', success: false },
        { status: 400 }
      );
    }

    // Check if user has access to this room
    const { data: membership, error: memberError } = await supabase
      .from('mbdf_member')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (memberError) {
      return NextResponse.json(
        { error: 'Access denied', success: false },
        { status: 403 }
      );
    }

    // Generate unique file path
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${fileExtension}`;
    const filePath = `${roomId}/${fileName}`;

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('docs')
      .upload(filePath, file, {
        contentType: file.type,
        metadata: {
          uploadedBy: user.id,
          roomId: roomId,
          originalName: file.name,
        },
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file', success: false },
        { status: 500 }
      );
    }

    // Save document record to database
    const { data: document, error: docError } = await supabase
      .from('document')
      .insert([
        {
          room_id: roomId,
          name: title,
          description: description || null,
          file_path: uploadData.path,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
        },
      ])
      .select(`
        *,
        profiles:uploaded_by (*)
      `)
      .single();

    if (docError) {
      console.error('Error saving document record:', docError);
      
      // Clean up uploaded file
      await supabase.storage.from('docs').remove([uploadData.path]);
      
      return NextResponse.json(
        { error: 'Failed to save document record', success: false },
        { status: 500 }
      );
    }

    // Create signed URL for immediate download
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('docs')
      .createSignedUrl(document.file_path, 3600); // 1 hour expiry

    const documentWithUrl = {
      ...document,
      download_url: urlError ? null : signedUrlData.signedUrl,
    };

    // Validate response
    const validatedDocument = DocumentWithUploaderSchema.parse(documentWithUrl);

    return NextResponse.json(validatedDocument, { status: 201 });
  } catch (error) {
    console.error('API Error in POST /api/documents/upload:', error);
    
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
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const documentId = params.id;
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required', success: false },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for document access
    const adminSupabase = createAdminSupabase();
    
    // Get document info
    const { data: document, error: docError } = await adminSupabase
      .from('document')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found', success: false },
        { status: 404 }
      );
    }

    // Get file content using admin client
    const doc = document as any;
    const storagePath = doc.file_path?.startsWith('docs/')
      ? doc.file_path.replace(/^docs\//, '')
      : doc.file_path;

    const { data: fileData, error: fileError } = await adminSupabase.storage
      .from('docs')
      .download(storagePath);

    if (fileError || !fileData) {
      return NextResponse.json(
        { error: 'File not found or access denied', success: false },
        { status: 404 }
      );
    }

    // Convert to buffer
    const buffer = await fileData.arrayBuffer();
    
    // Return file with proper headers for VIEWING (inline)
    let fileName = doc.original_name || doc.name || 'document';
    
    // Add file extension if missing based on MIME type
    if (!fileName.includes('.')) {
      const mimeType = doc.mime_type || '';
      if (mimeType.includes('pdf')) {
        fileName += '.pdf';
      } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
        fileName += '.xlsx';
      } else if (mimeType.includes('word') || mimeType.includes('document')) {
        fileName += '.docx';
      } else if (mimeType.includes('image/jpeg')) {
        fileName += '.jpg';
      } else if (mimeType.includes('image/png')) {
        fileName += '.png';
      } else if (mimeType.includes('text/plain')) {
        fileName += '.txt';
      }
    }
    
    const headers = {
      'Content-Type': doc.mime_type || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${fileName}"`, // inline for viewing
      'Content-Length': buffer.byteLength.toString(),
    };
    
    return new NextResponse(buffer, { headers });

  } catch (error) {
    console.error('API Error in GET /api/documents/[id]/view:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

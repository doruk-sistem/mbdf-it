import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== DOCUMENT DOWNLOAD DEBUG START ===');
    
    const supabase = createServerSupabase();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('User auth result:', { user: user?.id, error: authError });
    
    if (authError || !user) {
      console.log('Auth failed, returning 401');
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const documentId = params.id;
    console.log('Document ID from params:', documentId);
    
    if (!documentId) {
      console.log('No document ID provided');
      return NextResponse.json(
        { error: 'Document ID is required', success: false },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for document access
    const adminSupabase = createAdminSupabase();
    
    // Get document info
    console.log('Fetching document from database...');
    const { data: document, error: docError } = await adminSupabase
      .from('document')
      .select('*')
      .eq('id', documentId)
      .single();

    console.log('Document fetch result:', { 
      document: document ? {
        id: (document as any).id,
        name: (document as any).name,
        file_path: (document as any).file_path,
        original_name: (document as any).original_name,
        mime_type: (document as any).mime_type
      } : null, 
      error: docError 
    });

    if (docError || !document) {
      console.log('Document not found, returning 404');
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

    console.log('Storage path calculation:', {
      original_file_path: doc.file_path,
      calculated_storage_path: storagePath
    });

    console.log('Attempting to download file from storage...');
    const { data: fileData, error: fileError } = await adminSupabase.storage
      .from('docs')
      .download(storagePath);

    console.log('Storage download result:', {
      hasFileData: !!fileData,
      fileDataSize: fileData ? fileData.size : 0,
      fileDataType: fileData ? fileData.type : 'unknown',
      error: fileError
    });

    if (fileError || !fileData) {
      console.log('File download failed, returning 404');
      return NextResponse.json(
        { error: 'File not found or access denied', success: false },
        { status: 404 }
      );
    }

    // Convert to buffer
    console.log('Converting file to buffer...');
    const buffer = await fileData.arrayBuffer();
    console.log('Buffer created, size:', buffer.byteLength);
    
    // Return file with proper headers for DOWNLOADING (attachment)
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
      'Content-Disposition': `attachment; filename="${fileName}"`, // attachment for downloading
      'Content-Length': buffer.byteLength.toString(),
    };
    
    console.log('File name resolution:', {
      original_name: doc.original_name,
      name: doc.name,
      final_fileName: fileName
    });
    console.log('Response headers (DOWNLOAD):', headers);
    console.log('=== DOCUMENT DOWNLOAD DEBUG END ===');
    
    return new NextResponse(buffer, { headers });

  } catch (error) {
    console.error('API Error in GET /api/documents/[id]/download:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

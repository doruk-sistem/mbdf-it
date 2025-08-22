import { ESignatureProvider, SignatureRequest, SignatureResponse, SignatureStatus } from './types';
import { uploadFile } from '@/lib/supabase';

export class MockESignatureProvider implements ESignatureProvider {
  name = 'Mock E-Signature Provider';
  
  private signatures = new Map<string, {
    request: SignatureRequest;
    status: 'pending' | 'signed' | 'rejected' | 'expired';
    signedAt?: Date;
    signedPdfPath?: string;
  }>();

  async createSignatureRequest(request: SignatureRequest): Promise<SignatureResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const signatureId = `mock_sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store the signature request
    this.signatures.set(signatureId, {
      request,
      status: 'pending'
    });

    // Mock sign URL (in real implementation, this would be from the provider)
    const signUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/esign/mock/sign/${signatureId}`;

    return {
      success: true,
      signatureId,
      signUrl,
      status: 'pending',
      metadata: {
        provider: 'mock',
        created_at: new Date().toISOString()
      }
    };
  }

  async getSignatureStatus(signatureId: string): Promise<SignatureStatus> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const signature = this.signatures.get(signatureId);
    if (!signature) {
      throw new Error(`Signature with ID ${signatureId} not found`);
    }

    return {
      signatureId,
      status: signature.status,
      signedAt: signature.signedAt,
      signedPdfPath: signature.signedPdfPath,
      metadata: {
        provider: 'mock'
      }
    };
  }

  async downloadSignedDocument(signatureId: string): Promise<Buffer> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const signature = this.signatures.get(signatureId);
    if (!signature || signature.status !== 'signed') {
      throw new Error(`Signed document not available for signature ${signatureId}`);
    }

    // Mock PDF content - in real implementation, download from provider
    const mockPdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 12 Tf 72 720 Td (SIGNED DOCUMENT - ${signatureId}) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000015 00000 n 
0000000060 00000 n 
0000000111 00000 n 
0000000212 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
306
%%EOF`;

    return Buffer.from(mockPdfContent, 'utf-8');
  }

  async cancelSignatureRequest(signatureId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const signature = this.signatures.get(signatureId);
    if (!signature) {
      return false;
    }

    if (signature.status === 'signed') {
      throw new Error('Cannot cancel already signed document');
    }

    signature.status = 'rejected';
    return true;
  }

  // Mock-specific methods for testing
  async mockSign(signatureId: string): Promise<SignatureResponse> {
    const signature = this.signatures.get(signatureId);
    if (!signature) {
      throw new Error(`Signature with ID ${signatureId} not found`);
    }

    if (signature.status !== 'pending') {
      throw new Error(`Signature is not in pending state: ${signature.status}`);
    }

    // Generate mock signed PDF
    const signedPdfBuffer = await this.downloadSignedDocument(signatureId);
    const timestamp = Date.now();
    const fileName = `signed_${signature.request.agreementId}_${timestamp}.pdf`;
    const filePath = `agreements/signed/${fileName}`;

    try {
      // Upload to storage
      await uploadFile('docs', filePath, signedPdfBuffer, {
        contentType: 'application/pdf',
        metadata: {
          signatureId,
          agreementId: signature.request.agreementId,
          signerEmail: signature.request.signerEmail
        }
      });

      // Update signature status
      signature.status = 'signed';
      signature.signedAt = new Date();
      signature.signedPdfPath = filePath;

      return {
        success: true,
        signatureId,
        status: 'signed',
        signedAt: signature.signedAt,
        signedPdfPath: filePath,
        metadata: {
          provider: 'mock',
          signed_at: signature.signedAt.toISOString()
        }
      };
    } catch (error) {
      console.error('Mock sign error:', error);
      throw new Error('Failed to complete mock signature');
    }
  }

  async mockReject(signatureId: string): Promise<boolean> {
    const signature = this.signatures.get(signatureId);
    if (!signature) {
      return false;
    }

    if (signature.status !== 'pending') {
      return false;
    }

    signature.status = 'rejected';
    return true;
  }
}
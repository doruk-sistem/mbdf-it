export interface SignatureRequest {
  agreementId: string;
  signerEmail: string;
  signerName: string;
  documentContent: string;
  documentName: string;
  returnUrl?: string;
  metadata?: Record<string, any>;
}

export interface SignatureResponse {
  success: boolean;
  signatureId: string;
  signUrl?: string;
  status: 'pending' | 'signed' | 'rejected' | 'expired';
  signedPdfPath?: string;
  signedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface SignatureStatus {
  signatureId: string;
  status: 'pending' | 'signed' | 'rejected' | 'expired';
  signedAt?: Date;
  signedPdfPath?: string;
  metadata?: Record<string, any>;
}

export interface ESignatureProvider {
  name: string;
  createSignatureRequest(request: SignatureRequest): Promise<SignatureResponse>;
  getSignatureStatus(signatureId: string): Promise<SignatureStatus>;
  downloadSignedDocument(signatureId: string): Promise<Buffer>;
  cancelSignatureRequest(signatureId: string): Promise<boolean>;
}
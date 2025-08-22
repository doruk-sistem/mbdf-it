export interface KKSSubmissionData {
  submissionId: string;
  roomId: string;
  title: string;
  description?: string;
  data: Record<string, any>;
  csvData: any[];
  evidenceFiles: {
    csvPath: string;
    pdfPath: string;
  };
}

export interface KKSSubmissionResponse {
  success: boolean;
  submissionId: string;
  confirmationNumber?: string;
  submittedAt: Date;
  status: 'submitted' | 'processing' | 'accepted' | 'rejected';
  error?: string;
  metadata?: Record<string, any>;
}

export interface KKSSubmissionStatus {
  submissionId: string;
  confirmationNumber?: string;
  status: 'submitted' | 'processing' | 'accepted' | 'rejected';
  submittedAt: Date;
  processedAt?: Date;
  feedback?: string;
  metadata?: Record<string, any>;
}

export interface KKSProvider {
  name: string;
  submitToKKS(data: KKSSubmissionData): Promise<KKSSubmissionResponse>;
  getSubmissionStatus(submissionId: string, confirmationNumber?: string): Promise<KKSSubmissionStatus>;
  downloadReceipt(submissionId: string): Promise<Buffer>;
}

export interface KEPNotificationRequest {
  kepAddress: string;
  subject: string;
  content: string;
  attachments?: {
    filename: string;
    content: Buffer;
    mimeType: string;
  }[];
  priority?: 'low' | 'normal' | 'high';
  deliveryNotification?: boolean;
  metadata?: Record<string, any>;
}

export interface KEPNotificationResponse {
  success: boolean;
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sentAt: Date;
  deliveredAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface KEPNotificationStatus {
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
}

export interface KEPProvider {
  name: string;
  sendNotification(request: KEPNotificationRequest): Promise<KEPNotificationResponse>;
  getNotificationStatus(messageId: string): Promise<KEPNotificationStatus>;
  downloadDeliveryReceipt(messageId: string): Promise<Buffer>;
}
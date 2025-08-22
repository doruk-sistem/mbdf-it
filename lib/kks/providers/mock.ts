import { KKSProvider, KKSSubmissionData, KKSSubmissionResponse, KKSSubmissionStatus } from './types';
import { KEPProvider, KEPNotificationRequest, KEPNotificationResponse, KEPNotificationStatus } from './types';

export class MockKKSProvider implements KKSProvider {
  name = 'Mock KKS Provider';
  
  private submissions = new Map<string, {
    data: KKSSubmissionData;
    confirmationNumber: string;
    status: 'submitted' | 'processing' | 'accepted' | 'rejected';
    submittedAt: Date;
    processedAt?: Date;
    feedback?: string;
  }>();

  async submitToKKS(data: KKSSubmissionData): Promise<KKSSubmissionResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const confirmationNumber = `KKS_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const submittedAt = new Date();
    
    // Store the submission
    this.submissions.set(data.submissionId, {
      data,
      confirmationNumber,
      status: 'submitted',
      submittedAt,
    });

    // Simulate processing after 5 seconds
    setTimeout(() => {
      const submission = this.submissions.get(data.submissionId);
      if (submission) {
        submission.status = 'accepted';
        submission.processedAt = new Date();
        submission.feedback = 'Submission successfully processed by KKS system.';
      }
    }, 5000);

    return {
      success: true,
      submissionId: data.submissionId,
      confirmationNumber,
      submittedAt,
      status: 'submitted',
      metadata: {
        provider: 'mock',
        room_id: data.roomId,
        title: data.title,
        csv_records: data.csvData.length
      }
    };
  }

  async getSubmissionStatus(submissionId: string, confirmationNumber?: string): Promise<KKSSubmissionStatus> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new Error(`KKS submission with ID ${submissionId} not found`);
    }

    return {
      submissionId,
      confirmationNumber: submission.confirmationNumber,
      status: submission.status,
      submittedAt: submission.submittedAt,
      processedAt: submission.processedAt,
      feedback: submission.feedback,
      metadata: {
        provider: 'mock'
      }
    };
  }

  async downloadReceipt(submissionId: string): Promise<Buffer> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new Error(`KKS submission with ID ${submissionId} not found`);
    }

    // Mock PDF receipt content
    const receiptContent = `%PDF-1.4
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
<< /Length 200 >>
stream
BT /F1 12 Tf 72 720 Td (KKS SUBMISSION RECEIPT) Tj
0 -20 Td (Submission ID: ${submissionId}) Tj
0 -20 Td (Confirmation: ${submission.confirmationNumber}) Tj
0 -20 Td (Status: ${submission.status.toUpperCase()}) Tj
0 -20 Td (Submitted: ${submission.submittedAt.toISOString()}) Tj ET
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
462
%%EOF`;

    return Buffer.from(receiptContent, 'utf-8');
  }
}

export class MockKEPProvider implements KEPProvider {
  name = 'Mock KEP Provider';
  
  private notifications = new Map<string, {
    request: KEPNotificationRequest;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    sentAt: Date;
    deliveredAt?: Date;
    readAt?: Date;
    failureReason?: string;
  }>();

  async sendNotification(request: KEPNotificationRequest): Promise<KEPNotificationResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const messageId = `kep_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sentAt = new Date();
    
    // Validate KEP address (basic mock validation)
    if (!request.kepAddress.includes('@kep.tr') && !request.kepAddress.includes('@hs.kep.tr')) {
      return {
        success: false,
        messageId,
        status: 'failed',
        sentAt,
        error: 'Invalid KEP address format. KEP addresses must end with @kep.tr or @hs.kep.tr',
        metadata: {
          provider: 'mock'
        }
      };
    }

    // Store the notification
    this.notifications.set(messageId, {
      request,
      status: 'sent',
      sentAt,
    });

    // Simulate delivery after 2 seconds
    setTimeout(() => {
      const notification = this.notifications.get(messageId);
      if (notification) {
        notification.status = 'delivered';
        notification.deliveredAt = new Date();
        
        // Simulate read after another 10 seconds
        setTimeout(() => {
          if (notification.status === 'delivered') {
            notification.status = 'read';
            notification.readAt = new Date();
          }
        }, 10000);
      }
    }, 2000);

    return {
      success: true,
      messageId,
      status: 'sent',
      sentAt,
      metadata: {
        provider: 'mock',
        kep_address: request.kepAddress,
        subject: request.subject,
        priority: request.priority || 'normal',
        attachments_count: request.attachments?.length || 0
      }
    };
  }

  async getNotificationStatus(messageId: string): Promise<KEPNotificationStatus> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const notification = this.notifications.get(messageId);
    if (!notification) {
      throw new Error(`KEP notification with ID ${messageId} not found`);
    }

    return {
      messageId,
      status: notification.status,
      sentAt: notification.sentAt,
      deliveredAt: notification.deliveredAt,
      readAt: notification.readAt,
      failureReason: notification.failureReason,
      metadata: {
        provider: 'mock'
      }
    };
  }

  async downloadDeliveryReceipt(messageId: string): Promise<Buffer> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const notification = this.notifications.get(messageId);
    if (!notification) {
      throw new Error(`KEP notification with ID ${messageId} not found`);
    }

    // Mock XML delivery receipt content
    const receiptContent = `<?xml version="1.0" encoding="UTF-8"?>
<kep-delivery-receipt>
  <message-id>${messageId}</message-id>
  <recipient>${notification.request.kepAddress}</recipient>
  <subject>${notification.request.subject}</subject>
  <sent-at>${notification.sentAt.toISOString()}</sent-at>
  <status>${notification.status}</status>
  ${notification.deliveredAt ? `<delivered-at>${notification.deliveredAt.toISOString()}</delivered-at>` : ''}
  ${notification.readAt ? `<read-at>${notification.readAt.toISOString()}</read-at>` : ''}
  <provider>Mock KEP Provider</provider>
</kep-delivery-receipt>`;

    return Buffer.from(receiptContent, 'utf-8');
  }

  // Mock-specific methods for testing
  async mockDelivery(messageId: string): Promise<boolean> {
    const notification = this.notifications.get(messageId);
    if (!notification || notification.status !== 'sent') {
      return false;
    }

    notification.status = 'delivered';
    notification.deliveredAt = new Date();
    return true;
  }

  async mockRead(messageId: string): Promise<boolean> {
    const notification = this.notifications.get(messageId);
    if (!notification || notification.status !== 'delivered') {
      return false;
    }

    notification.status = 'read';
    notification.readAt = new Date();
    return true;
  }

  async mockFail(messageId: string, reason: string): Promise<boolean> {
    const notification = this.notifications.get(messageId);
    if (!notification) {
      return false;
    }

    notification.status = 'failed';
    notification.failureReason = reason;
    return true;
  }
}
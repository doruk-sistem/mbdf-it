import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendMail(options: EmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: options.from || process.env.EMAIL_FROM || 'noreply@mbdf-portal.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      console.error('Email send error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
}

// Email templates
export const emailTemplates = {

  agreementSignatureRequest: (recipientName: string, agreementTitle: string, roomName: string, agreementId: string) => ({
    subject: `MBDF-IT: İmza talebi - ${agreementTitle}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">MBDF-IT Portal</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1f2937; margin-top: 0;">📄 İmza Talebi</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Merhaba <strong>${recipientName}</strong>,
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            <strong>${roomName}</strong> odasında <strong>${agreementTitle}</strong> başlıklı 
            sözleşme için imzanız beklenmektedir.
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            Sözleşmeyi incelemek ve imzalamak için aşağıdaki bağlantıya tıklayınız.
          </p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/agreements/${agreementId}" 
               style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Sözleşmeyi Görüntüle
            </a>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
          Bu e-posta MBDF-IT Portal tarafından otomatik olarak gönderilmiştir.
        </div>
      </div>
    `
  })
};

// Helper functions

export async function sendSignatureRequestNotification(
  to: string,
  recipientName: string,
  agreementTitle: string,
  roomName: string,
  agreementId: string
) {
  const template = emailTemplates.agreementSignatureRequest(recipientName, agreementTitle, roomName, agreementId);
  return sendMail({ to, ...template });
}

// Generic email sender for new template system
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, any>;
  from?: string;
}

export async function sendEmail(options: SendEmailOptions) {
  const { getEmailTemplate } = await import('./email-templates');
  
  try {
    const templateResult = getEmailTemplate(options.template as any, options.data);
    
    return await sendMail({
      to: options.to,
      subject: templateResult.subject,
      html: templateResult.html,
      from: options.from
    });
  } catch (error) {
    console.error('Failed to send email with template:', error);
    throw error;
  }
}
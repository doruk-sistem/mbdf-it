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
  accessRequestCreated: (requesterName: string, packageName: string, roomName: string) => ({
    subject: `MBDF-IT: Yeni erişim isteği - ${packageName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">MBDF-IT Portal</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1f2937; margin-top: 0;">Yeni Erişim İsteği</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            <strong>${requesterName}</strong> tarafından <strong>${roomName}</strong> odasında 
            <strong>${packageName}</strong> paketi için erişim isteği oluşturuldu.
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            İsteği değerlendirmek için MBDF-IT portalına giriş yapınız.
          </p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" 
               style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Portalı Aç
            </a>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
          Bu e-posta MBDF-IT Portal tarafından otomatik olarak gönderilmiştir.
        </div>
      </div>
    `
  }),

  accessRequestApproved: (requesterName: string, packageName: string, roomName: string, accessToken: string) => ({
    subject: `MBDF-IT: Erişim isteği onaylandı - ${packageName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">MBDF-IT Portal</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1f2937; margin-top: 0;">✅ Erişim İsteği Onaylandı</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Merhaba <strong>${requesterName}</strong>,
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            <strong>${roomName}</strong> odasında <strong>${packageName}</strong> paketi için 
            erişim isteğiniz onaylanmıştır.
          </p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #1f2937; font-weight: bold; margin: 0;">Erişim Token:</p>
            <code style="background: #e5e7eb; padding: 8px 12px; border-radius: 4px; font-family: 'Courier New', monospace; display: inline-block; margin-top: 8px; word-break: break-all;">
              ${accessToken}
            </code>
          </div>
          <p style="color: #ef4444; line-height: 1.6; font-size: 14px;">
            ⚠️ Bu token'ı güvenli bir yerde saklayınız. Başkalarıyla paylaşmayınız.
          </p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" 
               style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Portalı Aç
            </a>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
          Bu e-posta MBDF-IT Portal tarafından otomatik olarak gönderilmiştir.
        </div>
      </div>
    `
  }),

  accessRequestRejected: (requesterName: string, packageName: string, roomName: string, reason?: string) => ({
    subject: `MBDF-IT: Erişim isteği reddedildi - ${packageName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">MBDF-IT Portal</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1f2937; margin-top: 0;">❌ Erişim İsteği Reddedildi</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Merhaba <strong>${requesterName}</strong>,
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            <strong>${roomName}</strong> odasında <strong>${packageName}</strong> paketi için 
            erişim isteğiniz reddedilmiştir.
          </p>
          ${reason ? `
          <div style="background: #fef2f2; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="color: #1f2937; font-weight: bold; margin: 0;">Red sebebi:</p>
            <p style="color: #4b5563; margin: 8px 0 0 0;">${reason}</p>
          </div>
          ` : ''}
          <p style="color: #4b5563; line-height: 1.6;">
            Daha fazla bilgi için oda yöneticileriyle iletişime geçebilirsiniz.
          </p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" 
               style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Portalı Aç
            </a>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
          Bu e-posta MBDF-IT Portal tarafından otomatik olarak gönderilmiştir.
        </div>
      </div>
    `
  }),

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
export async function sendAccessRequestNotification(
  to: string | string[],
  requesterName: string,
  packageName: string,
  roomName: string
) {
  const template = emailTemplates.accessRequestCreated(requesterName, packageName, roomName);
  return sendMail({ to, ...template });
}

export async function sendAccessApprovedNotification(
  to: string,
  requesterName: string,
  packageName: string,
  roomName: string,
  accessToken: string
) {
  const template = emailTemplates.accessRequestApproved(requesterName, packageName, roomName, accessToken);
  return sendMail({ to, ...template });
}

export async function sendAccessRejectedNotification(
  to: string,
  requesterName: string,
  packageName: string,
  roomName: string,
  reason?: string
) {
  const template = emailTemplates.accessRequestRejected(requesterName, packageName, roomName, reason);
  return sendMail({ to, ...template });
}

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
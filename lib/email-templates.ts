// Email templates for authentication
// These can be customized with your own branding and styling

export const emailTemplates = {
  // Magic link sign-in email template
  magicLink: {
    subject: "MBDF-IT Portal'a Giriş Bağlantınız",
    html: (magicLink: string) => `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MBDF-IT Portal Giriş</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
          }
          .container {
            background: white;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 32px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #6366f1;
            margin-bottom: 8px;
          }
          .title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #1e293b;
          }
          .content {
            margin-bottom: 32px;
            color: #64748b;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 12px;
            font-weight: 600;
            text-align: center;
            margin: 16px 0;
            transition: transform 0.2s;
          }
          .button:hover {
            transform: translateY(-1px);
          }
          .footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 32px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 14px;
          }
          .warning {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            color: #92400e;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🏢 MBDF-IT</div>
            <h1 class="title">Portal'a Giriş Yapın</h1>
          </div>
          
          <div class="content">
            <p>Merhaba,</p>
            <p>MBDF-IT Portal'a giriş yapmak için aşağıdaki butona tıklayın. Bu bağlantı güvenlik nedeniyle 15 dakika içinde geçerliliğini yitirecektir.</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${magicLink}" class="button">Portal'a Giriş Yap</a>
          </div>
          
          <div class="warning">
            <strong>Güvenlik Uyarısı:</strong> Bu e-postayı beklemiyorsanız veya giriş talebinde bulunmadıysanız, lütfen bu mesajı görmezden gelin. Bağlantıya tıklamayın.
          </div>
          
          <div class="content">
            <p>Alternatif olarak, aşağıdaki bağlantıyı kopyalayıp tarayıcınıza yapıştırabilirsiniz:</p>
            <p style="word-break: break-all; background: #f1f5f9; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px;">
              ${magicLink}
            </p>
          </div>
          
          <div class="footer">
            <p>Bu e-posta MBDF-IT Portal tarafından otomatik olarak gönderilmiştir.</p>
            <p>Herhangi bir sorunuz varsa lütfen sistem yöneticinizle iletişime geçin.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (magicLink: string) => `
MBDF-IT Portal'a Giriş

Merhaba,

MBDF-IT Portal'a giriş yapmak için aşağıdaki bağlantıya tıklayın:
${magicLink}

Bu bağlantı güvenlik nedeniyle 15 dakika içinde geçerliliğini yitirecektir.

GÜVENLİK UYARISI: Bu e-postayı beklemiyorsanız veya giriş talebinde bulunmadıysanız, lütfen bu bağlantıya tıklamayın.

Bu e-posta MBDF-IT Portal tarafından otomatik olarak gönderilmiştir.
    `
  },

  // Welcome email for new users
  welcome: {
    subject: "MBDF-IT Portal'a Hoş Geldiniz!",
    html: (userEmail: string, userName?: string) => `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MBDF-IT Portal'a Hoş Geldiniz</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
          }
          .container {
            background: white;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 32px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #6366f1;
            margin-bottom: 8px;
          }
          .title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #1e293b;
          }
          .content {
            margin-bottom: 24px;
            color: #64748b;
          }
          .feature-list {
            background: #f8fafc;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
          }
          .feature-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 16px;
          }
          .feature-item:last-child {
            margin-bottom: 0;
          }
          .feature-icon {
            margin-right: 12px;
            margin-top: 2px;
          }
          .footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 32px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🏢 MBDF-IT</div>
            <h1 class="title">Hoş Geldiniz${userName ? `, ${userName}` : ''}!</h1>
          </div>
          
          <div class="content">
            <p>MBDF-IT Portal'a katıldığınız için teşekkür ederiz. Hesabınız başarıyla oluşturuldu ve artık KKDİK MBDF süreçlerinizi etkin bir şekilde yönetebilirsiniz.</p>
          </div>
          
          <div class="feature-list">
            <h3 style="margin-top: 0; color: #1e293b;">Portal'da Neler Yapabilirsiniz:</h3>
            
            <div class="feature-item">
              <div class="feature-icon">🏠</div>
              <div>
                <strong>MBDF Odaları:</strong> MBDF süreçlerinizi takip edin ve yönetin
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">🗳️</div>
              <div>
                <strong>LR Oylamaları:</strong> Lead Registrant seçim süreçlerine katılın
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">📄</div>
              <div>
                <strong>Sözleşme Yönetimi:</strong> MBDF sözleşmelerini yönetin ve e-imza ile onaylayın
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">📊</div>
              <div>
                <strong>KKS Gönderimler:</strong> KKS veri gönderimlerinizi takip edin
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">🔔</div>
              <div>
                <strong>KEP Bildirimleri:</strong> Önemli bildirimleri KEP üzerinden alın
              </div>
            </div>
          </div>
          
          <div class="content">
            <p>Herhangi bir sorunuz varsa veya yardıma ihtiyacınız olursa, lütfen sistem yöneticinizle iletişime geçin.</p>
            <p>İyi çalışmalar dileriz!</p>
          </div>
          
          <div class="footer">
            <p>Bu e-posta MBDF-IT Portal tarafından otomatik olarak gönderilmiştir.</p>
            <p><strong>E-posta:</strong> ${userEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (userEmail: string, userName?: string) => `
MBDF-IT Portal'a Hoş Geldiniz${userName ? `, ${userName}` : ''}!

MBDF-IT Portal'a katıldığınız için teşekkür ederiz. Hesabınız başarıyla oluşturuldu ve artık KKDİK MBDF süreçlerinizi etkin bir şekilde yönetebilirsiniz.

Portal'da Neler Yapabilirsiniz:

🏠 MBDF Odaları: MBDF süreçlerinizi takip edin ve yönetin
🗳️ LR Oylamaları: Lead Registrant seçim süreçlerine katılın  
📄 Sözleşme Yönetimi: MBDF sözleşmelerini yönetin ve e-imza ile onaylayın
📊 KKS Gönderimler: KKS veri gönderimlerinizi takip edin
🔔 KEP Bildirimleri: Önemli bildirimleri KEP üzerinden alın

Herhangi bir sorunuz varsa veya yardıma ihtiyacınız olursa, lütfen sistem yöneticinizle iletişime geçin.

İyi çalışmalar dileriz!

E-posta: ${userEmail}
    `
  },

  // Password reset email (for future use if password auth is added)
  passwordReset: {
    subject: "MBDF-IT Portal Şifre Sıfırlama",
    html: (resetLink: string) => `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Şifre Sıfırlama</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
          }
          .container {
            background: white;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 32px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #6366f1;
            margin-bottom: 8px;
          }
          .title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #1e293b;
          }
          .content {
            margin-bottom: 32px;
            color: #64748b;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 12px;
            font-weight: 600;
            text-align: center;
            margin: 16px 0;
          }
          .footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 32px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 14px;
          }
          .warning {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            color: #92400e;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🏢 MBDF-IT</div>
            <h1 class="title">Şifre Sıfırlama</h1>
          </div>
          
          <div class="content">
            <p>Merhaba,</p>
            <p>MBDF-IT Portal hesabınız için şifre sıfırlama talebinde bulundunuz. Yeni şifre oluşturmak için aşağıdaki butona tıklayın.</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Şifremi Sıfırla</a>
          </div>
          
          <div class="warning">
            <strong>Güvenlik Uyarısı:</strong> Bu şifre sıfırlama talebinde bulunmadıysanız, lütfen bu mesajı görmezden gelin ve bağlantıya tıklamayın.
          </div>
          
          <div class="footer">
            <p>Bu bağlantı 1 saat içinde geçerliliğini yitirecektir.</p>
            <p>Bu e-posta MBDF-IT Portal tarafından otomatik olarak gönderilmiştir.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (resetLink: string) => `
MBDF-IT Portal Şifre Sıfırlama

Merhaba,

MBDF-IT Portal hesabınız için şifre sıfırlama talebinde bulundunuz. Yeni şifre oluşturmak için aşağıdaki bağlantıya tıklayın:

${resetLink}

GÜVENLİK UYARISI: Bu şifre sıfırlama talebinde bulunmadıysanız, lütfen bu bağlantıya tıklamayın.

Bu bağlantı 1 saat içinde geçerliliğini yitirecektir.
    `
  }
};

// Helper function to send emails (if using Resend or another email service)
export function getEmailTemplate(
  type: keyof typeof emailTemplates,
  params: Record<string, string>
) {
  const template = emailTemplates[type];
  
  return {
    subject: template.subject,
    html: template.html(...Object.values(params)),
    text: template.text(...Object.values(params))
  };
}
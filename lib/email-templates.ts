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
  },

  // Agreement created notification
  agreementCreated: {
    subject: (agreementTitle: string) => `Yeni Sözleşme: ${agreementTitle}`,
    html: (recipientName: string, agreementTitle: string, agreementId: string, signUrl: string) => `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Yeni Sözleşme</title>
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">📄 MBDF-IT</div>
            <h1 class="title">Yeni Sözleşme</h1>
          </div>
          
          <div class="content">
            <p>Merhaba ${recipientName},</p>
            <p>Sizin için yeni bir MBDF sözleşmesi oluşturuldu:</p>
            <p><strong>${agreementTitle}</strong></p>
            <p>Sözleşmeyi incelemek ve imzalamak için aşağıdaki butona tıklayın.</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${signUrl}" class="button">Sözleşmeyi Görüntüle</a>
          </div>
          
          <div class="footer">
            <p>Bu e-posta MBDF-IT Portal tarafından otomatik olarak gönderilmiştir.</p>
            <p>Sözleşme ID: ${agreementId}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (recipientName: string, agreementTitle: string, agreementId: string, signUrl: string) => `
Yeni Sözleşme

Merhaba ${recipientName},

Sizin için yeni bir MBDF sözleşmesi oluşturuldu:
${agreementTitle}

Sözleşmeyi incelemek ve imzalamak için: ${signUrl}

Sözleşme ID: ${agreementId}

Bu e-posta MBDF-IT Portal tarafından otomatik olarak gönderilmiştir.
    `
  },

  // Agreement signed notification
  agreementSigned: {
    subject: (agreementTitle: string) => `Sözleşme İmzalandı: ${agreementTitle}`,
    html: (recipientName: string, agreementTitle: string, signerName: string, agreementId: string, signUrl: string) => `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sözleşme İmzalandı</title>
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
            color: #10b981;
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
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">✅ MBDF-IT</div>
            <h1 class="title">Sözleşme İmzalandı</h1>
          </div>
          
          <div class="content">
            <p>Merhaba ${recipientName},</p>
            <p><strong>${signerName}</strong> aşağıdaki sözleşmeyi imzaladı:</p>
            <p><strong>${agreementTitle}</strong></p>
            <p>Sözleşmenin güncel durumunu görüntülemek için aşağıdaki butona tıklayın.</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${signUrl}" class="button">Sözleşmeyi Görüntüle</a>
          </div>
          
          <div class="footer">
            <p>Bu e-posta MBDF-IT Portal tarafından otomatik olarak gönderilmiştir.</p>
            <p>Sözleşme ID: ${agreementId}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (recipientName: string, agreementTitle: string, signerName: string, agreementId: string, signUrl: string) => `
Sözleşme İmzalandı

Merhaba ${recipientName},

${signerName} aşağıdaki sözleşmeyi imzaladı:
${agreementTitle}

Sözleşmenin güncel durumunu görüntülemek için: ${signUrl}

Sözleşme ID: ${agreementId}

Bu e-posta MBDF-IT Portal tarafından otomatik olarak gönderilmiştir.
    `
  },

  // Signature request notification
  signatureRequest: {
    subject: (agreementTitle: string) => `İmza Talebi: ${agreementTitle}`,
    html: (recipientName: string, agreementTitle: string, agreementId: string, signUrl: string) => `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>İmza Talebi</title>
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
            color: #f59e0b;
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
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
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
          .urgent {
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
            <div class="logo">✍️ MBDF-IT</div>
            <h1 class="title">İmza Talebi</h1>
          </div>
          
          <div class="content">
            <p>Merhaba ${recipientName},</p>
            <p>Aşağıdaki sözleşme için imzanız bekleniyor:</p>
            <p><strong>${agreementTitle}</strong></p>
            <p>Lütfen sözleşmeyi inceleyin ve imzalayın.</p>
          </div>
          
          <div class="urgent">
            <strong>Önemli:</strong> Bu sözleşmenin imzalanması MBDF sürecinin devam edebilmesi için gereklidir.
          </div>
          
          <div style="text-align: center;">
            <a href="${signUrl}" class="button">Sözleşmeyi İmzala</a>
          </div>
          
          <div class="footer">
            <p>Bu e-posta MBDF-IT Portal tarafından otomatik olarak gönderilmiştir.</p>
            <p>Sözleşme ID: ${agreementId}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (recipientName: string, agreementTitle: string, agreementId: string, signUrl: string) => `
İmza Talebi

Merhaba ${recipientName},

Aşağıdaki sözleşme için imzanız bekleniyor:
${agreementTitle}

Lütfen sözleşmeyi inceleyin ve imzalayın: ${signUrl}

ÖNEMLİ: Bu sözleşmenin imzalanması MBDF sürecinin devam edebilmesi için gereklidir.

Sözleşme ID: ${agreementId}

Bu e-posta MBDF-IT Portal tarafından otomatik olarak gönderilmiştir.
    `
  },

  // Room archived notification
  roomArchived: {
    subject: (roomName: string) => `MBDF Odası Arşivlendi: ${roomName}`,
    html: (memberName: string, roomName: string, archiveReason: string, archivedAt: string, pendingRejected: number, approvedRevoked: number) => `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MBDF Odası Arşivlendi</title>
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
            color: #dc2626;
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
          .info-box {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            color: #92400e;
          }
          .stats-box {
            background: #fee2e2;
            border: 1px solid #dc2626;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            color: #991b1b;
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
            <div class="logo">📁 MBDF-IT</div>
            <h1 class="title">MBDF Odası Arşivlendi</h1>
          </div>
          
          <div class="content">
            <p>Merhaba ${memberName},</p>
            <p>Aşağıdaki MBDF odası arşivlenmiştir:</p>
            <p><strong>${roomName}</strong></p>
            <p>Arşivlenme Tarihi: <strong>${archivedAt}</strong></p>
          </div>
          
          ${archiveReason && archiveReason.trim() ? `
          <div class="info-box">
            <strong>Arşivlenme Nedeni:</strong><br>
            ${archiveReason}
          </div>
          ` : ''}
          
          ${(pendingRejected > 0 || approvedRevoked > 0) ? `
          <div class="stats-box">
            <strong>Etkilenen İstekler:</strong>
            <ul style="margin: 8px 0;">
              ${pendingRejected > 0 ? `<li>${pendingRejected} bekleyen istek reddedildi</li>` : ''}
              ${approvedRevoked > 0 ? `<li>${approvedRevoked} onaylanmış token iptal edildi</li>` : ''}
            </ul>
          </div>
          ` : ''}
          
          <div class="content">
            <p><strong>Önemli:</strong> Arşivlenen oda artık salt okunur modundadır. Yeni doküman, mesaj veya talep eklenemez, mevcut içerikler değiştirilemez.</p>
            <p>Oda verileriniz korunmuştur ve görüntülemeye devam edebilirsiniz.</p>
          </div>
          
          <div class="footer">
            <p>Bu e-posta MBDF-IT Portal tarafından otomatik olarak gönderilmiştir.</p>
            <p>Sorularınız için sistem yöneticinizle iletişime geçin.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (memberName: string, roomName: string, archiveReason: string, archivedAt: string, pendingRejected: number, approvedRevoked: number) => `
MBDF Odası Arşivlendi

Merhaba ${memberName},

Aşağıdaki MBDF odası arşivlenmiştir:
${roomName}

Arşivlenme Tarihi: ${archivedAt}

${archiveReason && archiveReason.trim() ? `
Arşivlenme Nedeni: ${archiveReason}
` : ''}

${(pendingRejected > 0 || approvedRevoked > 0) ? `
Etkilenen İstekler:
${pendingRejected > 0 ? `- ${pendingRejected} bekleyen istek reddedildi` : ''}
${approvedRevoked > 0 ? `- ${approvedRevoked} onaylanmış token iptal edildi` : ''}
` : ''}

ÖNEMLİ: Arşivlenen oda artık salt okunur modundadır. Yeni doküman, mesaj veya talep eklenemez, mevcut içerikler değiştirilemez.

Oda verileriniz korunmuştur ve görüntülemeye devam edebilirsiniz.

Bu e-posta MBDF-IT Portal tarafından otomatik olarak gönderilmiştir.
Sorularınız için sistem yöneticinizle iletişime geçin.
    `
  },

  // Room invitation notification
  roomInvitation: {
    subject: (roomName: string) => `MBDF Odası Daveti: ${roomName}`,
    html: (recipientName: string, roomName: string, inviterName: string, message: string, roomId: string) => `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MBDF Odası Daveti</title>
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
            color: #3b82f6;
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
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
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
          .invitation-box {
            background: #eff6ff;
            border: 1px solid #3b82f6;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            color: #1e40af;
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
            <h1 class="title">MBDF Odası Daveti</h1>
          </div>
          
          <div class="content">
            <p>Merhaba ${recipientName},</p>
            <p><strong>${inviterName}</strong> sizi aşağıdaki MBDF odasına davet etti:</p>
            <p><strong>${roomName}</strong></p>
          </div>
          
          <div class="invitation-box">
            <strong>📋 Davet Mesajı:</strong><br>
            ${message || 'Bu odaya katılmak için davet edildiniz.'}
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/mbdf/${roomId}" class="button">Odaya Katıl</a>
          </div>
          
          <div class="content">
            <p><strong>MBDF Odası Nedir?</strong></p>
            <p>MBDF odaları, KKDİK MBDF süreçlerinizi yönetmek, doküman paylaşmak, oylamalar yapmak ve sözleşmeler imzalamak için kullanılan dijital çalışma alanlarıdır.</p>
          </div>
          
          <div class="footer">
            <p>Bu e-posta MBDF-IT Portal tarafından otomatik olarak gönderilmiştir.</p>
            <p>Herhangi bir sorunuz varsa lütfen sistem yöneticinizle iletişime geçin.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (recipientName: string, roomName: string, inviterName: string, message: string, roomId: string) => `
MBDF Odası Daveti

Merhaba ${recipientName},

${inviterName} sizi aşağıdaki MBDF odasına davet etti:
${roomName}

Davet Mesajı: ${message || 'Bu odaya katılmak için davet edildiniz.'}

Odaya katılmak için: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/mbdf/${roomId}

MBDF Odası Nedir?
MBDF odaları, KKDİK MBDF süreçlerinizi yönetmek, doküman paylaşmak, oylamalar yapmak ve sözleşmeler imzalamak için kullanılan dijital çalışma alanlarıdır.

Bu e-posta MBDF-IT Portal tarafından otomatik olarak gönderilmiştir.
    `
  },

  // Room unarchived notification
  roomUnarchived: {
    subject: (roomName: string) => `MBDF Odası Yeniden Etkinleştirildi: ${roomName}`,
    html: (memberName: string, roomName: string, unarchivedAt: string) => `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MBDF Odası Yeniden Etkinleştirildi</title>
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
            color: #10b981;
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
          .success-box {
            background: #d1fae5;
            border: 1px solid #10b981;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            color: #065f46;
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
            <div class="logo">🔄 MBDF-IT</div>
            <h1 class="title">MBDF Odası Yeniden Etkinleştirildi</h1>
          </div>
          
          <div class="content">
            <p>Merhaba ${memberName},</p>
            <p>Aşağıdaki MBDF odası yeniden etkinleştirilmiştir:</p>
            <p><strong>${roomName}</strong></p>
            <p>Etkinleştirme Tarihi: <strong>${unarchivedAt}</strong></p>
          </div>
          
          <div class="success-box">
            <strong>✅ Oda Aktif:</strong> Artık yeniden doküman yükleyebilir, mesaj gönderebilir ve erişim talebinde bulunabilirsiniz.
          </div>
          
          <div class="content">
            <p><strong>Önemli Not:</strong> Daha önce iptal edilen erişim tokenları otomatik olarak yeniden etkinleştirilmez. Gerekirse yeni erişim talepleri oluşturabilirsiniz.</p>
          </div>
          
          <div class="footer">
            <p>Bu e-posta MBDF-IT Portal tarafından otomatik olarak gönderilmiştir.</p>
            <p>Sorularınız için sistem yöneticinizle iletişime geçin.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (memberName: string, roomName: string, unarchivedAt: string) => `
MBDF Odası Yeniden Etkinleştirildi

Merhaba ${memberName},

Aşağıdaki MBDF odası yeniden etkinleştirilmiştir:
${roomName}

Etkinleştirme Tarihi: ${unarchivedAt}

✅ Oda Aktif: Artık yeniden doküman yükleyebilir, mesaj gönderebilir ve erişim talebinde bulunabilirsiniz.

ÖNEMLİ NOT: Daha önce iptal edilen erişim tokenları otomatik olarak yeniden etkinleştirilmez. Gerekirse yeni erişim talepleri oluşturabilirsiniz.

Bu e-posta MBDF-IT Portal tarafından otomatik olarak gönderilmiştir.
Sorularınız için sistem yöneticinizle iletişime geçin.
    `
  }
};

// Helper function to send emails (if using Resend or another email service)
export function getEmailTemplate(
  type: keyof typeof emailTemplates,
  params: Record<string, any>
) {
  const template = emailTemplates[type];
  
  // Handle different template signature types
  if (type === 'magicLink' || type === 'passwordReset') {
    const [link] = Object.values(params) as [string];
    return {
      subject: template.subject,
      html: (template as any).html(link),
      text: (template as any).text(link)
    };
  } else if (type === 'welcome') {
    const [email, name] = Object.values(params) as [string, string?];
    return {
      subject: template.subject,
      html: (template as any).html(email, name),
      text: (template as any).text(email, name)
    };
  } else if (type === 'agreementCreated' || type === 'signatureRequest') {
    const [recipientName, agreementTitle, agreementId, signUrl] = Object.values(params) as [string, string, string, string];
    return {
      subject: (template as any).subject(agreementTitle),
      html: (template as any).html(recipientName, agreementTitle, agreementId, signUrl),
      text: (template as any).text(recipientName, agreementTitle, agreementId, signUrl)
    };
  } else if (type === 'agreementSigned') {
    const [recipientName, agreementTitle, signerName, agreementId, signUrl] = Object.values(params) as [string, string, string, string, string];
    return {
      subject: (template as any).subject(agreementTitle),
      html: (template as any).html(recipientName, agreementTitle, signerName, agreementId, signUrl),
      text: (template as any).text(recipientName, agreementTitle, signerName, agreementId, signUrl)
    };
  } else if (type === 'roomArchived') {
    const [memberName, roomName, archiveReason, archivedAt, pendingRejected, approvedRevoked] = Object.values(params) as [string, string, string, string, number, number];
    return {
      subject: (template as any).subject(roomName),
      html: (template as any).html(memberName, roomName, archiveReason, archivedAt, pendingRejected, approvedRevoked),
      text: (template as any).text(memberName, roomName, archiveReason, archivedAt, pendingRejected, approvedRevoked)
    };
  } else if (type === 'roomInvitation') {
    const [recipientName, roomName, inviterName, message, roomId] = Object.values(params) as [string, string, string, string, string];
    return {
      subject: (template as any).subject(roomName),
      html: (template as any).html(recipientName, roomName, inviterName, message, roomId),
      text: (template as any).text(recipientName, roomName, inviterName, message, roomId)
    };
  } else if (type === 'roomUnarchived') {
    const [memberName, roomName, unarchivedAt] = Object.values(params) as [string, string, string];
    return {
      subject: (template as any).subject(roomName),
      html: (template as any).html(memberName, roomName, unarchivedAt),
      text: (template as any).text(memberName, roomName, unarchivedAt)
    };
  }
  
  // Default fallback
  return {
    subject: 'MBDF-IT Portal',
    html: '<p>Template not found</p>',
    text: 'Template not found'
  };
}
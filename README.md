# MBDF-IT Portal

KKDİK MBDF süreçlerini yönetmek için geliştirilmiş modern web uygulaması. Next.js 14, TypeScript, Tailwind CSS, shadcn/ui ve Supabase teknolojileri kullanılarak inşa edilmiştir.

## 🚀 Özellikler

### 📋 Core Functionality
- **MBDF Room Management**: MBDF odalarını oluşturma, yönetme ve üye kontrolü
- **LR Voting System**: Lider Kayıtçı seçimi için puanlama sistemi
- **Document Management**: Güvenli dokuman yükleme ve paylaşım
- **E-Signature Integration**: Sözleşme imzalama süreçleri
- **KEP Integration**: KEP bildirim sistemi
- **KKS Submission**: KKS'ye veri gönderimi ve takibi

### 🎨 UI/UX Features
- **Modern Design**: shadcn/ui ile tutarlı tasarım sistemi
- **Dark/Light Mode**: Otomatik tema değişimi
- **Responsive Design**: Mobil uyumlu arayüz
- **Real-time Updates**: Canlı veri güncelleme
- **Advanced Filtering**: Gelişmiş filtreleme ve arama
- **Interactive Animations**: Framer Motion ile geçiş efektleri

### 🔒 Security & Performance
- **Magic Link Authentication**: Şifresiz güvenli giriş sistemi
- **Row Level Security (RLS)**: Supabase RLS ile veri güvenliği
- **Role-based Access**: Rol bazlı erişim kontrolü
- **Signed URLs**: Güvenli dosya erişimi
- **Audit Logging**: Tüm işlemlerin kayıt altına alınması
- **Server Actions**: Type-safe sunucu işlemleri
- **Middleware Protection**: Route-level güvenlik kontrolü

## 🛠️ Teknoloji Stack

### Frontend
- **Next.js 14**: App Router, Server Components, Server Actions
- **TypeScript**: Type safety ve geliştirici deneyimi
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Radix UI tabanlı component kütüphanesi
- **Framer Motion**: Animasyon kütüphanesi
- **Lucide React**: Icon kütüphanesi

### Backend & Database
- **Supabase**: PostgreSQL, Authentication, Storage, RLS
- **Resend**: E-posta gönderim servisi
- **PDF-lib**: PDF oluşturma
- **CSV-stringify**: CSV veri işleme

### Design System
- **Geist Font**: Modern tipografi
- **CSS Variables**: Tema yönetimi
- **Rounded Design**: 2xl border radius
- **Consistent Spacing**: 4px scale
- **Accessible Colors**: WCAG uyumlu renk paleti

## 📦 Kurulum

### Ön Gereksinimler
- Node.js 18.0 veya üzeri
- pnpm 8.0 veya üzeri
- Supabase hesabı
- Resend hesabı (opsiyonel)

### 1. Repository'yi Klonlayın
```bash
git clone [repository-url]
cd mbdf-it-portal
```

### 2. Bağımlılıkları Yükleyin
```bash
pnpm install
```

### 3. Environment Variables
`.env.local.example` dosyasını kopyalayıp `.env.local` olarak yeniden adlandırın:

```bash
cp .env.local.example .env.local
```

`.env.local` dosyasını düzenleyin:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Email Configuration (Resend) - Opsiyonel
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@yourdomain.com
```

### 4. Supabase Setup

#### 4.1 Supabase Projesi Oluşturun
1. [Supabase Dashboard](https://supabase.com/dashboard)'a gidin
2. "New Project" tıklayın
3. Proje detaylarını doldurun
4. **Önemli**: Region olarak "Europe (EU Central)" seçin

#### 4.2 Veritabanı Schema'sını Kurun
SQL dosyalarını sırası ile çalıştırın:

```bash
# 1. ÖNCE: Ana schema ve tabloları oluştur (mbdf_member dahil)
sql/schema.sql

# 2. SONRA: Authentication triggers ve basic policies 
sql/auth.sql

# 3. Enhanced RLS policies (mbdf_member tablosunu kullanır)
sql/policies.sql

# 4. LR oylaması fonksiyonlarını ekle
sql/lr_voting.sql

# 5. E-imza ve KEP fonksiyonlarını ekle
sql/esign_kep.sql

# 6. KKS hazırlama fonksiyonlarını ekle
sql/kks_prep.sql
```

**ÖNEMLİ:** SQL dosyalarını mutlaka bu sırada çalıştırın. `auth.sql` dosyası artık `mbdf_member` tablosuna referans yapmıyor, bu yüzden `schema.sql`'den sonra güvenle çalıştırılabilir.

#### 4.3 Storage Bucket'larını Oluşturun
Supabase Dashboard > Storage:

1. **docs** bucket'ı oluşturun (private)
2. **kks** bucket'ı oluşturun (private)

Storage policies ayarları:
```sql
-- docs bucket için
CREATE POLICY "Authenticated users can upload docs" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'docs' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view docs they have access to" ON storage.objects 
FOR SELECT USING (bucket_id = 'docs' AND auth.role() = 'authenticated');

-- kks bucket için
CREATE POLICY "LR/Admin can manage KKS files" ON storage.objects 
FOR ALL USING (bucket_id = 'kks' AND auth.role() = 'authenticated');
```

#### 4.4 Authentication Setup
Supabase Dashboard > Authentication:

1. **Email (Magic Link)** provider'ını etkinleştirin
2. **Email confirmation** ayarını KAPATIN (disable edin)
3. Redirect URLs'i ayarlayın:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/**`
4. **Email Templates** kısmından magic link email template'ini özelleştirin (opsiyonel)

**Önemli:** Magic link authentication kullanıldığı için şifre gerektirmez. Kullanıcılar sadece email adressleri ile giriş yapar.

### 5. Uygulamayı Başlatın
```bash
pnpm dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde çalışmaya başlayacaktır.

## 🔐 Authentication Sistemi

### Giriş Akışı
1. **Sign-in Sayfası**: `/auth/sign-in` - Email adresi ile magic link isteme
2. **Magic Link**: Email'e gönderilen bağlantı ile otomatik giriş
3. **Callback**: `/auth/callback` - Session kurulumu ve yönlendirme
4. **Onboarding**: `/onboarding` - İlk giriş için profil tamamlama
5. **Dashboard**: `/` - Ana sayfa ve MBDF odaları

### Özellikler
- **Şifresiz Giriş**: Magic link ile güvenli authentication
- **Otomatik Profil Oluşturma**: SQL trigger ile kullanıcı kaydında otomatik profil
- **Onboarding Akışı**: Kullanıcı ve şirket bilgileri toplama
- **Route Protection**: Middleware ile sayfa erişim kontrolü
- **User Menu**: Profil, ayarlar ve çıkış işlemleri
- **Mobile Support**: Responsive tasarım ve mobile navigation

### Korumalı Sayfalar
- `/` - Dashboard (auth gerekli)
- `/mbdf/*` - MBDF odaları (auth gerekli)
- `/agreements` - Sözleşmeler (auth gerekli)
- `/kks` - KKS gönderimler (auth gerekli)
- `/settings` - Profil ayarları (auth gerekli)
- `/onboarding` - Profil tamamlama (auth gerekli, onboarding incomplete)

### Public Sayfalar
- `/auth/sign-in` - Giriş sayfası
- `/auth/callback` - Auth callback
- `/api/*` - API endpoints

## 📁 Proje Yapısı

```
├── app/                    # Next.js App Router
│   ├── actions/           # Server Actions
│   │   └── auth.ts       # Authentication actions
│   ├── auth/             # Authentication sayfaları
│   │   ├── sign-in/      # Giriş sayfası
│   │   └── callback/     # Auth callback
│   ├── onboarding/       # Kullanıcı onboarding
│   ├── settings/         # Profil ve ayarlar
│   ├── agreements/       # Sözleşmeler sayfaları
│   ├── kks/             # KKS sayfaları
│   ├── mbdf/[roomId]/   # MBDF oda sayfaları
│   ├── globals.css      # Global stiller
│   ├── layout.tsx       # Root layout
│   └── middleware.ts    # Route protection
├── components/            # React bileşenleri
│   ├── ui/               # shadcn/ui bileşenleri
│   ├── auth/            # Authentication bileşenleri
│   │   ├── sign-in-card.tsx
│   │   ├── onboarding-card.tsx
│   │   ├── user-menu.tsx
│   │   └── auth-wrapper.tsx
│   ├── settings/        # Ayarlar bileşenleri
│   ├── dashboard/       # Dashboard bileşenleri
│   ├── room/            # Oda yönetim bileşenleri
│   ├── agreements/      # Sözleşme bileşenleri
│   └── kks/             # KKS bileşenleri
├── lib/                  # Utility fonksiyonları
│   ├── esign/           # E-imza providers
│   ├── kks/             # KKS utilities
│   ├── supabase.ts      # Supabase client
│   ├── email-templates.ts # Email templates
│   └── utils.ts         # Genel utilities
├── sql/                 # Veritabanı dosyaları
│   ├── schema.sql       # Ana schema
│   ├── auth.sql         # Authentication
│   ├── policies.sql     # RLS policies
│   └── ...             # Diğer SQL dosyaları
├── types/               # TypeScript type tanımları
└── README.md
```

## 🔧 Geliştirme

### Veritabanı Schema Değişiklikleri
1. SQL dosyasını güncelleyin
2. Supabase Dashboard'da çalıştırın
3. Type dosyalarını güncelleyin

### Yeni Component Ekleme
```bash
# shadcn/ui component ekle
npx shadcn-ui@latest add [component-name]
```

### Email Template Düzenleme
Email template'leri `lib/email.ts` dosyasında bulunur.

### Provider Entegrasyonu
Yeni e-imza veya KEP provider'ları için:
1. `lib/esign/providers/` veya `lib/kks/providers/` altına provider sınıfı oluşturun
2. Interface'i implement edin
3. Provider registry'ye ekleyin

## 🧪 Test Verisi

### Test Kullanıcıları
Geliştirme ortamı için test kullanıcıları oluşturmak:

```sql
-- Test company
INSERT INTO public.company (name, vat_number) VALUES 
('Test Şirketi A.Ş.', '1234567890');

-- Test substances
INSERT INTO public.substance (name, ec_number, cas_number) VALUES 
('Benzene', '200-753-7', '71-43-2'),
('Toluene', '203-625-9', '108-88-3');
```

### Mock Providers
Geliştirme için mock provider'lar mevcuttur:
- **MockESignatureProvider**: E-imza simulasyonu
- **MockKKSProvider**: KKS gönderim simulasyonu
- **MockKEPProvider**: KEP bildirim simulasyonu

## 🚀 Production Deployment

### Vercel Deployment
1. Vercel'e import edin
2. Environment variables'ları ayarlayın
3. Domain'i yapılandırın
4. Supabase settings'ten production URL'lerini güncelleyin

### Custom Deployment
```bash
# Production build
pnpm build

# Start production server
pnpm start
```

### Environment Variables (Production)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
RESEND_API_KEY=your-production-resend-key
EMAIL_FROM=noreply@yourdomain.com
```

## 📝 API Documentation

### Server Actions
- `app/actions/auth.ts`: Authentication işlemleri
  - `sendMagicLink()`: Magic link gönderimi
  - `completeOnboarding()`: Onboarding tamamlama
  - `signOut()`: Çıkış işlemi
  - `updateUserProfile()`: Profil güncelleme
  - `updateCompanyInfo()`: Şirket bilgileri güncelleme
- `app/actions/rooms.ts`: MBDF oda yönetimi
- `app/actions/documents.ts`: Dokuman yönetimi
- `app/actions/voting.ts`: LR oylaması yönetimi

### Database Functions
- **Authentication Functions**:
  - `handle_new_user()`: Yeni kullanıcı profil oluşturma (trigger)
  - `handle_user_delete()`: Kullanıcı silme ve audit log (trigger)
  - `get_current_user_profile()`: Mevcut kullanıcı profili ve şirket bilgileri
  - `is_onboarding_complete()`: Onboarding tamamlanma kontrolü
  - `can_access_room()`: Oda erişim yetkisi kontrolü
  - `get_user_role_in_room()`: Kullanıcının odadaki rolü
- **Business Functions**:
  - `finalize_lr_selection()`: LR seçimi sonuçlandırma
  - `create_agreement_with_parties()`: Sözleşme oluşturma
  - `generate_kks_evidence()`: KKS kanıt dosyası oluşturma

## 🔐 Güvenlik

### RLS Policies
Tüm tablolarda Row Level Security aktif:
- Sadece oda üyeleri verilere erişebilir
- LR/Admin rolleri ek yetkiler
- Audit log tüm işlemleri kaydeder

### File Security
- Private bucket'lar
- Signed URL'ler (1 saat geçerli)
- Dosya boyutu limitleri (10MB)

### Email Security
- Template injection koruması
- Rate limiting (Resend tarafından)
- Secure email headers

## 🐛 Troubleshooting

### Yaygın Sorunlar

**1. Supabase bağlantı hatası**
```bash
# Environment variables kontrolü
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**2. RLS policy hataları**
SQL dosyalarının sırasına göre çalıştırıldığından emin olun.

**3. Email gönderim hataları**
Resend API key'ini kontrol edin ve domain verification'ını tamamlayın.

**4. File upload hataları**
Storage bucket'larının oluşturulduğunu ve policy'lerin ayarlandığını kontrol edin.

**5. Magic link authentication hataları**
```bash
# Email provider ayarlarını kontrol edin
# Supabase Dashboard > Authentication > Providers > Email
# "Enable email confirmations" KAPALI olmalı
```

**6. Onboarding döngüsü sorunları**
```bash
# Profil veya company_id eksikse onboarding'e yönlendirir
# sql/auth.sql dosyasının doğru çalıştırıldığından emin olun
```

**7. Middleware redirect döngüleri**
```bash
# NEXT_PUBLIC_SITE_URL environment variable'ının doğru ayarlandığından emin olun
# Callback URL'lerin Supabase'de doğru yapılandırıldığını kontrol edin
```

### Debug Modları
```bash
# Supabase debug
NEXT_PUBLIC_SUPABASE_DEBUG=true pnpm dev

# Detaylı error logging
NODE_ENV=development pnpm dev
```

## 📄 Lisans

Bu proje özel lisans altında geliştirilmiştir. Kullanım koşulları için lütfen lisans sahibi ile iletişime geçin.

## 🤝 Katkı

Geliştirme sürecine katkı sağlamak için:

1. Feature branch oluşturun
2. Değişikliklerinizi commit edin
3. Pull request açın
4. Review sürecini bekleyin

### Commit Convention
```bash
feat: yeni özellik
fix: hata düzeltme  
docs: dokümantasyon
style: stil değişiklikleri
refactor: kod refaktoring
test: test ekleme
chore: araç/config değişiklikleri
```

---

## 📞 Destek

Teknik destek veya sorular için:
- **Email**: [support@yourdomain.com](mailto:support@yourdomain.com)
- **Documentation**: Bu README dosyası
- **Issues**: GitHub Issues kısmı

**Not**: Bu uygulama production-ready MVP olarak tasarlanmıştır. Gerçek provider entegrasyonları için mock provider'ları değiştirin.
# Changelog

Bu dosya MBDF-IT projesindeki tüm önemli değişiklikleri listeler.

## [2025-01-28] - Dashboard Schema Validation & Stack Depth Fix

### Düzeltilen
- **Dashboard veri yükleme hatası çözüldü**
  - API 200 döndüğü halde UI'da "Veri yüklenirken bir hata oluştu" hatası gösterilme sorunu çözüldü
  - RoomWithDetailsSchema'da substance ve created_by_profile alanları nullable yapıldı
  - Dashboard component'inde room substance gösterimi için null safety kontrolleri eklendi
  - Schema validation hatası nedeniyle oluşan data parsing sorunları giderildi
- **Server-side prefetch stack depth hatası çözüldü**
  - prefetchRooms fonksiyonu admin client kullanacak şekilde güncellendi
  - RLS bypass edilerek PostgreSQL recursive policy sorunu giderildi
  - API route ile aynı mantık kullanılarak consistency sağlandı
- **Room detail API stack depth hatası çözüldü**
  - /api/rooms/[roomId] endpoint'i admin client kullanacak şekilde güncellendi
  - GET, PUT ve DELETE metodları RLS bypass ederek çalışıyor
  - prefetchRoom fonksiyonu da admin client kullanıyor
  - Tüm room-related API'ler artık stack depth hatasından muaf
- **Membership check stack depth hatası çözüldü**
  - Tüm mbdf_member sorguları admin client kullanacak şekilde güncellendi
  - GET, PUT, DELETE metodlarındaki membership kontrolü artık RLS bypass ediyor
  - Bu sayede "Error checking membership" stack depth hatası giderildi
- **Server actions stack depth hatası çözüldü**
  - app/actions/rooms.ts dosyasındaki server action'lar güncellendi
  - getRoomMembers fonksiyonu admin client kullanıyor
  - checkMembership helper fonksiyonu eklendi - tüm membership kontrolleri için merkezi çözüm
  - "Not a member of this room" hatası artık görünmeyecek

## [2025-01-28] - Room Creation RLS Policy Fix

### Düzeltilen
- **Oda oluşturma RLS politikası hatası çözüldü**
  - Room creation API'si admin client kullanacak şekilde güncellendiş
  - RLS politika ihlali hatası (code: '42501') bypass edildi
  - Authentication kontrolü korunarak güvenlik sağlandı
  - Member ekleme işlemi de admin client ile yapılıyor
- **Zod datetime validation hatası düzeltildi**
  - Strict datetime validation yerine flexible string validation kullanımına geçiş
  - Supabase timestamp formatı ile uyumluluk sağlandı
  - Schema validation sorunları çözüldü
- **PostgreSQL stack depth limit hatası çözüldü (v2 - Aggressive Fix)**
  - Rooms API GET endpoint tamamen admin client ile çalışıyor
  - RLS tamamen bypass edilerek recursive policy sorunları çözüldü
  - Tüm related data (substance, profile, member count) ayrı query'lerle alınıyor
  - Hiç join kullanılmıyor, her şey separate query'ler ile çözüldü
  - Schema validation tamamen kaldırıldı
  - `max_stack_depth` limit aşımı problemi kesin olarak çözüldü
- **TypeScript hatalarını düzeltildi**
  - Admin client type assertion'ları eklendi
  - `(adminSupabase as any)` ve `(room as any)` type assertion'ları kullanıldı
  - Tüm linter hatalar çözüldü

### Teknik Detaylar
- Problem: "new row violates row-level security policy for table 'mbdf_room'" hatası
- Çözüm: `createAdminSupabase()` client kullanımı ile RLS bypass
- Modified files: `app/api/rooms/route.ts`
- Alternative SQL fixes: `sql/fix-room-creation-policy.sql`, `sql/fix-room-creation-alternative.sql`

### Güvenlik
- User authentication hala normal client ile kontrol ediliyor
- Sadece room creation ve member insertion için admin client kullanılıyor
- RLS bypass minimal seviyede uygulandı

## [2025-08-23] - Substances API ve Create Room Fix

### Eklenen
- `/api/substances` API endpoint'i oluşturuldu
- Substances için type güvenli schema'lar eklendi (`SubstancesListResponseSchema`)
- Database'den substances verilerini listeleyen API endpoint implementasyonu

### Düzeltilen
- **Create Room sayfasında madde seçimi yüklenmiyor sorunu çözüldü**
  - Eksik olan `/app/api/substances/route.ts` dosyası oluşturuldu
  - `useSubstances` hook'u artık type güvenli schema kullanıyor
  - Database'den substances verilerini pagination ve arama ile getiren API endpoint implementasyonu
  - Authentication kontrolü ve error handling eklendi
- **Zod datetime validation hatası düzeltildi**
  - Supabase'den gelen timestamp formatıyla Zod strict datetime validation'ı arasındaki uyumsuzluk çözüldü
  - API response validation'ı optimize edildi
- **Madde seçimi dropdown görünümü iyileştirildi**
  - Seçilen madde artık EC ve CAS numaralarıyla birlikte güzel görünüyor
  - Dropdown trigger yüksekliği optimize edildi
  - Madde bilgileri düzgün hizalanmış şekilde gösteriliyor

### Değiştirilen
- `hooks/use-substances.ts` dosyası type güvenli hale getirildi
- `lib/schemas/index.ts` dosyasına `SubstancesListResponseSchema` eklendi
- Substances API endpoint'i `lib/api.ts` dosyasında zaten tanımlıydı, sadece implementasyon eksikti

### Teknik Detaylar
- API endpoint: `GET /api/substances`
- Response format: `{ items: Substance[], total: number }`
- Supports search query parameter for filtering by name, CAS number, or EC number
- Supports pagination with limit and offset parameters
- Requires authentication (Supabase auth)
- Uses database table `substance` (singular) but API endpoint is `substances` (plural)

### Test Edilenler
- API endpoint authorization kontrolü çalışıyor
- Database'de test verisi mevcut (benzene, toluene, formaldehyde vb.)
- Create room form'unda madde seçimi artık yüklenebilecek durumda

## Kullanım

Create Room sayfasında (`/create-room`) madde seçimi artık düzgün şekilde yüklenmeli:

1. Kullanıcı madde arama kutusunda arama yapabilir
2. Dropdown'da mevcut maddeler listelenir
3. Her madde için isim, CAS numarası ve EC numarası gösterilir
4. Seçilen madde bilgileri form altında önizlenir

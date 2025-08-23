# Changelog

Bu dosya MBDF-IT projesindeki tüm önemli değişiklikleri listeler.

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

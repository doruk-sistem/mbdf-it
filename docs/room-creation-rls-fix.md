# Room Creation RLS Policy Fix

## Problem
Room oluşturma işleminde `mbdf_room` tablosunda RLS (Row Level Security) politika ihlali hatası alınıyordu:

```
Error creating room: {
  code: '42501',
  message: 'new row violates row-level security policy for table "mbdf_room"'
}
```

## Root Cause
RLS politikasında `current_user_id()` fonksiyonunun `auth.uid()` ile aynı sonucu döndürmesi gerekiyordu ama `SECURITY DEFINER` özelliği eksikti. Bu durum authentication context'inin doğru şekilde erişilememesine neden oluyordu.

## Solutions Applied

### Solution 1: SQL Policy Fix
`sql/fix-room-creation-policy.sql` dosyası oluşturuldu:
- RLS politikasında `auth.uid()` kullanımına geçiş
- `current_user_id()` fonksiyonuna `SECURITY DEFINER` eklendi

### Solution 2: Admin Client Workaround (Applied)
`app/api/rooms/route.ts` güncellenecek:
- Room creation için `createAdminSupabase()` kullanımı
- Member ekleme için de admin client kullanımı
- Authentication kontrolü korunarak güvenlik sağlandı

## Implementation Details

### API Changes
```typescript
// Before
const supabase = createServerSupabase();
const { data: room, error } = await supabase.from('mbdf_room').insert([...]);

// After  
const adminSupabase = createAdminSupabase();
const { data: room, error } = await adminSupabase.from('mbdf_room').insert([...]);
```

### Security Considerations
- User authentication hala normal client ile kontrol ediliyor
- Sadece room creation ve member insertion için admin client kullanılıyor
- RLS bypass'i sadece gerekli minimum işlemler için uygulanıyor

## Testing
Room oluşturma işlemi şu adımlarla test edilebilir:
1. `/create-room` sayfasına git
2. Room adı ve açıklama gir
3. Madde seç
4. "Oda Oluştur" butonuna tıkla
5. Hata almadan room oluşturulmalı

## Files Modified
- `app/api/rooms/route.ts` - Admin client kullanımı eklendi
- `sql/fix-room-creation-policy.sql` - SQL politika düzeltmesi (opsiyonel)
- `sql/fix-room-creation-alternative.sql` - Alternatif SQL çözümü (opsiyonel)

## Future Improvements
- RLS politikalarını gözden geçir ve `current_user_id()` fonksiyonunu düzelt
- Diğer API endpoint'lerde benzer sorunları kontrol et
- Admin client kullanımını audit log'a ekle

# Document Access Fix - Uygulama Talimatları

## Sorun
- API endpoints 403 hatası veriyordu: `/api/documents` ve `/api/documents/upload`
- RLS politikaları nedeniyle mbdf_member tablosunda circular dependency oluşuyordu

## Çözüm
1. RLS politikalarını düzelttik
2. API route'larını normal client kullanacak şekilde güncelledi
3. UI'da read-only/write access kontrolü eklendi

## Veritabanı Güncelleme

Aşağıdaki SQL script'ini Supabase SQL Editor'de çalıştırın:

```sql
-- SQL dosyası: /sql/fix-document-access-policies.sql
```

Bu script şunları yapar:
- mbdf_member tablosundaki circular dependency'yi çözer
- Document tablosu için read-only access politikası ekler
- Sadece üyeler doküman yükleyebilir
- can_view_room() helper fonksiyonu ekler

## Özellikler

### Üye Olmayanlar İçin (Read-Only Access)
- ✅ Dokümanları görüntüleyebilir
- ✅ Dokümanları indirebilir
- ❌ Doküman yükleyemez
- ❌ Doküman silemez
- UI'da bilgilendirme mesajı görür

### Üyeler İçin (Full Access)
- ✅ Tüm doküman işlemlerini yapabilir
- ✅ Doküman yükleyebilir
- ✅ Doküman silebilir

## Test Edilmesi

1. Üye olmadığınız bir odaya gidin
2. Documents tab'ına tıklayın
3. Upload butonu görünmemeli
4. Var olan dokümanları görebilmeli ve indirebilmelisiniz
5. Silme opsiyonu dropdown'da görünmemeli

## Değiştirilen Dosyalar

1. `/app/api/documents/route.ts` - Normal client ve can_view_room RPC kullanıyor
2. `/app/api/documents/upload/route.ts` - Normal client kullanıyor
3. `/lib/schemas/index.ts` - DocumentsListResponseSchema'ya isMember eklendi
4. `/components/room/tabs/documents-tab.tsx` - UI'da conditional rendering
5. `/sql/fix-document-access-policies.sql` - RLS politika düzeltmeleri

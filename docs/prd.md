# CheckDay - Ürün Gereksinim Dokümanı (PRD)

## Proje Özeti
CheckDay, kullanıcıların plan oluşturup paylaşabileceği, etkinliklere katılabileceği ve sosyal bir takvim yönetimi platformudur. Kullanıcılar planları keşfedebilir, kendi takvimlerine ekleyebilir ve plan odalarında etkileşimde bulunabilir. Ayrıca yapay zeka destekli öneriler sunan bir asistan içerir.

## Teknoloji Yığını
- **Frontend**: React.js, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Veritabanı**: MongoDB
- **Kimlik Doğrulama**: JWT, Google OAuth
- **Depolama**: Cloudinary (sıkıştırılmış görsel depolama)
- **Yapay Zeka**: OpenAI API

## Kullanıcı Hikayeleri

### Kimlik Doğrulama ve Kullanıcı Yönetimi
- Kullanıcı kayıt olabilir (e-posta ve şifre)
- Kullanıcı Google hesabı ile giriş yapabilir
- Kullanıcı e-posta onayı alabilir
- Kullanıcı çıkış yapabilir
- Kullanıcı profilini görüntüleyebilir ve düzenleyebilir

### Profil Yönetimi
- Kullanıcı ad-soyad, e-posta, kullanıcı adı bilgilerini düzenleyebilir
- Kullanıcı bakiye hareketlerini görüntüleyebilir
- Kullanıcı profil ayarlarını değiştirebilir

### Takvim İşlevleri
- Kullanıcı takvimindeki planları görüntüleyebilir
- Kullanıcı takvimden plan kaldırabilir
- Kullanıcı plan odalarına erişebilir
- Kullanıcı plan detaylarını görüntüleyebilir

### Plan Keşfetme
- Kullanıcı oluşturulmuş tüm planları görüntüleyebilir
- Kullanıcı planları beğenebilir ve kaydedebilir
- Kullanıcı planları takvime ekleyebilir
- Kullanıcı planları başkalarıyla paylaşabilir

### Plan Oluşturma
- Kullanıcı yeni plan oluşturabilir
- Plan için fotoğraf, başlık, açıklama, tarih-saat, konum bilgileri ekleyebilir
- Kullanıcı ücretsiz veya ücretli plan oluşturabilir
- Plan lideri diğer liderleri davet edebilir
- Plan iptal kurallarını belirleyebilir

### Plan Yönetimi
- Plan lideri tüm katılımcıları görebilir
- Plan lideri katılımcı düzenleyebilir
- Katılımcılar birbirini göremez (sadece mesaj atarsa görünür)
- İptal olan planlarda ücretler iade edilir

### Kaydedilenler
- Kullanıcı kaydettiği planları görüntüleyebilir
- Kullanıcı kaydedilen planları takvime ekleyebilir
- Kullanıcı kaydedilen planları beğenebilir

### Ana Sayfa
- Kullanıcı geri sayım aracını görüntüleyebilir
- CheckDay AI hakkında bilgilere erişebilir

### AI Check Menüsü
- Kullanıcı AI asistanla sohbet edebilir
- AI, kullanıcının günlük hayatı için öneriler sunabilir
- AI, otomatik plan oluşturabilir
- Kullanıcı AI'ya bilgi besleyebilir
- Kullanıcı AI belleğini temizleyebilir

### Admin Paneli
- Admin geri sayım tarihini düzenleyebilir
- Admin açılan planları görüntüleyebilir
- Admin plan odalarını yönetebilir
- Admin kullanıcıları listeleyebilir, düzenleyebilir, silebilir
- Admin kullanıcı bakiyelerini yönetebilir
- Admin AI aracını kontrol edebilir ve geliştirebilir

## Sayfa Yapısı ve Özellikleri

### Genel Tasarım
- Responsive tasarım (mobil öncelikli)
- Instagram benzeri mobil alt menü
- Temiz ve modern arayüz
- Tailwind CSS bileşenleri

### Ana Sayfa
- Geri sayım aracı
- CheckDay AI tanıtımı
- Popüler planlar bölümü
- Hızlı erişim bağlantıları

### Kimlik Doğrulama Sayfaları
- Kayıt ol
- Giriş yap
- Google ile giriş yap
- Şifremi unuttum

### Profil Sayfası
- Kullanıcı bilgileri (ad, soyad, e-posta, kullanıcı adı)
- Bakiye hareketleri
- Ayarlar bölümü
- Çıkış yap butonu

### Takvim Sayfası
- Aylık/haftalık/günlük görünüm
- Plan detaylarına erişim
- Plan kaldırma seçeneği

### Planlar Sayfası
- Instagram tarzı post görünümü
- Plan kartları (fotoğraf, başlık, açıklama, tarih)
- Beğenme, kaydetme, paylaşma butonları
- Takvime ekle butonu
- Lider ve katılımcı sayıları

### Plan Oluştur Sayfası
- Fotoğraf yükleme alanı
- Başlık ve açıklama metin alanları
- Tarih ve saat seçicisi
- Konum veya online seçeneği
- Ücret belirleme seçeneği
- İptal kuralları belirleme
- Lider davet etme seçeneği

### Plan Odası Sayfası
- Plan detayları
- Sohbet alanı
- Katılımcı listesi (liderlere özel)
- Plan düzenleme seçenekleri (liderlere özel)

### Kaydedilenler Sayfası
- Kaydedilen planların listesi
- Takvime ekle butonu
- Beğenme butonu

### AI Check Sayfası
- Sohbet arayüzü
- AI besle butonu
- Bellek temizleme seçeneği
- Otomatik plan önerileri
- Etkinlik önerileri

### Admin Panel
- Geri sayım yönetimi
- Plan listesi ve yönetimi
- Kullanıcı yönetimi
- Bakiye yönetimi
- AI yönetimi

## Veritabanı Modelleri

### Kullanıcı Modeli
- _id: ObjectId
- username: String (benzersiz)
- email: String (benzersiz)
- password: String (hash)
- firstName: String
- lastName: String
- isVerified: Boolean
- profilePicture: String (URL)
- balance: Number
- createdAt: Date
- updatedAt: Date
- role: String (user/admin)

### Plan Modeli
- _id: ObjectId
- title: String
- description: String
- imageUrl: String
- startDate: Date
- endDate: Date
- location: String
- isOnline: Boolean
- price: Number
- isFree: Boolean
- cancelationPolicy: String
- creator: ObjectId (User)
- leaders: [ObjectId] (User array)
- participants: [ObjectId] (User array)
- likes: [ObjectId] (User array)
- saves: [ObjectId] (User array)
- createdAt: Date
- updatedAt: Date
- isActive: Boolean

### Mesaj Modeli
- _id: ObjectId
- planId: ObjectId
- userId: ObjectId
- content: String
- createdAt: Date

### Bakiye İşlemi Modeli
- _id: ObjectId
- userId: ObjectId
- amount: Number
- type: String (deposit/withdrawal/refund)
- description: String
- planId: ObjectId (isteğe bağlı)
- createdAt: Date

### AI Bellek Modeli
- _id: ObjectId
- userId: ObjectId
- preferences: Object
- lastInteraction: Date
- createdAt: Date

## API Endpoint'leri

### Kimlik Doğrulama
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/google
- GET /api/auth/verify/:token
- POST /api/auth/forgot-password
- POST /api/auth/reset-password

### Kullanıcı
- GET /api/users/profile
- PUT /api/users/profile
- GET /api/users/transactions
- GET /api/users/:username

### Plan
- POST /api/plans
- GET /api/plans
- GET /api/plans/:id
- PUT /api/plans/:id
- DELETE /api/plans/:id
- POST /api/plans/:id/join
- POST /api/plans/:id/leave
- POST /api/plans/:id/like
- POST /api/plans/:id/save
- POST /api/plans/:id/invite

### Takvim
- GET /api/calendar
- POST /api/calendar/add/:planId
- DELETE /api/calendar/remove/:planId

### Mesaj
- POST /api/messages
- GET /api/messages/plan/:planId

### AI
- POST /api/ai/chat
- POST /api/ai/preferences
- DELETE /api/ai/memory

### Admin
- GET /api/admin/users
- PUT /api/admin/users/:id
- DELETE /api/admin/users/:id
- GET /api/admin/plans
- PUT /api/admin/plans/:id
- POST /api/admin/countdown
- GET /api/admin/stats

## Uygulanacak Adımlar
1. Proje yapısı oluşturma
2. MongoDB bağlantısı kurma
3. Kullanıcı kimlik doğrulama sistemi
4. Plan oluşturma ve yönetim özellikleri
5. Takvim entegrasyonu
6. Plan odası ve mesajlaşma
7. AI asistan entegrasyonu
8. Admin paneli
9. Ön uç tasarım ve responsive yapı
10. Test ve iyileştirmeler

## Öncelikli Özellikler
1. Kullanıcı kimlik doğrulama
2. Plan oluşturma ve görüntüleme
3. Takvim entegrasyonu
4. Plan odası
5. AI asistan

## Zaman Çizelgesi
- 1. Hafta: Proje kurulumu, kimlik doğrulama ve temel sayfa yapısı
- 2. Hafta: Plan oluşturma, görüntüleme ve takvim entegrasyonu
- 3. Hafta: Plan odası, mesajlaşma ve kullanıcı etkileşimleri
- 4. Hafta: AI asistan entegrasyonu
- 5. Hafta: Admin paneli ve son rötuşlar 
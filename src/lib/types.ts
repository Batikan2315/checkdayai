import { ObjectId } from "mongoose";
import { DefaultSession } from "next-auth";

// =============================================
// KULLANIcI BİLGİLERİ İLE İLGİLİ TİPLER
// =============================================

/**
 * IUser - Kullanıcı veri modeli
 * 
 * AMAÇ: Frontend'de ve API'lerde kullanıcı verilerini temsil eder.
 * 
 * ÖZELLİKLER:
 * - NextAuth ile entegrasyon: id, provider, needsSetup, image
 * - Mongoose ile entegrasyon: _id, ve diğer veritabanı alanları
 * 
 * KULLANIM:
 * 1. NextAuth veya Mongoose ID kullanırken:
 *    const userId = user.id || user._id?.toString();
 * 
 * 2. Google giriş kurulumu kontrolü:
 *    if ((user as any).needsSetup) { ... }
 */
export interface IUser {
  // Kimlik bilgileri
  _id?: string | any;     // MongoDB ID'si
  id?: string;            // NextAuth session.user.id
  
  // Temel kullanıcı bilgileri
  username: string;       // Kullanıcı adı (@username)
  email: string;          // E-posta adresi
  firstName?: string;     // Ad
  lastName?: string;      // Soyad
  
  // Profil ve görünüm
  profilePicture?: string; // Profil resmi URL'si
  image?: string;          // NextAuth profil resmi
  
  // Hesap bilgileri
  password?: string;      // Şifre (güvenlik için sadece gerekli durumlarda)
  role?: string;          // Kullanıcı rolü (user, admin)
  isVerified?: boolean;   // E-posta doğrulaması yapıldı mı
  isAdmin?: boolean;      // Admin yetkisi var mı
  balance?: number;       // Bakiye miktarı
  
  // OAuth ve entegrasyonlar
  provider?: string;      // Giriş yöntemi (google, email)
  oauth_id?: string;      // OAuth sağlayıcı kimliği
  needsSetup?: boolean;   // Hesap kurulumu gerekli mi
  
  // Zaman damgaları
  createdAt?: Date;       // Hesap oluşturma tarihi
  updatedAt?: Date;       // Son güncelleme tarihi

  // Metotlar
  comparePassword?(enteredPassword: string): Promise<boolean>;  // Şifre karşılaştırma
  generateUsername?(): Promise<void>;                           // Otomatik kullanıcı adı oluşturma
}

// =============================================
// PLAN VE ETKİNLİK İLE İLGİLİ TİPLER
// =============================================

/**
 * IPlan - Plan/Etkinlik veri modeli
 * 
 * AMAÇ: CheckDay uygulamasının ana veri tiplerinden biri olan planları temsil eder.
 * 
 * KULLANIM:
 * - Frontend'de plan kartları ve detay sayfaları için
 * - Plan oluşturma ve düzenleme formları için
 * - API isteklerinde plan verilerini iletmek için
 */
export interface IPlan {
  // Kimlik ve temel bilgiler
  _id?: ObjectId;                       // MongoDB ID
  title: string;                        // Plan başlığı
  description: string;                  // Plan açıklaması
  imageUrl?: string;                    // Kapak görseli
  
  // Zaman ve konum
  startDate: Date;                      // Başlangıç tarihi
  endDate: Date;                        // Bitiş tarihi
  location?: string;                    // Fiziksel konum
  isOnline: boolean;                    // Online mı
  
  // Ücretlendirme
  price: number;                        // Fiyat
  isFree: boolean;                      // Ücretsiz mi
  cancelationPolicy?: string;           // İptal politikası
  
  // İlişkiler
  creator: ObjectId | IUser;            // Oluşturan kullanıcı
  leaders?: ObjectId[] | IUser[];       // Yöneticiler/Liderler
  participants?: ObjectId[] | IUser[];  // Katılımcılar
  calendarUsers?: ObjectId[] | IUser[]; // Takvime ekleyenler
  likes?: ObjectId[] | IUser[];         // Beğenenler
  saves?: ObjectId[] | IUser[];         // Kaydedenler
  
  // Durum
  isActive: boolean;                    // Aktif mi
  maxParticipants?: number;             // Maksimum katılımcı sayısı
  oauth_creator_id?: string;            // Google kullanıcısı ID
  
  // Zaman damgaları
  createdAt?: Date;                     // Oluşturma tarihi
  updatedAt?: Date;                     // Güncelleme tarihi
  
  // İstatistikler (sanal alanlar)
  likeCount?: number;                   // Beğeni sayısı
  saveCount?: number;                   // Kaydetme sayısı
  participantCount?: number;            // Katılımcı sayısı
  leaderCount?: number;                 // Lider sayısı
}

// =============================================
// İLETİŞİM VE BİLDİRİM TİPLERİ
// =============================================

/**
 * IMessage - Mesaj veri modeli
 * 
 * AMAÇ: Plan içi mesajlaşma sisteminde kullanılan mesajları temsil eder.
 */
export interface IMessage {
  _id?: ObjectId;                  // MongoDB ID
  planId: ObjectId | IPlan;        // Mesajın ait olduğu plan
  userId: ObjectId | IUser;        // Mesajı gönderen kullanıcı
  content: string;                 // Mesaj içeriği
  createdAt?: Date;                // Gönderilme tarihi
}

// =============================================
// FİNANSAL İŞLEMLER
// =============================================

/**
 * ITransaction - Finansal işlem veri modeli
 * 
 * AMAÇ: Bakiye yükleme, harcama ve iadeler gibi finansal işlemleri kaydeder.
 */
export interface ITransaction {
  _id?: ObjectId;                  // MongoDB ID
  userId: ObjectId | IUser;        // İşlemi yapan kullanıcı
  amount: number;                  // İşlem tutarı
  type: "deposit" | "withdrawal" | "refund"; // İşlem tipi
  description?: string;            // İşlem açıklaması
  planId?: ObjectId | IPlan;       // İlişkili plan (varsa)
  createdAt?: Date;                // İşlem tarihi
}

// =============================================
// DİĞER YARDIMCI TİPLER
// =============================================

/**
 * IAIMemory - AI/Yapay Zeka tercihleri veri modeli
 * 
 * AMAÇ: Kullanıcının AI tercihlerini saklar
 */
export interface IAIMemory {
  _id?: ObjectId;                  // MongoDB ID
  userId: ObjectId | IUser;        // Kullanıcı
  preferences: Record<string, any>; // Tercihler
  lastInteraction: Date;           // Son etkileşim
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * ICalendarEntry - Takvim kaydı
 * 
 * AMAÇ: Kullanıcıların takvimine eklenen planları temsil eder
 */
export interface ICalendarEntry {
  planId: ObjectId | IPlan;        // Plan referansı
  userId: ObjectId | IUser;        // Kullanıcı referansı
}

/**
 * UserSession - NextAuth session veri modeli
 * 
 * AMAÇ: NextAuth ile frontend arasında session verilerini taşır
 */
export interface UserSession {
  id: string;                      // Kullanıcı ID'si
  email: string;                   // E-posta adresi
  isAdmin?: boolean;               // Admin mi?
  username?: string;               // Kullanıcı adı
  firstName?: string;              // Ad
  lastName?: string;               // Soyad
  provider?: string;               // Giriş yöntemi
} 
import { v2 as cloudinary } from "cloudinary";

// Cloudinary yapılandırması
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "demo",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
  secure: true,
});

// Profil resmi için optimizasyon ayarları
export const PROFILE_IMAGE_OPTIONS = {
  folder: "checkday/profiles",
  transformation: [
    { width: 200, height: 200, crop: "fill", gravity: "face" }, // Yüz odaklı kırpma
    { quality: "auto:eco", fetch_format: "auto" }, // Otomatik format ve düşük kalite
  ],
  format: "webp", // WebP formatında kaydetme
};

// Plan resmi için optimizasyon ayarları
export const PLAN_IMAGE_OPTIONS = {
  folder: "checkday/plans",
  transformation: [
    { width: 800, crop: "limit" }, // Maksimum genişlik
    { quality: "auto:eco", fetch_format: "auto" }, // Otomatik format ve düşük kalite
  ],
  format: "webp", // WebP formatında kaydetme
};

// Görseli Cloudinary'ye yükle
export const uploadImage = async (
  file: string, // Base64 formatında resim verisi
  folder = "checkday/plans",
  options = {}
): Promise<string> => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder,
      transformation: [
        { width: 800, crop: "limit" }, // Maksimum genişlik
        { quality: "auto:eco" }, // Düşük kalite optimizasyonu
      ],
      format: "webp", // WebP formatında kaydetme
      ...options,
    });

    return result.secure_url;
  } catch (error) {
    console.error("Görsel yükleme hatası:", error);
    throw error;
  }
};

// Profil resmini yükle (optimize edilmiş)
export const uploadProfileImage = async (
  file: string, // Base64 formatında resim verisi
  userId: string,
  oldImageUrl?: string | null
): Promise<string> => {
  try {
    // Eski resmin public_id'sini bul (varsa)
    if (oldImageUrl && oldImageUrl.includes("cloudinary.com") && !oldImageUrl.includes("default")) {
      try {
        const publicId = extractPublicIdFromUrl(oldImageUrl);
        if (publicId) {
          // Eski resmi silme işlemini async olarak başlat, bekleme
          deleteImage(publicId).catch(err => 
            console.error("Eski profil resmi silinemedi:", err)
          );
        }
      } catch (error) {
        console.error("Eski resim public_id çıkarılamadı:", error);
      }
    }

    // Yeni resmi yükle - optimize ayarlarla
    const result = await cloudinary.uploader.upload(file, {
      ...PROFILE_IMAGE_OPTIONS,
      public_id: `user_${userId}`, // Kullanıcı ID'si ile isimlendir - üzerine yazma olacak
      overwrite: true, // Aynı isimde varsa üzerine yaz
    });

    return result.secure_url;
  } catch (error) {
    console.error("Profil resmi yükleme hatası:", error);
    throw error;
  }
};

// Plan resmini yükle (optimize edilmiş)
export const uploadPlanImage = async (
  file: string, // Base64 formatında resim verisi
  planId: string,
  oldImageUrl?: string | null
): Promise<string> => {
  try {
    // Eski resmin public_id'sini bul (varsa)
    if (oldImageUrl && oldImageUrl.includes("cloudinary.com") && !oldImageUrl.includes("default")) {
      try {
        const publicId = extractPublicIdFromUrl(oldImageUrl);
        if (publicId) {
          // Eski resmi silme işlemini async olarak başlat, bekleme
          deleteImage(publicId).catch(err => 
            console.error("Eski plan resmi silinemedi:", err)
          );
        }
      } catch (error) {
        console.error("Eski resim public_id çıkarılamadı:", error);
      }
    }

    // Yeni resmi yükle - optimize ayarlarla
    const result = await cloudinary.uploader.upload(file, {
      ...PLAN_IMAGE_OPTIONS,
      public_id: `plan_${planId}`, // Plan ID'si ile isimlendir - üzerine yazma olacak
      overwrite: true, // Aynı isimde varsa üzerine yaz
    });

    return result.secure_url;
  } catch (error) {
    console.error("Plan resmi yükleme hatası:", error);
    throw error;
  }
};

// URL'den public_id çıkarma yardımcı fonksiyonu
export const extractPublicIdFromUrl = (url: string): string | null => {
  try {
    // URL'yi parçalara ayır
    const urlParts = url.split('/');
    
    // upload/ sonrası ve .extension öncesi bölümü bul
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    
    if (uploadIndex === -1) return null;
    
    // upload/ sonrası bölümler
    const pathParts = urlParts.slice(uploadIndex + 1);
    
    // Son parçadaki dosya uzantısını kaldır
    const lastPart = pathParts[pathParts.length - 1];
    const fileNameWithoutExt = lastPart.split('.')[0];
    
    pathParts[pathParts.length - 1] = fileNameWithoutExt;
    
    // public_id'yi birleştir
    return pathParts.join('/');
  } catch (error) {
    console.error("Public ID çıkarma hatası:", error);
    return null;
  }
};

// Resimlerin önbelleklenmesini önlemek için URL'ye zaman damgası ekleyen yardımcı fonksiyon
export const addCacheBuster = (url: string): string => {
  if (!url) return url;
  
  // Zaten query parametresi varsa ? yerine & ekle
  const separator = url.includes('?') ? '&' : '?';
  
  // Güncel timestamp ekle, tarayıcı her seferinde yeni resmi yüklesin
  return `${url}${separator}t=${Date.now()}`;
};

// Hem optimize et, hem önbellekleme sorunlarını çöz
export const optimizeImageUrl = (url: string, width: number = 300): string => {
  if (!url || !url.includes('cloudinary.com')) return addCacheBuster(url);
  
  // Cloudinary URL'ini dönüştür (otomatik optimize)
  try {
    // URL'in bölümlerini al
    const urlParts = url.split('/upload/');
    if (urlParts.length !== 2) return addCacheBuster(url);
    
    // Transformasyon parametrelerini ekle
    const optimizedUrl = `${urlParts[0]}/upload/c_fill,w_${width},q_auto:eco,f_auto/${urlParts[1]}`;
    
    // Önbellek sorunlarını önlemek için zaman damgası ekle
    return addCacheBuster(optimizedUrl);
  } catch (error) {
    console.error('URL optimize edilemedi:', error);
    return addCacheBuster(url);
  }
};

// Görseli Cloudinary'den sil
export const deleteImage = async (publicId: string): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (error) {
    console.error("Görsel silme hatası:", error);
    return false;
  }
}; 
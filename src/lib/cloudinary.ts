import { v2 as cloudinary } from "cloudinary";

// Cloudinary yapılandırması
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "demo",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
  secure: true,
});

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
        { width: 1200, crop: "limit" }, // Maksimum genişlik
        { quality: "auto:good" }, // Otomatik kalite optimizasyonu
      ],
      ...options,
    });

    return result.secure_url;
  } catch (error) {
    console.error("Görsel yükleme hatası:", error);
    throw error;
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

// Görsel URL'sinden public_id elde et
export const getPublicIdFromUrl = (url: string): string => {
  // Örnek URL: https://res.cloudinary.com/demo/image/upload/v1234567890/checkday/plans/abcdef.jpg
  if (!url || !url.includes("cloudinary") || !url.includes("/upload/")) {
    return "";
  }

  try {
    // URL'i parçalara ayır
    const parts = url.split("/upload/");
    // İkinci parçadan v123456/ kısmını at ve .uzantı kısmını da at
    const filename = parts[1].split("/").slice(1).join("/").split(".")[0];
    return `${filename}`;
  } catch (error) {
    console.error("Cloudinary public_id çıkarma hatası:", error);
    return "";
  }
}; 
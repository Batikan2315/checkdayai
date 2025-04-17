import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';

// Cloudinary yapılandırması
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * URL'den görüntüyü indir ve base64 formatına dönüştür
 * @param imageUrl - İndirilecek görüntü URL'si
 * @returns Görüntünün base64 formatı veya hata durumunda null
 */
export const fetchImageAsBase64 = async (imageUrl: string): Promise<string | null> => {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
    });
    
    const buffer = Buffer.from(response.data, 'binary');
    const base64Image = `data:${response.headers['content-type']};base64,${buffer.toString('base64')}`;
    
    return base64Image;
  } catch (error) {
    console.error('Görüntü indirme hatası:', error);
    return null;
  }
};

/**
 * Base64 formatındaki görüntüyü Cloudinary'ye yükle
 * @param base64Image - Base64 formatındaki görüntü
 * @param userId - Kullanıcı ID'si (dosya adı için kullanılır)
 * @returns Cloudinary URL'si veya hata durumunda null
 */
export const uploadProfileImage = async (base64Image: string, userId: string): Promise<string | null> => {
  try {
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: 'profile_pictures',
      public_id: `user_${userId}`,
      overwrite: true,
      resource_type: 'image',
      transformation: [
        { width: 250, height: 250, crop: 'fill', gravity: 'face' }
      ]
    });
    
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary yükleme hatası:', error);
    return null;
  }
};

/**
 * Kullanıcı profil resmini Cloudinary'ye yükle
 * @param file - Yüklenecek dosya (form verisi)
 * @param userId - Kullanıcı ID'si
 * @returns Cloudinary URL'si veya hata durumunda null
 */
export const uploadProfileImageFromForm = async (file: File, userId: string): Promise<string | null> => {
  try {
    // Dosyayı base64'e dönüştür
    const base64 = await convertFileToBase64(file);
    
    if (!base64) {
      throw new Error('Dosya base64\'e dönüştürülemedi');
    }
    
    // Cloudinary'ye yükle
    return await uploadProfileImage(base64, userId);
  } catch (error) {
    console.error('Form dosya yükleme hatası:', error);
    return null;
  }
};

/**
 * Dosyayı base64 formatına dönüştür
 * @param file - Dönüştürülecek dosya
 * @returns Base64 formatındaki dosya veya hata durumunda null
 */
const convertFileToBase64 = (file: File): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => {
      console.error('Dosya dönüştürme hatası:', error);
      reject(null);
    };
  });
};

/**
 * URL'deki görüntünün varlığını kontrol eder
 * @param imageUrl Kontrol edilecek görüntü URL'si
 * @returns Görüntü erişilebilir ise true, değilse false
 */
export async function isImageValid(imageUrl: string): Promise<boolean> {
  try {
    const response = await axios.head(imageUrl);
    return response.status === 200 && response.headers['content-type']?.startsWith('image/');
  } catch (error) {
    return false;
  }
}

/**
 * Plan kapak resmini Cloudinary'ye yükler
 * @param base64Image Base64 formatında resim
 * @param planId Plan ID'si
 * @returns Yüklenen resmin URL'si
 */
export const uploadPlanCoverImage = async (
  base64Image: string,
  planId: string
): Promise<string> => {
  try {
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: 'plan-covers',
      public_id: `plan-${planId}`,
      overwrite: true,
      transformation: [
        { width: 1200, height: 630, crop: 'fill' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });
    
    return result.secure_url;
  } catch (error) {
    console.error('Plan kapak resmi yüklenemedi:', error);
    throw new Error('Plan kapak resmi yüklenemedi');
  }
}; 
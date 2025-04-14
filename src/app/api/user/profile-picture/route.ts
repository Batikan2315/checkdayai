import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { uploadProfileImage } from '@/lib/cloudinary';

// Hız için maksimum dosya boyutu
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    // MongoDB bağlantısını kur
    await connectDB();
    
    // Multipart form verisini işle
    const data = await req.formData();
    const userId = data.get('userId') as string;
    const file = data.get('profilePicture') as File;
    
    if (!userId || !file) {
      return NextResponse.json({ error: 'Kullanıcı ID ve profil resmi gereklidir' }, { status: 400 });
    }
    
    // Dosya boyutu kontrolü
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'Dosya boyutu çok büyük, maksimum 5MB olabilir. Lütfen daha küçük bir resim yükleyin veya mevcut resminizi küçültün.' 
      }, { status: 400 });
    }
    
    // Dosya tipi kontrolü
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ 
        error: 'Sadece resim dosyaları yüklenebilir' 
      }, { status: 400 });
    }
    
    // Logları sadece geliştirme ortamında göster
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Profil resmi güncellemesi: Kullanıcı ID=${userId}`);
    }
    
    // Dosyayı buffer'a dönüştür
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Base64 formatına dönüştür
    const base64String = buffer.toString('base64');
    const base64File = `data:${file.type};base64,${base64String}`;
    
    // Kullanıcıyı bul - önce mevcut profil resmini alalım
    let user = null;
    
    // MongoDB ObjectId mi kontrolü
    const isMongoObjectId = userId.length === 24 && /^[0-9a-fA-F]{24}$/.test(userId);
    
    // Kullanıcıyı bul
    if (isMongoObjectId) {
      user = await User.findById(userId);
    }
    
    if (!user) {
      user = await User.findOne({ oauth_id: userId });
    }
    
    if (!user) {
      user = await User.findOne({ $or: [{ _id: userId }, { oauth_id: userId }] });
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }
    
    // Mevcut profil resmi
    const oldProfilePicture = user.profilePicture;
    
    // Cloudinary'ye yükle - optimize ayarlarla ve eski resmi silerek
    const secureUrl = await uploadProfileImage(
      base64File,
      user._id.toString(),
      oldProfilePicture
    );
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Cloudinary'ye resim yüklendi: ${secureUrl}`);
    }
    
    // Kullanıcı profil resmini güncelle
    user.profilePicture = secureUrl + `?t=${Date.now()}`;
    await user.save();
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Profil resmi güncellendi: Kullanıcı ${user.username}`);
    }
    
    return NextResponse.json({
      success: true,
      profilePicture: secureUrl
    });
    
  } catch (error: any) {
    console.error('Profil resmi yükleme hatası:', error);
    return NextResponse.json({ error: error.message || 'Bir hata oluştu' }, { status: 500 });
  }
} 
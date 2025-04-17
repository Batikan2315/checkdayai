import { NextResponse } from 'next/server';
import { connect } from '@/lib/dbConnect';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { uploadProfileImage } from '@/lib/imageUtils';
import { IUser } from '@/lib/types';

// Tip tanımlamaları
interface RouteParams {
  params: {
    id: string;
  }
}

// Mongoose model dönüş tipi
interface UserDoc {
  _id: any;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  profilePicture?: string;
  followers?: any[];
  following?: any[];
  createdAt?: Date;
  [key: string]: any; // Diğer olası alanlar
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    await connect();

    // Mongoose tipi
    const user = await User.findOne({ 
      $or: [
        { _id: params.id },
        { username: params.id }
      ]
    }).select('username email firstName lastName bio profilePicture followers following createdAt').lean() as unknown as UserDoc;

    if (!user) {
      return NextResponse.json(
        { message: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    // Hassas veriler için kontroller
    if (session?.user.id !== user._id?.toString() && !session?.user.isAdmin) {
      // Public profilde sadece belirli bilgileri göster
      const publicProfile = {
        _id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        profilePicture: user.profilePicture,
        followers: user.followers?.length || 0,
        following: user.following?.length || 0,
        createdAt: user.createdAt,
      };
      
      return NextResponse.json(publicProfile);
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Kullanıcı profili getirilirken hata:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}

// @ts-ignore: Geçici olarak tip kontrolünü es geçiyoruz
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    // Oturum yoksa veya kullanıcı kimliği eşleşmiyorsa hata döndür
    if (!session) {
      return NextResponse.json(
        { message: 'Kimlik doğrulama gerekli' },
        { status: 401 }
      );
    }
    
    // Kullanıcı kendi profilini veya admin başka profili güncelleyebilir
    if (session.user.id !== params.id && !session.user.isAdmin) {
      return NextResponse.json(
        { message: 'Bu işlem için yetkiniz yok' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    // Tip güvenli güncelleme verisi
    const updateData: Record<string, any> = {};

    // Form verilerini işle - Array.from kullanarak TypeScript hatasını önlüyoruz
    for (const [key, value] of Array.from(formData.entries())) {
      if (key === 'profilePicture' && value instanceof File) {
        if (value.size > 0) {
          // Profil resmini Cloudinary'ye yükle
          const cloudinaryUrl = await uploadProfileImageFromForm(value, params.id);
          if (cloudinaryUrl) {
            updateData.profilePicture = cloudinaryUrl;
            updateData.image = cloudinaryUrl; // NextAuth image alanı için de güncelle
          }
        }
      } else if (key !== 'profilePicture') {
        // Diğer form alanlarını güncelle
        updateData[key] = value;
      }
    }

    await connect();
    
    // Kullanıcıyı güncelle
    const updatedUser = await User.findByIdAndUpdate(
      params.id,
      { $set: updateData },
      { new: true }
    ).select('username email firstName lastName bio profilePicture') as unknown as UserDoc;

    if (!updatedUser) {
      return NextResponse.json(
        { message: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Kullanıcı güncellenirken hata:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}

// Profil resmini form verilerinden almak için yardımcı fonksiyon
async function uploadProfileImageFromForm(file: File, userId: string): Promise<string | null> {
  try {
    // Dosyayı önbelleğe al
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Base64'e dönüştür
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;
    
    // Cloudinary'ye yükle
    return await uploadProfileImage(base64, userId);
  } catch (error) {
    console.error('Profil resmi işlenirken hata:', error);
    return null;
  }
}

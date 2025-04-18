import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Plan from '@/models/Plan';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Kullanıcı oturumunu kontrol et
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Bu işlem için giriş yapmanız gerekiyor' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id || (session.user as any)._id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Kullanıcı kimliği bulunamadı' },
        { status: 401 }
      );
    }
    
    // Kullanıcı bilgilerini veritabanından al
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }
    
    const data = await request.json();
    
    console.log('Gönderilen veri:', data);
    
    // Plan için gerekli alanları kontrol et
    if (!data.title) {
      return NextResponse.json(
        { error: 'Plan başlığı gereklidir' },
        { status: 400 }
      );
    }
    
    // Plan verisini oluştur
    const planData = {
      ...data,
      creator: userId, // Kullanıcı ID'sini ekle
      creatorInfo: {
        _id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        email: user.email
      }, // Creator bilgilerini ekliyoruz
      participants: data.participants || [userId], // Oluşturan kullanıcıyı otomatik katılımcı olarak ekle
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Planı oluştur
    const plan = await Plan.create(planData);
    
    // Oluşturulan planı kullanıcı bilgileriyle birlikte döndür
    const populatedPlan = await Plan.findById(plan._id).populate('creator', 'username firstName lastName name profilePicture');
    
    return NextResponse.json(populatedPlan);
  } catch (error: any) {
    console.error('Plan oluşturma hatası:', error);
    return NextResponse.json(
      { error: error.message || 'Plan oluşturulurken bir hata oluştu' },
      { status: 500 }
    );
  }
} 
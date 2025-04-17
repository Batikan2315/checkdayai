import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

// Plan dökümanı tipi
interface PlanDoc {
  _id: any;
  calendarUsers: any[];
  save: () => Promise<any>;
  [key: string]: any;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    // Önbellek önleme
    const headers = new Headers({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    
    // Oturumu kontrol et
    const session = await getServerSession(authOptions);
    
    // Kullanıcı oturum açmamışsa hata döndür
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Oturum açmanız gerekiyor' }, 
        { status: 401, headers }
      );
    }

    // Kullanıcı ID'sini al - birden fazla alandan kontrol et
    const userId = session.user.id || (session.user as any)._id;
    const planId = params.planId;

    if (!userId) {
      return NextResponse.json(
        { error: 'Kullanıcı kimliği bulunamadı' },
        { status: 401, headers }
      );
    }

    if (!planId || !mongoose.Types.ObjectId.isValid(planId)) {
      return NextResponse.json(
        { error: 'Geçersiz plan ID' },
        { status: 400, headers }
      );
    }

    // MongoDB bağlantısı başarısız olursa hata dön
    try {
      await connectDB();
    } catch (dbError) {
      console.error('MongoDB bağlantı hatası:', dbError);
      return NextResponse.json(
        { error: 'Veritabanı bağlantısı kurulamadı' },
        { status: 500, headers }
      );
    }

    // Collection adları ve model kullanımı
    let Plan;
    let User;
    
    try {
      Plan = mongoose.models.Plan || mongoose.model('Plan');
      User = mongoose.models.User || mongoose.model('User');
    } catch (modelError) {
      console.error('Model oluşturma hatası:', modelError);
      return NextResponse.json(
        { error: 'Model oluşturma hatası' },
        { status: 500, headers }
      );
    }

    // Plan var mı kontrol et
    let plan;
    try {
      plan = await Plan.findById(planId) as PlanDoc;
    } catch (findError) {
      console.error('Plan arama hatası:', findError);
      return NextResponse.json(
        { error: 'Plan arama hatası' },
        { status: 500, headers }
      );
    }
    
    if (!plan) {
      return NextResponse.json(
        { error: 'Plan bulunamadı' },
        { status: 404, headers }
      );
    }

    // Plan nesnesi kontrolü
    if (!plan.calendarUsers) {
      plan.calendarUsers = [];
    }

    let user;
    try {
      // Kullanıcıyı farklı ID formatlarıyla arama
      if (mongoose.Types.ObjectId.isValid(userId)) {
        user = await User.findById(userId);
      }
      
      // ID ile bulunamadıysa, email ile ara
      if (!user && session.user.email) {
        user = await User.findOne({ email: session.user.email });
      }
      
      // Hala bulunamadıysa oauth_id ile ara
      if (!user) {
        user = await User.findOne({ oauth_id: userId });
      }
      
      // Son çare olarak googleId ile ara
      if (!user && session.user.email) {
        user = await User.findOne({ email: session.user.email });
      }
    } catch (userFindError) {
      console.error('Kullanıcı arama hatası:', userFindError);
      return NextResponse.json(
        { error: 'Kullanıcı arama hatası' },
        { status: 500, headers }
      );
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404, headers }
      );
    }

    // Kullanıcı zaten takviminde mi kontrol et
    const userMongoId = user._id.toString();
    const isInCalendar = plan.calendarUsers?.some((p: any) => 
      p?.toString() === userMongoId || 
      (p?._id && p._id.toString() === userMongoId)
    );

    if (isInCalendar) {
      return NextResponse.json(
        { message: 'Bu plan zaten takviminizde' },
        { status: 200, headers }
      );
    }

    try {
      // Plana takvim kullanıcısı olarak ekle
      plan.calendarUsers.push(user._id);
      await plan.save();
    } catch (planSaveError) {
      console.error('Plan güncelleme hatası:', planSaveError);
      return NextResponse.json(
        { error: 'Plan güncelleme hatası' },
        { status: 500, headers }
      );
    }

    try {
      // Kullanıcı modeli calendarPlans alanı yoksa oluştur
      if (!user.calendarPlans) {
        user.calendarPlans = [];
      }
      
      // Kullanıcı bilgilerini güncelle
      await User.findByIdAndUpdate(
        user._id,
        { $addToSet: { calendarPlans: new ObjectId(planId) } }
      );
    } catch (userUpdateError) {
      console.error('Kullanıcı güncelleme hatası:', userUpdateError);
      // Kullanıcı güncellemesi başarısız olsa bile devam et
    }

    return NextResponse.json(
      { message: 'Plan takviminize eklendi' },
      { status: 200, headers }
    );
  } catch (error: any) {
    console.error('Takvime ekleme hatası:', error);
    return NextResponse.json(
      { error: error.message || 'Bir hata oluştu' },
      { status: 500 }
    );
  }
} 
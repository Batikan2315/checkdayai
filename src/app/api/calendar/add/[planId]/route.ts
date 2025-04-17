import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import { IPlan } from '@/lib/types';

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

    const userId = session.user.id;
    const planId = params.planId;

    if (!planId || !mongoose.Types.ObjectId.isValid(planId)) {
      return NextResponse.json(
        { error: 'Geçersiz plan ID' },
        { status: 400, headers }
      );
    }

    // Veritabanına bağlan
    await connectDB();

    const Plan = mongoose.model('Plan');
    const User = mongoose.model('User');

    // Plan var mı kontrol et
    const plan = await Plan.findById(planId) as PlanDoc;
    
    if (!plan) {
      return NextResponse.json(
        { error: 'Plan bulunamadı' },
        { status: 404, headers }
      );
    }

    // Kullanıcıyı bul - Önce normal ID ile ara, bulamazsan oauth_id/googleId ile ara
    let user = await User.findById(userId);
    
    if (!user) {
      user = await User.findOne({ oauth_id: userId });
    }
    
    if (!user) {
      user = await User.findOne({ googleId: userId });
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

    // Plana takvim kullanıcısı olarak ekle
    plan.calendarUsers.push(user._id);
    await plan.save();

    // Kullanıcı bilgilerini güncelle
    await User.findByIdAndUpdate(
      user._id,
      { $addToSet: { calendarPlans: new ObjectId(planId) } }
    );

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
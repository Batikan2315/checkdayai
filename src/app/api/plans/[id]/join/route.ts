import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  try {
    // Önbellek önleme
    request.headers.set('Cache-Control', 'no-store');
    
    // Veritabanı bağlantısı
    await connect();
    
    // Plan ID'sini URL'den al
    const planId = params.id;
    
    // Geçerli bir ObjectId kontrolü
    if (!ObjectId.isValid(planId)) {
      return NextResponse.json({ 
        error: 'Invalid plan ID', 
        code: 'INVALID_ID'
      }, { status: 400, headers });
    }

    // Oturumu kontrol et
    const session = await getServerSession(authOptions);
    
    // Kullanıcı oturum açmamışsa hata döndür
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ 
        error: 'You must be logged in to join a plan', 
        code: 'UNAUTHORIZED' 
      }, { status: 401, headers });
    }
    
    const userId = session.user.id;
    
    // Planı bul
    const Plan = mongoose.models.Plan || mongoose.model('Plan', new mongoose.Schema({}));
    const plan = await Plan.findById(planId);
    
    if (!plan) {
      return NextResponse.json({ 
        error: 'Plan not found', 
        code: 'NOT_FOUND' 
      }, { status: 404, headers });
    }
    
    // Plan objesi kontrolü
    if (!plan.participants || !Array.isArray(plan.participants)) {
      return NextResponse.json({ 
        error: 'Invalid plan data structure', 
        code: 'INVALID_PLAN_DATA' 
      }, { status: 500, headers });
    }
    
    // Kullanıcı zaten katılmış mı?
    const isParticipant = plan.participants.some(
      (p: any) => p.toString() === userId
    );
    
    if (isParticipant) {
      return NextResponse.json({ 
        error: 'You have already joined this plan', 
        code: 'ALREADY_JOINED' 
      }, { status: 400, headers });
    }
    
    // Kullanıcıyı katılımcı olarak ekle
    plan.participants.push(userId);
    await plan.save();
    
    // Kullanıcı modelini güncelle
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}));
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { participatingIn: planId } }
    );
    
    return NextResponse.json({ 
      success: true, 
      message: 'Successfully joined the plan' 
    }, { headers });
    
  } catch (error: any) {
    console.error('Error joining plan:', error);
    return NextResponse.json({ 
      error: error.message || 'An error occurred', 
      code: 'UNKNOWN_ERROR' 
    }, { status: 500, headers });
  }
}

// Plandan ayrılma (DELETE metodu)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
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
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: 'Sign in required', code: 'AUTH_REQUIRED' }, 
        { status: 401, headers }
      );
    }

    const userId = session.user.id;

    // Veritabanına bağlan
    try {
      await connect();
    } catch (dbError) {
      console.error('Veritabanı bağlantı hatası:', dbError);
      return NextResponse.json({ 
        error: 'Database connection error', 
        code: 'DB_CONNECTION_ERROR' 
      }, { status: 500, headers });
    }
    
    // URL'den plan ID'sini çıkar
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const planId = segments[segments.length - 2]; // /api/plans/[id]/join formatında

    // Plan ID geçerli mi kontrol et
    if (!ObjectId.isValid(planId)) {
      return NextResponse.json({ 
        error: 'Invalid plan ID',
        code: 'INVALID_ID'
      }, { status: 400, headers });
    }

    // Mongoose bağlantı kontrolü
    const conn = mongoose.connection;
    if (!conn.readyState || conn.readyState !== 1) {
      return NextResponse.json({ 
        error: 'Database connection error', 
        code: 'DB_CONNECTION_ERROR' 
      }, { status: 500, headers });
    }

    // Plan bilgilerini getir
    const plan = await mongoose.model('Plan').findById(planId);

    if (!plan) {
      return NextResponse.json({ 
        error: 'Plan not found',
        code: 'PLAN_NOT_FOUND'
      }, { status: 404, headers });
    }

    // Plan objesi kontrolü
    if (!plan.participants || !Array.isArray(plan.participants)) {
      return NextResponse.json({ 
        error: 'Invalid plan data structure', 
        code: 'INVALID_PLAN_DATA' 
      }, { status: 500, headers });
    }

    // Kullanıcı katılımcı mı kontrol et (güvenli şekilde)
    const isParticipant = Array.isArray(plan.participants) && plan.participants.some((p: any) => {
      if (!p) return false;
      const pId = p._id ? p._id.toString() : p.toString();
      return pId === userId;
    });

    if (!isParticipant) {
      return NextResponse.json({ 
        error: 'You have not joined this plan',
        code: 'NOT_JOINED'
      }, { status: 400, headers });
    }

    try {
      // Kullanıcıyı katılımcılar ve takvim kullanıcıları listesinden çıkar
      plan.participants = Array.isArray(plan.participants) ? plan.participants.filter((p: any) => {
        if (!p) return false;
        const pId = p._id ? p._id.toString() : p.toString();
        return pId !== userId;
      }) : [];
      
      await plan.save();

      // Kullanıcının katıldığı planlar listesinden de çıkar
      try {
        await mongoose.model('User').findByIdAndUpdate(
          userId,
          { $pull: { participatingIn: planId } }
        );
      } catch (userUpdateError) {
        console.error('Kullanıcı planlarından çıkarma hatası:', userUpdateError);
        // Kullanıcıyı güncelleyemedik ama planı güncellediğimiz için işlem kısmen başarılı
        // Kritik bir hata olmadığından akışı kesmiyoruz
      }

      return NextResponse.json({
        message: 'Successfully left the plan',
        success: true
      }, { headers });
    } catch (saveError) {
      console.error('Plan güncelleme hatası:', saveError);
      return NextResponse.json({ 
        error: 'Failed to update plan data', 
        code: 'SAVE_ERROR',
        details: saveError.message
      }, { status: 500, headers });
    }
  } catch (error: any) {
    console.error('Plandan ayrılma hatası:', error);
    return NextResponse.json({ 
      error: error.message || 'An error occurred',
      code: 'UNKNOWN_ERROR'
    }, { status: 500, headers });
  }
} 
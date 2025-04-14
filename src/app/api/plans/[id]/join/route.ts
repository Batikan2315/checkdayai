import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Plan from '@/models/Plan';
import User from '@/models/User';
import mongoose from 'mongoose';
import { isValidObjectId } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    // URL'den ID'yi al
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const id = segments[segments.length - 2]; // /api/plans/[id]/join formatında
    
    // Body'den kullanıcı ID'sini al
    const body = await req.json();
    const { userId } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Plan ID zorunludur' }, { status: 400 });
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Kullanıcı ID zorunludur' }, { status: 400 });
    }
    
    // Geçerli bir MongoDB ObjectId mi kontrol et
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Geçersiz plan ID' }, { status: 400 });
    }
    
    // Planı bul
    const plan = await Plan.findById(id);
    
    if (!plan) {
      return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 });
    }
    
    // Zaten katılmış mı kontrol et
    const isParticipant = plan.participants?.some(
      (participantId: any) => 
        participantId.toString() === userId || 
        participantId === userId
    ) || false;
    
    if (isParticipant) {
      return NextResponse.json(
        { error: 'Bu plana zaten katılmışsınız' }, 
        { status: 400 }
      );
    }
    
    // Plan kapasitesi dolmuş mu kontrol et
    if (plan.maxParticipants > 0 && (plan.participants?.length || 0) >= plan.maxParticipants) {
      return NextResponse.json(
        { error: 'Plan kapasitesi dolmuş, katılım alınamıyor' }, 
        { status: 400 }
      );
    }
    
    // Kullanıcıyı bul
    let userObjId;
    if (isValidObjectId(userId)) {
      userObjId = new mongoose.Types.ObjectId(userId);
    } else {
      // Google ID kullanıcısı
      const user = await User.findOne({ oauth_id: userId });
      if (user) {
        userObjId = user._id;
      } else {
        return NextResponse.json(
          { error: 'Kullanıcı bulunamadı' },
          { status: 404 }
        );
      }
    }
    
    // Plan'a katılımcı ekle
    await Plan.findByIdAndUpdate(
      id, 
      { $addToSet: { participants: userObjId } }
    );
    
    // User'ın participatingPlans alanına da ekle
    await User.findByIdAndUpdate(
      userObjId,
      { $addToSet: { participatingPlans: id } }
    );
    
    return NextResponse.json({ 
      message: 'Plana başarıyla katıldınız', 
      participantCount: (plan.participants?.length || 0) + 1
    });
    
  } catch (error: any) {
    console.error('Plan katılım hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
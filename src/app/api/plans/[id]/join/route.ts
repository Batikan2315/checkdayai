import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Plan from '@/models/Plan';
import User from '@/models/User';
import mongoose from 'mongoose';

// POST: Plana katıl
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const planId = params.id;
    const body = await req.json();
    const userId = body.userId; // Auth middleware'den gelecek
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Oturum süresi dolmuş olabilir, lütfen tekrar giriş yapın' },
        { status: 401 }
      );
    }
    
    // Geçerli ObjectId'ler mi kontrol et
    if (!mongoose.Types.ObjectId.isValid(planId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Geçersiz ID' }, { status: 400 });
    }

    // Planı bul
    const plan = await Plan.findById(planId);
    
    if (!plan) {
      return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 });
    }
    
    // Kullanıcıyı bul
    const user = await User.findById(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }
    
    // Zaten katılmış mı kontrol et
    if (plan.participants.includes(userId)) {
      return NextResponse.json(
        { error: 'Bu plana zaten katıldınız' },
        { status: 400 }
      );
    }
    
    // Katılımcı sayısı kontrolü
    if (plan.participants.length >= plan.maxParticipants) {
      return NextResponse.json(
        { error: 'Bu plan maksimum katılımcı sayısına ulaşmış' },
        { status: 400 }
      );
    }
    
    // Ücretli plan işlemleri (gerçek uygulamada kullanılacak)
    if (!plan.isFree) {
      // Bakiye kontrolü
      if (user.balance < plan.price) {
        return NextResponse.json(
          { error: 'Yetersiz bakiye, lütfen bakiyenizi yükleyin' },
          { status: 400 }
        );
      }
      
      // Gerçek uygulamada bakiye işlemleri için Transaction modeli kullanılacak
      // Bu örnek için basit olarak bakiye düşüyoruz
      // await User.findByIdAndUpdate(userId, { $inc: { balance: -plan.price } });
    }
    
    // Plana katıl
    const updatedPlan = await Plan.findByIdAndUpdate(
      planId,
      { $addToSet: { participants: userId } },
      { new: true }
    )
      .populate('creator', 'username firstName lastName profilePicture')
      .populate('leaders', 'username firstName lastName profilePicture')
      .lean();
    
    return NextResponse.json({
      message: 'Plana başarıyla katıldınız',
      plan: updatedPlan,
    });
  } catch (error: any) {
    console.error('Plana katılma hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
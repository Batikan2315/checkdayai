import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Plan from '@/models/Plan';
import User from '@/models/User';
import { isValidObjectId } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    // URL'den ID'yi al
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const planId = segments[segments.length - 2]; // /api/plans/[id]/participate formatında
    
    const body = await req.json();
    const { userId, action } = body;
    
    if (!planId || !userId) {
      return NextResponse.json(
        { error: 'Plan ID ve Kullanıcı ID zorunludur' }, 
        { status: 400 }
      );
    }
    
    // Plan ve Kullanıcı kontrolü
    const plan = await Plan.findById(planId);
    if (!plan) {
      return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }
    
    // Katılım işlemi - MongoDB model belgesini doğrudan manipüle et
    if (action === 'join') {
      // Kullanıcı zaten katılmış mı kontrol et
      if (plan.participants && Array.isArray(plan.participants)) {
        const userJoinedIdx = plan.participants.findIndex((id: any) => 
          id === userId || (id && id.toString && id.toString() === userId)
        );
        
        if (userJoinedIdx !== -1) {
          return NextResponse.json({ message: 'Bu plana zaten katılmışsınız' }, { status: 200 });
        }
      }
      
      try {
        // Mevcut participants array'ini al (yoksa boş array oluştur)
        if (!plan.participants) plan.participants = [];
        
        // userId'yi string olarak array'e ekle
        plan.participants.push(userId.toString());
        
        // Kullanıcının participating planlarına bu plan ID'sini ekle
        if (!user.participating) user.participating = [];
        user.participating.push(planId.toString());
        
        // Değişiklikleri kaydet
        await Promise.all([plan.save(), user.save()]);
        
        return NextResponse.json({ message: 'Plana katılındı' }, { status: 200 });
      } catch (joinError: any) {
        console.error('Katılım hatası:', joinError);
        return NextResponse.json({ error: joinError.message }, { status: 500 });
      }
    } 
    else if (action === 'leave') {
      try {
        // Plan participants array'den userId'yi çıkar
        if (plan.participants && Array.isArray(plan.participants)) {
          // any tipine dönüştürerek filtreleyelim
          plan.participants = (plan.participants as any[]).filter((id: any) => 
            id !== userId.toString() && (!id || !id.toString || id.toString() !== userId.toString())
          );
        }
        
        // Kullanıcının participating array'inden planId'yi çıkar
        if (user.participating && Array.isArray(user.participating)) {
          user.participating = user.participating.filter((id: any) => 
            id !== planId.toString() && (!id || !id.toString || id.toString() !== planId.toString())
          );
        }
        
        // Değişiklikleri kaydet
        await Promise.all([plan.save(), user.save()]);
        
        return NextResponse.json({ message: 'Plandan ayrılındı' }, { status: 200 });
      } catch (leaveError: any) {
        console.error('Ayrılma hatası:', leaveError);
        return NextResponse.json({ error: leaveError.message }, { status: 500 });
      }
    } 
    else {
      return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
    }
  } 
  catch (error: any) {
    console.error('Katılım işlemi hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
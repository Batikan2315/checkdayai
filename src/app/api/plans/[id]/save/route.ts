import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Plan from '@/models/Plan';
import mongoose from 'mongoose';
import { isValidObjectId } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    // URL'den ID'yi al
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const id = segments[segments.length - 2]; // /api/plans/[id]/save formatında
    
    // Body'den kullanıcı ID'sini ve aksiyonu al
    const body = await req.json();
    const { userId, action = 'save' } = body;
    
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
    
    // Kaydet veya kaldır işlemi
    if (action === 'save') {
      // Kullanıcı ID'si zaten saves array'inde var mı kontrol et
      const alreadySaved = plan.saves?.some(
        (save: any) => save.toString() === userId || save === userId
      ) || false;
      
      if (alreadySaved) {
        return NextResponse.json({ 
          message: 'Plan zaten kaydedilmiş', 
          saves: plan.saves?.length || 0
        });
      }
      
      // MongoDB ObjectId mi kontrol et
      const saveId = isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : userId;
      
      // Plan'a save ekle ($addToSet tekrarlanan değerleri engelliyor)
      await Plan.findByIdAndUpdate(
        id, 
        { $addToSet: { saves: saveId } }
      );
      
      return NextResponse.json({ 
        message: 'Plan kaydedildi', 
        saves: (plan.saves?.length || 0) + 1
      });
    } else if (action === 'unsave') {
      // Plan'dan save kaldır
      await Plan.findByIdAndUpdate(
        id, 
        { $pull: { saves: userId } }
      );
      
      // Kullanıcının planı kaydetmiş mi kontrol et
      const userSaved = plan.saves?.some(
        (save: any) => save.toString() === userId || save === userId
      ) || false;
      
      return NextResponse.json({ 
        message: 'Kayıt kaldırıldı', 
        saves: userSaved ? (plan.saves?.length || 0) - 1 : (plan.saves?.length || 0)
      });
    } else {
      return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error('Plan kaydetme hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
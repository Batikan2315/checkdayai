import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Plan from '@/models/Plan';
import mongoose from 'mongoose';
import { isValidObjectId } from '@/lib/utils';

// Next.js 15 route handler tipi
interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    await connectDB();
    
    // params bir Promise değil, doğrudan erişilebilir
    const { id } = params;
    
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
      const alreadySaved = plan.saves.some(
        (save: any) => save.toString() === userId || save === userId
      );
      
      if (alreadySaved) {
        return NextResponse.json({ 
          message: 'Plan zaten kaydedilmiş', 
          saves: plan.saves.length
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
        saves: plan.saves.length + 1
      });
    } else if (action === 'unsave') {
      // Plan'dan save kaldır
      await Plan.findByIdAndUpdate(
        id, 
        { $pull: { saves: userId } }
      );
      
      // Kullanıcının planı kaydetmiş mi kontrol et
      const userSaved = plan.saves.some(
        (save: any) => save.toString() === userId || save === userId
      );
      
      return NextResponse.json({ 
        message: 'Kayıt kaldırıldı', 
        saves: userSaved ? plan.saves.length - 1 : plan.saves.length
      });
    } else {
      return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error('Plan kaydetme hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
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
    const { userId, action = 'like' } = body;
    
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
    
    // Like veya unlike işlemi
    if (action === 'like') {
      // Kullanıcı ID'si zaten likes array'inde var mı kontrol et
      const alreadyLiked = plan.likes.some(
        (like: any) => like.toString() === userId || like === userId
      );
      
      if (alreadyLiked) {
        return NextResponse.json({ 
          message: 'Plan zaten beğenilmiş', 
          likes: plan.likes.length
        });
      }
      
      // MongoDB ObjectId mi kontrol et
      const likeId = isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : userId;
      
      // Plan'a like ekle ($addToSet tekrarlanan değerleri engelliyor)
      await Plan.findByIdAndUpdate(
        id, 
        { $addToSet: { likes: likeId } }
      );
      
      return NextResponse.json({ 
        message: 'Plan beğenildi', 
        likes: plan.likes.length + 1
      });
    } else if (action === 'unlike') {
      // Plan'dan like kaldır
      await Plan.findByIdAndUpdate(
        id, 
        { $pull: { likes: userId } }
      );
      
      // Kullanıcının planı beğenip beğenmediğini kontrol et
      const userLiked = plan.likes.some(
        (like: any) => like.toString() === userId || like === userId
      );
      
      return NextResponse.json({ 
        message: 'Beğeni kaldırıldı', 
        likes: userLiked ? plan.likes.length - 1 : plan.likes.length
      });
    } else {
      return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error('Plan beğeni hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
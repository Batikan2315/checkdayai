import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Plan from '@/models/Plan';
import mongoose from 'mongoose';
import { safeStringify } from '@/lib/utils';

// GET: Belirli bir planı getir
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    // params bir Promise değil, doğrudan erişilebilir
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Plan ID zorunludur' }, { status: 400 });
    }
    
    const plan = await Plan.findById(id)
      .populate({
        path: 'creator',
        select: 'username firstName lastName profilePicture',
        model: 'User'
      })
      .populate({
        path: 'leaders',
        select: 'username firstName lastName profilePicture',
        model: 'User'
      })
      .populate('participants', 'username firstName lastName profilePicture')
      .lean();
    
    if (!plan) {
      return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 });
    }
    
    // Tarih ve ObjectId dönüşümleri için
    const serializedPlan = safeStringify(plan);
    
    return NextResponse.json(serializedPlan);
  } catch (error: any) {
    console.error('Plan detayı getirme hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Plan bilgilerini güncelle
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    // params bir Promise değil, doğrudan erişilebilir
    const { id } = params;
    
    const body = await req.json();
    
    // Geçerli bir MongoDB ObjectId mi kontrol et
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Geçersiz plan ID' }, { status: 400 });
    }

    // Planı bul
    const plan = await Plan.findById(id);
    
    if (!plan) {
      return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 });
    }
    
    // Kullanıcı yetkisi kontrolü (gerçek uygulamada kullanılacak)
    // Şimdilik yetki kontrolü yapmıyoruz, middleware ile yapılacak
    
    // Planı güncelle
    const updatedPlan = await Plan.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    )
      .populate('creator', 'username firstName lastName profilePicture')
      .lean();

    return NextResponse.json(updatedPlan);
  } catch (error: any) {
    console.error('Plan güncelleme hatası:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({ error: validationErrors }, { status: 400 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Planı sil
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    // params bir Promise değil, doğrudan erişilebilir
    const { id } = params;
    
    // Geçerli bir MongoDB ObjectId mi kontrol et
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Geçersiz plan ID' }, { status: 400 });
    }

    // Planı bul
    const plan = await Plan.findById(id);
    
    if (!plan) {
      return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 });
    }
    
    // Kullanıcı yetkisi kontrolü (gerçek uygulamada kullanılacak)
    // Şimdilik yetki kontrolü yapmıyoruz, middleware ile yapılacak

    // Planı sil (ya da deaktif et)
    // Gerçek silme
    await Plan.findByIdAndDelete(id);
    
    // Veya yalnızca deaktif etme
    // await Plan.findByIdAndUpdate(id, { isActive: false });

    return NextResponse.json({ message: 'Plan başarıyla silindi' });
  } catch (error: any) {
    console.error('Plan silme hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
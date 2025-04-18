import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Plan from '@/models/Plan';
import Comment from '@/models/Comment';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import mongoose from 'mongoose';
import User from '@/models/User';

// Plan ID'sine göre plan detaylarını getir
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const id = params.id;

    const plan = await Plan.findById(id)
      .populate('creator', 'username firstName lastName name profilePicture googleProfilePicture email oauth_id')
      .populate('participants', 'username firstName lastName profilePicture googleProfilePicture email')
      .populate('leaders', 'username firstName lastName profilePicture googleProfilePicture email')
      .lean();

    if (!plan) {
      return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (error: any) {
    console.error('Plan detayı getirme hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Plan güncelleme
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const id = params.id;
    const body = await request.json();

    const plan = await Plan.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true }
    )
      .populate('creator', 'username firstName lastName name profilePicture googleProfilePicture email oauth_id')
      .populate('participants', 'username firstName lastName profilePicture googleProfilePicture email')
      .populate('leaders', 'username firstName lastName profilePicture googleProfilePicture email')
      .lean();

    if (!plan) {
      return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (error: any) {
    console.error('Plan güncelleme hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Plan silme
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const id = params.id;

    // Planı sil
    const plan = await Plan.findByIdAndDelete(id);

    if (!plan) {
      return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 });
    }

    // Kullanıcıların katıldığı planlardan da kaldır
    await User.updateMany(
      { participatingPlans: id },
      { $pull: { participatingPlans: id } }
    );

    // Kullanıcıların kaydedilmiş planlarından da kaldır
    await User.updateMany(
      { savedPlans: id },
      { $pull: { savedPlans: id } }
    );

    // Kullanıcıların beğendiği planlardan da kaldır
    await User.updateMany(
      { likedPlans: id },
      { $pull: { likedPlans: id } }
    );

    // Plana ait tüm yorumları sil
    await Comment.deleteMany({ plan: id });

    return NextResponse.json({ message: 'Plan başarıyla silindi' });
  } catch (error: any) {
    console.error('Plan silme hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
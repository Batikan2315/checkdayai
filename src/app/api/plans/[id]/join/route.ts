import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Global değişken tipini tanımla
declare global {
  var mongoClient: any;
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { userId: requestUserId } = await request.json();

    // Kullanıcı kimliğini doğrula
    if (userId !== requestUserId) {
      return NextResponse.json({ error: 'Kullanıcı kimliği geçersiz' }, { status: 403 });
    }

    await connectDB();
    const planId = context.params.id;

    // Plan ID geçerli mi kontrol et
    if (!ObjectId.isValid(planId)) {
      return NextResponse.json({ error: 'Geçersiz plan ID' }, { status: 400 });
    }

    const db = global.mongoClient.db();

    // Plan bilgilerini getir
    const plan = await db.collection('plans').findOne({
      _id: new ObjectId(planId)
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 });
    }

    // Kullanıcı zaten katılımcı mı kontrol et
    const isParticipant = plan.participants?.some((p: any) => 
      p?.toString() === userId || 
      (p?._id && p._id.toString() === userId)
    );

    if (isParticipant) {
      return NextResponse.json({ error: 'Zaten bu plana katılım sağladınız' }, { status: 400 });
    }

    // Plan dolmuş mu kontrol et
    if (plan.maxParticipants && plan.participants?.length >= plan.maxParticipants) {
      return NextResponse.json({ error: 'Plan kontenjanı dolmuştur' }, { status: 400 });
    }

    // Update operations - plana katılan kişilerin takvimine otomatik olarak ekle
    const updateData = {
      $addToSet: { 
        participants: new ObjectId(userId),
        calendarUsers: new ObjectId(userId) // Otomatik olarak takvime de ekle
      }
    };

    // Katılımcı olarak ekle ve otomatik takvime ekle
    const result = await db.collection('plans').updateOne(
      { _id: new ObjectId(planId) },
      updateData
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: 'Plan güncellenemedi' }, { status: 500 });
    }

    // Kullanıcının katıldığı planları güncelle
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $addToSet: { participatedPlans: new ObjectId(planId) } }
    );

    return NextResponse.json({
      message: 'Plana başarıyla katıldınız'
    });
  } catch (error: any) {
    console.error('Plan katılımında hata:', error);
    return NextResponse.json({ error: error.message || 'Bir hata oluştu' }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { connectDB } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { url, path } = await req.json();
    
    // DB bağlantısı
    const db = await connectDB();
    
    // Analytics koleksiyonuna kaydet
    await db.collection('analytics').insertOne({
      url,
      path,
      userId: session?.user?.id || null,
      userAgent: req.headers.get('user-agent'),
      timestamp: new Date(),
      referrer: req.headers.get('referer') || null
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics kayıt hatası:', error);
    return NextResponse.json(
      { success: false, error: 'Analytics kaydedilemedi' },
      { status: 500 }
    );
  }
}

// Analitik verileri getirmek için GET endpointi (sadece admin kullanıcılarına açık)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Sadece admin kullanıcıları erişebilir
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Bu işlem için yetkiniz yok' },
        { status: 403 }
      );
    }
    
    const db = await connectDB();
    
    // Son 100 analitik kaydını getir
    const analytics = await db.collection('analytics')
      .find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();
    
    return NextResponse.json(analytics);
  } catch (error) {
    return NextResponse.json(
      { error: 'Analitik verileri alınamadı' },
      { status: 500 }
    );
  }
} 
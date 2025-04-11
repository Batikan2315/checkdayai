import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Plan from '@/models/Plan';

// GET: Tüm planları getir
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    // URL parametrelerini al
    const searchParams = req.nextUrl.searchParams;
    const query: any = {};
    
    // Filtreleme parametreleri
    if (searchParams.has('isActive')) {
      query.isActive = searchParams.get('isActive') === 'true';
    }
    
    if (searchParams.has('isFree')) {
      query.isFree = searchParams.get('isFree') === 'true';
    }
    
    if (searchParams.has('isOnline')) {
      query.isOnline = searchParams.get('isOnline') === 'true';
    }
    
    // Tarih filtreleri
    if (searchParams.has('startDate')) {
      query.startDate = { $gte: new Date(searchParams.get('startDate') as string) };
    }
    
    if (searchParams.has('endDate')) {
      query.endDate = { $lte: new Date(searchParams.get('endDate') as string) };
    }
    
    // Arama filtresi
    if (searchParams.has('search')) {
      const searchTerm = searchParams.get('search');
      query.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { location: { $regex: searchTerm, $options: 'i' } },
      ];
    }
    
    // Sayfalama
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // Sıralama
    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const sort: any = {};
    sort[sortField] = sortOrder;
    
    // Planları getir
    const plans = await Plan.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('creator', 'username firstName lastName profilePicture')
      .lean();
    
    // Toplam sayı
    const total = await Plan.countDocuments(query);
    
    return NextResponse.json({
      plans,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Planları getirme hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Yeni plan oluştur
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const body = await req.json();
    
    // Gerekli alanları kontrol et
    if (!body.title || !body.description || !body.startDate || !body.location) {
      return NextResponse.json(
        { error: 'Başlık, açıklama, başlangıç tarihi ve konum zorunludur' },
        { status: 400 }
      );
    }
    
    // Kullanıcı ID'sini al (normalde auth middleware'den gelecek)
    if (!body.creator) {
      return NextResponse.json(
        { error: 'Oturum süresi dolmuş olabilir, lütfen tekrar giriş yapın' },
        { status: 401 }
      );
    }
    
    // Liderlere kullanıcıyı ekle
    if (!body.leaders || !body.leaders.includes(body.creator)) {
      body.leaders = [body.creator, ...(body.leaders || [])];
    }
    
    // Yeni plan oluştur
    const newPlan = await Plan.create(body);
    
    // Planı kullanıcı bilgileriyle birlikte döndür
    const plan = await Plan.findById(newPlan._id)
      .populate('creator', 'username firstName lastName profilePicture')
      .lean();
    
    return NextResponse.json(plan, { status: 201 });
  } catch (error: any) {
    console.error('Plan oluşturma hatası:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({ error: validationErrors }, { status: 400 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
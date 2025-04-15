import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Plan from '@/models/Plan';
import User from '@/models/User';
import { isValidObjectId } from '@/lib/utils';

// Basit bellek içi önbellek - üretimde Redis kullanılabilir
const CACHE_TTL = 60 * 1000; // 60 saniye
const cache: Record<string, { data: any; timestamp: number }> = {};

// Önbellek anahtarı oluştur
function createCacheKey(req: NextRequest): string {
  const url = new URL(req.url);
  return `plans:${url.search || 'all'}`;
}

// Önbellekten veri al
function getCachedData(key: string) {
  const cachedItem = cache[key];
  if (!cachedItem) return null;
  
  if (Date.now() - cachedItem.timestamp > CACHE_TTL) {
    delete cache[key];
    return null;
  }
  
  return cachedItem.data;
}

// Önbelleğe veri ekle
function setCachedData(key: string, data: any) {
  cache[key] = {
    data,
    timestamp: Date.now()
  };
}

// Önbelleği temizle (mutasyon sonrası)
function clearCache() {
  Object.keys(cache).forEach(key => {
    if (key.startsWith('plans:')) {
      delete cache[key];
    }
  });
}

// GET: Tüm planları getir
export async function GET(req: NextRequest) {
  try {
    // Önbellek kontrolü
    const cacheKey = createCacheKey(req);
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      // console.log('Plans cache hit:', cacheKey);
      return NextResponse.json(cachedData);
    }
    
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
    
    // Kullanıcı filtrelemeleri (oluşturan kişi veya katılımcı)
    if (searchParams.has('creator')) {
      const creatorId = searchParams.get('creator');
      
      // Hem normal ObjectId hem de OAuth ID için kontrol
      if (isValidObjectId(creatorId)) {
        query.creator = creatorId;
      } else {
        // OAuth ID için
        query.oauth_creator_id = creatorId;
      }
    }
    
    if (searchParams.has('participant')) {
      const participantId = searchParams.get('participant');
      
      // Google ID veya ObjectId kontrolü
      if (isValidObjectId(participantId)) {
        query.participants = participantId;
      } else {
        // Önce Google ID'ye göre kullanıcıyı bulmayı dene
        try {
          const user = await User.findOne({ googleId: participantId });
          if (user) {
            query.participants = user._id;
          } else {
            // Kullanıcı bulunamadı, boş sonuç döndür
            return NextResponse.json({
              plans: [],
              pagination: {
                total: 0,
                page: 1,
                limit: 10,
                totalPages: 0,
              },
            });
          }
        } catch (userError) {
          console.error('Kullanıcı arama hatası:', userError);
          // Hata olursa boş sonuç döndür
          return NextResponse.json({
            plans: [],
            pagination: {
              total: 0,
              page: 1,
              limit: 10,
              totalPages: 0,
            },
          });
        }
      }
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
    
    // Planları getir - daha verimli sorgu (lean kullanımı)
    const plans = await Plan.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'creator',
        select: 'username firstName lastName profilePicture',
        model: 'User'
      })
      .lean();
    
    // Toplam sayı - daha etkili şekilde hesapla
    // İpucu: Çok fazla sayfalama isteniyorsa, CountDocuments yerine estimatedDocumentCount kullanarak performans iyileştirmesi yapılabilir
    const countQuery = { ...query };
    const total = await Plan.countDocuments(countQuery);
    
    const responseData = {
      plans,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
    
    // Önbelleğe ekle
    setCachedData(cacheKey, responseData);
    
    return NextResponse.json(responseData);
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
    
    // Üretim ortamında log'ları azalt
    if (process.env.NODE_ENV !== 'production') {
      console.log("Plan oluşturma - Gelen veri:", body);
    }
    
    // Gerekli alanları kontrol et
    if (!body.title || !body.description || !body.startDate) {
      return NextResponse.json(
        { error: 'Başlık, açıklama ve başlangıç tarihi zorunludur' },
        { status: 400 }
      );
    }
    
    // Online planlar için konum zorunlu değil
    if (!body.isOnline && !body.location) {
      return NextResponse.json(
        { error: 'Fiziksel planlar için konum zorunludur' },
        { status: 400 }
      );
    }
    
    // Tarihler için kontrol
    try {
      // Tarih formatını kontrol et
      new Date(body.startDate);
      new Date(body.endDate);
    } catch (error) {
      return NextResponse.json(
        { error: 'Geçersiz tarih formatı' },
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
    
    // Katılımcı sayısı kontrolü - 0 sınırsız anlamına geliyor
    if (body.maxParticipants !== undefined) {
      // Sadece negatif değerler için hata ver
      if (body.maxParticipants < 0) {
        return NextResponse.json(
          { error: 'Katılımcı sayısı negatif olamaz' },
          { status: 400 }
        );
      }
    }
    
    // Kullanıcının Google ID mi yoksa normal User ID mi olduğu kontrolü
    const isGoogleId = !isValidObjectId(body.creator);
    
    const finalBody = {
      ...body,
      leaders: [],  // leaders alanını boş dizi olarak ayarla
      isActive: true // Plan aktif olarak ayarla
    };

    if (isGoogleId) {
      // Google ID kullanıcısı için oauth_creator_id alanını ayarla
      finalBody.oauth_creator_id = body.creator;
      
      // Google ID için kullanıcıyı bul
      const user = await User.findOne({ oauth_id: body.creator });
      if (user) {
        // Bulunan user ile creator'ı ayarla
        finalBody.creator = user._id;
        finalBody.leaders = [user._id]; // Liderlere kullanıcı ID'sini ekle
      } else {
        // Kullanıcı bulunamadı, string olarak sakla
        finalBody.creator = body.creator;
      }
    } else {
      // Normal MongoDB ObjectId için creator ve liderlere ekle
      finalBody.creator = body.creator;
      finalBody.leaders = [body.creator];
    }
    
    // Varsayılan değerleri ayarla
    if (finalBody.allowInvites === undefined) {
      finalBody.allowInvites = true; // Varsayılan olarak katılımcılar davet gönderebilir
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log("Plan oluşturuluyor:", finalBody);
    }
    
    // Yeni plan oluştur
    const newPlan = await Plan.create(finalBody);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log("Plan oluşturuldu:", newPlan._id);
    }
    
    // Oluşturucuyu katılımcı olarak ekleyelim
    await Plan.findByIdAndUpdate(
      newPlan._id,
      { $addToSet: { participants: body.creator } }
    );
    
    // Kullanıcının katıldığı planlara da ekleyelim
    if (isValidObjectId(body.creator)) {
      await User.findByIdAndUpdate(
        body.creator,
        { $addToSet: { participatingPlans: newPlan._id } }
      );
    } else {
      // Google ID için kullanıcıyı bul
      const user = await User.findOne({ oauth_id: body.creator });
      if (user) {
        await User.findByIdAndUpdate(
          user._id,
          { $addToSet: { participatingPlans: newPlan._id } }
        );
      }
    }
    
    // Önbelleği temizle - yeni veri eklendi
    clearCache();
    
    // Planı döndür - populate kullanarak
    const plan = await Plan.findById(newPlan._id)
      .populate('creator', 'username firstName lastName profilePicture')
      .populate('leaders', 'username firstName lastName profilePicture')
      .lean();
    
    return NextResponse.json(plan, { status: 201 });
  } catch (error: any) {
    console.error('Plan oluşturma hatası:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({ error: validationErrors.join(',') }, { status: 400 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
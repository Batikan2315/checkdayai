import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Plan from '@/models/Plan';
import User from '@/models/User';
import { isValidObjectId } from '@/lib/utils';
import { ObjectId } from 'mongodb';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';

// Tip tanımlamaları
interface ICreator {
  _id: string | ObjectId;
  username?: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  googleProfilePicture?: string;
  image?: string;
  email?: string;
}

// Basit bellek içi önbellek
const cache = {
  data: null as any,
  timestamp: 0,
  ttl: 60 * 1000, // 1 dakika önbellek süresi
};

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const filter = searchParams.get('filter');
    const category = searchParams.get('category');
    const userId = searchParams.get('userId');
    const userOnly = searchParams.get('userOnly') === 'true';
    const search = searchParams.get('search');
    const showOnlyPublic = searchParams.get('showOnlyPublic') === 'true' || (!searchParams.has('showOnlyPublic') && !userOnly); // Varsayılan olarak herkese açık planları göster

    // Filtre koşullarını oluştur
    const filterConditions: any = {};

    // Creator alanının zorunlu olmasını sağla - creator alanı olmayanları filtreleme
    filterConditions.creator = { $exists: true, $ne: null };

    // Eğer showOnlyPublic=true ise sadece isPublic=true olanları göster (varsayılan davranış)
    if (showOnlyPublic) {
      // İki durum var: doğrudan isPublic alanı veya isPrivate=false olanlar
      filterConditions.$or = [
        { isPublic: true },
        { isPrivate: false }
      ];
    }

    // Kategori filtresi
    if (category) {
      filterConditions.categories = category;
    }

    // Belirli bir kullanıcının planlarını getir
    if (userId) {
      filterConditions.creator = userId;
    }

    // Arama filtrelemesi
    if (search) {
      filterConditions.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Kullanıcının takviminde yer alan planları getir
    const calendarUserId = searchParams.get('calendarUser');
    if (calendarUserId) {
      if (mongoose.Types.ObjectId.isValid(calendarUserId)) {
        // Kullanıcının oluşturduğu veya katıldığı planlar
        filterConditions.$or = [
          { creator: new ObjectId(calendarUserId) },
          { participants: new ObjectId(calendarUserId) },
          { calendarUsers: new ObjectId(calendarUserId) }
        ];
      } else {
        // Kullanıcının ID'si hatalıysa, ilgili bir plan döndürme
        filterConditions._id = new ObjectId("000000000000000000000000");
      }
    }

    const token = await getToken({ req: request as any });
    const loggedInUserId = token?.sub;

    // Kullanıcı giriş yapmışsa, sadece kendi planlarını görmek istiyorsa
    if (userOnly && loggedInUserId) {
      filterConditions.creator = loggedInUserId;
    } else if (userOnly && !loggedInUserId) {
      // Kullanıcı giriş yapmamış ama userOnly=true ise boş sonuç dön
      return NextResponse.json({
        plans: [],
        totalPlans: 0,
        currentPage: page,
        totalPages: 0,
        error: "Kullanıcı giriş yapmadı"
      });
    }

    // Filtreleme: Son eklenenler, En çok beğenilenler, vb.
    let sortOption = {};
    if (filter === 'newest') {
      sortOption = { createdAt: -1 };
    } else if (filter === 'oldest') {
      sortOption = { createdAt: 1 };
    } else if (filter === 'most_liked') {
      sortOption = { likeCount: -1 };
    } else if (filter === 'most_saved') {
      sortOption = { saveCount: -1 };
    } else if (filter === 'most_viewed') {
      sortOption = { viewCount: -1 };
    } else {
      // Varsayılan sıralama: Son eklenenler
      sortOption = { createdAt: -1 };
    }

    // Planları getir ve oluşturan kullanıcıların tüm gerekli bilgilerini doldur
    const plans = await Plan.find(filterConditions)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: 'creator',
        select: 'username firstName lastName profilePicture googleProfilePicture image email oauth_id',
        options: { lean: true }
      })
      .populate({
        path: 'participants',
        select: 'username firstName lastName profilePicture googleProfilePicture image email',
        options: { lean: true }
      })
      .lean();

    // Eksik kullanıcı bilgilerini düzelt
    const plansWithFixedCreators = plans.map(plan => {
      const planCopy = { ...plan }; // Plan kopyası oluştur
      
      // Creator objesi yoksa veya string ise yeni obje oluştur
      if (!planCopy.creator || typeof planCopy.creator === 'string') {
        // Creator değerini any olarak işle ve değiştir
        const creatorValue = typeof planCopy.creator === 'string' ? planCopy.creator : 'unknown';
        // @ts-ignore veya as any kullanarak tip hatasını geçici olarak önleyelim
        planCopy.creator = {
          _id: creatorValue,
          username: 'Anonim',
          profilePicture: '/images/avatars/default.png'
        } as any;
      } 
      // Creator objesi varsa ve bir object ise eksik bilgileri doldur
      else if (typeof planCopy.creator === 'object') {
        // Creator nesnesini any olarak işle
        const creator = planCopy.creator as any;
        
        // Profil resmi kontrolü
        if (!creator.profilePicture && creator.googleProfilePicture) {
          creator.profilePicture = creator.googleProfilePicture;
        }
        if (!creator.profilePicture && creator.image) {
          creator.profilePicture = creator.image;
        }
        
        // Kullanıcı adı kontrolü
        if (!creator.username) {
          creator.username = creator.firstName || 
            (creator.email ? creator.email.split('@')[0] : 'Kullanıcı');
        }
      }
      
      return planCopy;
    });
    
    // Toplam plan sayısını getir
    const totalPlans = await Plan.countDocuments(filterConditions);

    return NextResponse.json({
      plans: plansWithFixedCreators,
      totalPlans,
      currentPage: page,
      totalPages: Math.ceil(totalPlans / limit)
    });
  } catch (error: any) {
    console.error('Plan listesi getirme hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Plan oluşturma
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    await connectDB();
    
    const body = await req.json();
    
    // User ID kontrolü
    let userId;
    if (session?.user?.id) {
      userId = session.user.id;
    } else if ((session?.user as any)?._id) {
      // Tip dönüşümü gerekli
      userId = (session.user as any)._id;
    } else {
      return NextResponse.json({ error: "Kullanıcı kimliği bulunamadı" }, { status: 400 });
    }
    
    // Eğer creator farklı bir değerle geldiyse (güvenlik açısından) userId ile değiştir
    body.creator = userId;
    
    // CreatorInfo alanını kontrol et ve güncelle
    // Eğer zaten varsa ek bilgileri kabul et ama _id'yi doğrula
    if (body.creatorInfo) {
      body.creatorInfo._id = userId; // Kullanıcı ID'si mutlaka doğru olmalı
    }
    
    // Zorunlu alanları kontrol et
    if (!body.title || !body.description || !body.startDate) {
      return NextResponse.json(
        { error: "Gerekli bilgiler eksik (başlık, açıklama, başlangıç tarihi zorunludur)" },
        { status: 400 }
      );
    }
    
    // Tarih formatını kontrol et
    const startDate = new Date(body.startDate);
    const endDate = body.endDate ? new Date(body.endDate) : null;
    
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "Geçersiz başlangıç tarihi formatı" }, { status: 400 });
    }
    
    if (endDate && isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Geçersiz bitiş tarihi formatı" }, { status: 400 });
    }
    
    // Bitiş tarihi başlangıç tarihinden önce olamaz
    if (endDate && endDate < startDate) {
      return NextResponse.json(
        { error: "Bitiş tarihi başlangıç tarihinden önce olamaz" },
        { status: 400 }
      );
    }
    
    // Yeni plan oluştur
    const plan = await Plan.create(body);
    
    // Kullanıcının planlarını güncelle
    if (plan._id) {
      // Kullanıcı document'ini bul ve güncelle
      await User.findByIdAndUpdate(
        userId,
        {
          $addToSet: { createdPlans: plan._id },
        },
        { new: true }
      );
    }
    
    return NextResponse.json(plan, { status: 201 });
    
  } catch (error: any) {
    console.error("Plans API error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred" },
      { status: 500 }
    );
  }
} 
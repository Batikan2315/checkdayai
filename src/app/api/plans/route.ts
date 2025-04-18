import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Plan from '@/models/Plan';
import User from '@/models/User';
import { isValidObjectId } from '@/lib/utils';
import { ObjectId } from 'mongodb';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

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
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const token = await getToken({ req: request as any });

    if (!token || !token.sub) {
      return NextResponse.json(
        { error: "Geçersiz kullanıcı ID'si" },
        { status: 401 }
      );
    }
    
    const userId = token.sub;
    const body = await request.json();
    
    // Creator bilgisini kontrol et - eksikse hata döndür
    if (!body.creator && !userId) {
      return NextResponse.json(
        { error: "Creator bilgisi zorunludur" },
        { status: 400 }
      );
    }
    
    console.log("Plan oluşturma isteği:", { userId, email: token.email });

    // Kullanıcıyı bulmak için tüm olası alanları kontrol et
    let user: any = null;
    
    // 1. Email ile ara (en güvenilir yöntem)
    if (token.email) {
      user = await User.findOne({ email: token.email });
      console.log("Email araması:", token.email, !!user);
    }
    
    // 2. Hala bulunamadıysa, ObjectId ile ara
    if (!user && mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
      console.log("ObjectId araması:", userId, !!user);
    }
    
    // 3. OAuth ID ile ara
    if (!user) {
      user = await User.findOne({ 
        $or: [
          { oauth_id: userId },
          { googleId: userId },
          { "accounts.providerAccountId": userId }
        ] 
      });
      console.log("OAuth ID araması:", userId, !!user);
    }
    
    // Kullanıcı bulunamamışsa, yeni kullanıcı oluştur
    if (!user && token.email) {
      console.log("Kullanıcı bulunamadı, yeni oluşturuluyor:", token.email);
      
      // Kullanıcı adı oluştur
      const username = token.email.split('@')[0] + Math.floor(Math.random() * 1000);
      
      user = new User({
        email: token.email,
        name: token.name || username,
        username: username,
        oauth_id: userId,
        profilePicture: token.picture || "/images/avatars/default.png",
        createdPlans: []
      });
      
      await user.save();
      console.log("Yeni kullanıcı oluşturuldu:", user._id);
    }
    
    if (!user) {
      console.log("Kullanıcı bulunamadı ve oluşturulamadı:", userId);
      return NextResponse.json(
        { error: 'Creator kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    console.log("Bulunan kullanıcı:", user._id);

    // Yeni planı oluştur - creator olarak user._id kullan (string ID değil)
    const newPlan = new Plan({
      ...body,
      creator: user._id // Google OAuth ID'si yerine kullanıcının Mongo ID'sini kullan
    });

    await newPlan.save();
    console.log("Plan kaydedildi:", newPlan._id);

    // Kullanıcının oluşturduğu planlara ekle
    if (!user.createdPlans) {
      user.createdPlans = [];
    }
    user.createdPlans.push(newPlan._id);
    await user.save();
    console.log("Kullanıcı güncellendi");

    // Detaylı plan verisi dön
    const populatedPlan = await Plan.findById(newPlan._id)
      .populate('creator', 'username firstName lastName name profilePicture googleProfilePicture image email oauth_id')
      .populate('participants', 'username firstName lastName profilePicture googleProfilePicture image email')
      .lean();
    
    return NextResponse.json(populatedPlan, { status: 201 });
  } catch (error: any) {
    console.error('Plan oluşturma hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
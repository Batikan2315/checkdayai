import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Plan from '@/models/Plan';
import User from '@/models/User';
import { isValidObjectId } from '@/lib/utils';
import { ObjectId } from 'mongodb';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

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
    const showOnlyPublic = searchParams.get('showOnlyPublic') === 'true';

    // Filtre koşullarını oluştur
    const filterConditions: any = {};

    // Eğer showOnlyPublic=true ise sadece isPublic=true olanları göster
    if (showOnlyPublic) {
      filterConditions.isPublic = true;
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

    // Kullanıcı sadece kendi planlarını görmek istiyor mu?
    if (userOnly && loggedInUserId) {
      filterConditions.creator = loggedInUserId;
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

    // Planları getir
    const plans = await Plan.find(filterConditions)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('creator', 'username firstName lastName profilePicture googleProfilePicture email oauth_id')
      .populate('participants', 'username firstName lastName profilePicture googleProfilePicture email')
      .lean();
    
    // Toplam plan sayısını getir
    const totalPlans = await Plan.countDocuments(filterConditions);

    return NextResponse.json({
      plans,
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
    
    console.log("Plan oluşturma isteği:", { userId });

    // Kullanıcıyı kontrol et - Önce normal ID ile ara, bulamazsan oauth_id ile ara
    let user: any = null;
    
    try {
      // Normal ID ile kullanıcıyı bulmayı dene
      if (mongoose.Types.ObjectId.isValid(userId)) {
        user = await User.findById(userId);
      }
    } catch (error) {
      console.log("ObjectId araması başarısız:", error);
    }
    
    // Eğer kullanıcı bulunamadıysa, oauth_id ile ara
    if (!user) {
      user = await User.findOne({ oauth_id: userId });
      console.log("OAuth ID araması:", userId, !!user);
    }
    
    // Eğer kullanıcı hala bulunamadıysa, googleId ile ara
    if (!user) {
      user = await User.findOne({ googleId: userId });
      console.log("Google ID araması:", userId, !!user);
    }
    
    // Email araması yap
    if (!user && token.email) {
      user = await User.findOne({ email: token.email });
      console.log("Email araması:", token.email, !!user);
    }
    
    if (!user) {
      console.log("Kullanıcı bulunamadı:", userId);
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
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
      .populate('creator', 'username firstName lastName profilePicture googleProfilePicture email oauth_id')
      .populate('participants', 'username firstName lastName profilePicture googleProfilePicture email')
      .lean();
    
    return NextResponse.json(populatedPlan, { status: 201 });
  } catch (error: any) {
    console.error('Plan oluşturma hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Basit bir önbellek implementasyonu
const CACHE_TTL = 5 * 60 * 1000; // 5 dakika - milisaniye cinsinden (1 dakikadan 5 dakikaya çıkarıldı)
const cache: Record<string, { data: any; timestamp: number }> = {};

// Önbellek kontrolü
function getCachedData(key: string) {
  const cachedItem = cache[key];
  if (!cachedItem) return null;
  
  // Önbellek süresi dolmuş mu kontrol et
  if (Date.now() - cachedItem.timestamp > CACHE_TTL) {
    delete cache[key];
    return null;
  }
  
  return cachedItem.data;
}

// Veriyi önbelleğe ekle
function setCachedData(key: string, data: any) {
  cache[key] = {
    data,
    timestamp: Date.now()
  };
}

// Bildirimleri getir
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    // Oturum kontrolü
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { message: "Oturum açmanız gerekiyor" },
        { status: 401 }
      );
    }
    
    // URL'den parametreleri al
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const type = searchParams.get("type");
    
    // Önbellek anahtarı oluştur (type parametresi de dahil)
    const cacheKey = `notifications:${session.user.id}:${page}:${limit}:${unreadOnly}:${type || 'all'}`;
    
    // Önbellekte var mı kontrol et
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log("Önbellekten bildirimler alındı");
      return NextResponse.json(cachedData);
    }
    
    // Kullanıcı ID kontrolü - session.user.id geçerli mi?
    const userId = session.user.id;
    if (!userId || (typeof userId !== 'string' && typeof userId !== 'object')) {
      console.error("Geçersiz kullanıcı ID formatı:", userId);
      return NextResponse.json(
        { message: "Geçersiz kullanıcı kimliği", notifications: [], pagination: { total: 0, page, limit, totalPages: 0 }, unreadCount: 0 },
        { status: 200 } // Boş bildirim listesi döndür, UI hatasını önle
      );
    }
    
    // Filtreleme koşulları - userId string veya ObjectId olabilir
    const filter: any = { userId: session.user.id };
    if (unreadOnly) {
      filter.isRead = false;
    }
    if (type) {
      const validTypes = ["system", "invitation", "message", "like", "join", "reminder"];
      if (validTypes.includes(type)) {
        filter.type = type;
      }
    }
    
    try {
      // Google OAuth ID'leri için düzeltme - Mongoose'un ObjectId'ye çevirme işlemini atla
      // userId bir ObjectId formatında değilse $eq operatörü ile string olarak karşılaştır
      if (typeof session.user.id === 'string' && session.user.id.length > 24) {
        filter.userId = { $eq: session.user.id };
      }
      
      // Toplam bildirim sayısı
      const total = await Notification.countDocuments(filter);
      
      // Bildirimleri getir
      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(); // Performans için lean() ekledik
      
      // Okunmamış bildirim sayısı
      const unreadCount = await Notification.countDocuments({
        userId: session.user.id,
        isRead: false,
      });
      
      const responseData = {
        notifications,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        unreadCount,
      };
      
      // Önbelleğe ekle
      setCachedData(cacheKey, responseData);
      
      return NextResponse.json(responseData);
    } catch (dbError: any) {
      console.error("Veritabanı sorgu hatası:", dbError);
      
      // Veritabanı sorgu hatası - kullanıcı dostu hata mesajı
      return NextResponse.json(
        { 
          message: "Bildirimler getirilemedi. Veritabanı sorgusu başarısız oldu.",
          notifications: [], 
          pagination: { total: 0, page, limit, totalPages: 0 }, 
          unreadCount: 0 
        },
        { status: 200 } // UI hatasını önlemek için 200 döndür
      );
    }
  } catch (error: any) {
    console.error("Bildirimler getirme hatası:", error);
    
    // Genel hata durumunda, kullanıcıya boş bir cevap gönder
    return NextResponse.json(
      { 
        message: error.message || "Bildirimler getirilemedi",
        notifications: [], 
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 }, 
        unreadCount: 0 
      },
      { status: 200 }
    );
  }
}

// Bildirimi okundu olarak işaretle
export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    
    // Oturum kontrolü
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { message: "Oturum açmanız gerekiyor" },
        { status: 401 }
      );
    }
    
    const { notificationId, markAllRead } = await req.json();
    
    if (markAllRead) {
      // Tüm bildirimleri okundu olarak işaretle
      await Notification.updateMany(
        { userId: session.user.id },
        { isRead: true }
      );
      
      // Önbelleği temizle - bu kullanıcıya ait tüm önbellek girdilerini temizle
      Object.keys(cache).forEach(key => {
        if (key.startsWith(`notifications:${session.user.id}:`)) {
          delete cache[key];
        }
      });
      
      return NextResponse.json({
        message: "Tüm bildirimler okundu olarak işaretlendi",
      });
    } else if (notificationId) {
      // Tek bir bildirimi okundu olarak işaretle
      if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        return NextResponse.json(
          { message: "Geçersiz bildirim ID'si" },
          { status: 400 }
        );
      }
      
      const notification = await Notification.findById(notificationId);
      
      if (!notification) {
        return NextResponse.json(
          { message: "Bildirim bulunamadı" },
          { status: 404 }
        );
      }
      
      // Kullanıcı kontrolü - Hem string hem de ObjectId karşılaştırması
      const notificationUserId = typeof notification.userId === 'object' 
        ? notification.userId.toString() 
        : notification.userId;
        
      if (notificationUserId !== session.user.id) {
        return NextResponse.json(
          { message: "Bu işlem için yetkiniz yok" },
          { status: 403 }
        );
      }
      
      notification.isRead = true;
      await notification.save();
      
      // Önbelleği temizle - bu kullanıcıya ait tüm önbellek girdilerini temizle
      Object.keys(cache).forEach(key => {
        if (key.startsWith(`notifications:${session.user.id}:`)) {
          delete cache[key];
        }
      });
      
      return NextResponse.json({
        message: "Bildirim okundu olarak işaretlendi",
        notification,
      });
    } else {
      return NextResponse.json(
        { message: "Bildirim ID'si veya markAllRead parametresi gerekli" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Bildirim güncelleme hatası:", error);
    return NextResponse.json(
      { message: "Bildirim güncellenemedi", error: error.message },
      { status: 500 }
    );
  }
}

// Bildirimi sil
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    
    // Oturum kontrolü
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { message: "Oturum açmanız gerekiyor" },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(req.url);
    const notificationId = searchParams.get("id");
    // Toplu silme için yeni parametre
    const deleteAll = searchParams.get("deleteAll") === "true";
    // Bildirim türüne göre silme parametresi
    const deleteByType = searchParams.get("type");
    
    // Toplu silme işlemi
    if (deleteAll) {
      await Notification.deleteMany({ userId: session.user.id });
      
      // Önbelleği temizle - bu kullanıcıya ait tüm önbellek girdilerini temizle
      Object.keys(cache).forEach(key => {
        if (key.startsWith(`notifications:${session.user.id}:`)) {
          delete cache[key];
        }
      });
      
      return NextResponse.json({
        message: "Tüm bildirimler başarıyla silindi",
      });
    }
    
    // Bildirim türüne göre silme işlemi
    if (deleteByType) {
      const validTypes = ["system", "invitation", "message", "like", "join", "reminder"];
      if (!validTypes.includes(deleteByType)) {
        return NextResponse.json(
          { message: "Geçersiz bildirim türü" },
          { status: 400 }
        );
      }
      
      await Notification.deleteMany({ 
        userId: session.user.id,
        type: deleteByType 
      });
      
      // Önbelleği temizle - bu kullanıcıya ait tüm önbellek girdilerini temizle
      Object.keys(cache).forEach(key => {
        if (key.startsWith(`notifications:${session.user.id}:`)) {
          delete cache[key];
        }
      });
      
      return NextResponse.json({
        message: `${deleteByType} türündeki tüm bildirimler başarıyla silindi`,
      });
    }
    
    // Tek bildirim silme işlemi - mevcut kod
    if (!notificationId) {
      return NextResponse.json(
        { message: "Bildirim ID'si, deleteAll veya type parametresi gerekli" },
        { status: 400 }
      );
    }
    
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return NextResponse.json(
        { message: "Geçersiz bildirim ID'si" },
        { status: 400 }
      );
    }
    
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      return NextResponse.json(
        { message: "Bildirim bulunamadı" },
        { status: 404 }
      );
    }
    
    // Kullanıcı kontrolü - Hem string hem de ObjectId karşılaştırması
    const notificationUserId = typeof notification.userId === 'object' 
      ? notification.userId.toString() 
      : notification.userId;
      
    if (notificationUserId !== session.user.id) {
      return NextResponse.json(
        { message: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }
    
    // Bildirimi sil
    await notification.deleteOne();
    
    // Önbelleği temizle - bu kullanıcıya ait tüm önbellek girdilerini temizle
    Object.keys(cache).forEach(key => {
      if (key.startsWith(`notifications:${session.user.id}:`)) {
        delete cache[key];
      }
    });
    
    return NextResponse.json({
      message: "Bildirim başarıyla silindi",
    });
  } catch (error: any) {
    console.error("Bildirim silme hatası:", error);
    return NextResponse.json(
      { message: "Bildirim silinemedi", error: error.message },
      { status: 500 }
    );
  }
} 
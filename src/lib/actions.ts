'use server';

import { connectDB } from './db';
// Büyük/küçük harf duyarlılığı sorununu çözmek için modelleri yeniden import ediyoruz
import Plan from '@/models/Plan';
import User from '@/models/User';
import Message from '@/models/Message';
import Transaction from '@/models/Transaction';
import AIMemory from '@/models/AIMemory';
import { IPlan, IUser, IMessage, ITransaction } from './types';
import { ObjectId, isValidObjectId } from 'mongoose';
import { revalidatePath } from 'next/cache';

// Transaction tipi tanımla
type TransactionType = "deposit" | "withdraw" | "refund";

// Kullanıcı işlemleri
export async function getUserByEmail(email: string) {
  try {
    connectDB();
    const user = await User.findOne({ email }).select('+password').lean();
    return user;
  } catch (error) {
    console.error('Kullanıcı getirme hatası:', error);
    throw new Error('Kullanıcı bilgisi getirilirken bir hata oluştu');
  }
}

export async function getUserById(id: string) {
  try {
    connectDB();
    return await User.findById(id);
  } catch (error) {
    console.error('Kullanıcı bulma hatası:', error);
    throw error;
  }
}

export async function getUserByUsername(username: string) {
  try {
    connectDB();
    return await User.findOne({ username });
  } catch (error) {
    console.error('Kullanıcı bulma hatası:', error);
    throw error;
  }
}

// MongoDB ObjectId'lerini stringe çevirmek için yardımcı fonksiyon
function safeStringify(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Array içindeki her öğeyi işle
  if (Array.isArray(obj)) {
    return obj.map(item => safeStringify(item));
  }
  
  // Nesne ise, yeni bir nesne oluştur ve değerleri kopyala
  if (typeof obj === 'object') {
    // Date nesnesini ISO string'e çevir
    if (obj instanceof Date) {
      return obj.toISOString();
    }
    
    // Önce yeni bir nesne oluştur
    const result: any = {};
    
    // ObjectId kontrolü
    if (obj._id) {
      // toString() çağrılabiliyorsa kullan
      if (typeof obj._id.toString === 'function') {
        result._id = obj._id.toString();
      } else {
        // Değilse olduğu gibi kopyala
        result._id = obj._id;
      }
    }
    
    // Diğer tüm alanları kopyala
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && key !== '_id') {
        // Özel alanlar için kontrol
        if (key === 'creator' && obj[key]) {
          if (typeof obj[key].toString === 'function') {
            // ObjectId ise stringe çevir
            result[key] = obj[key].toString();
          } else {
            // Zaten string ise olduğu gibi kopyala (Google ID)
            result[key] = obj[key];
          }
        }
        // oauth_creator_id alanını olduğu gibi kopyala
        else if (key === 'oauth_creator_id') {
          result[key] = obj[key];
        }
        // Tarih alanları için kontrol
        else if (['startDate', 'endDate', 'createdAt', 'updatedAt'].includes(key) && obj[key] instanceof Date) {
          result[key] = obj[key].toISOString();
        }
        // Diğer tüm alanlar için recursive işlem
        else {
          result[key] = safeStringify(obj[key]);
        }
      }
    }
    
    return result;
  }
  
  // Primitif değerleri olduğu gibi döndür
  return obj;
}

// Plan işlemleri
export async function getPlans(options: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  isFree?: boolean;
  isOnline?: boolean;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
} = {}) {
  try {
    connectDB();
    
    const {
      page = 1,
      limit = 10,
      search,
      isActive = true,
      isFree,
      isOnline,
      sortField = 'createdAt',
      sortOrder = 'desc',
    } = options || {};
    
    const skip = (page - 1) * limit;
    
    // Query oluştur
    const query: any = { isActive };
    
    if (typeof isFree === 'boolean') {
      query.isFree = isFree;
    }
    
    if (typeof isOnline === 'boolean') {
      query.isOnline = isOnline;
    }
    
    // Arama filtresi
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Sıralama
    const sort: any = {};
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;
    
    // Planları getir
    const plans = await Plan.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('creator', 'username firstName lastName profilePicture')
      .lean();
    
    // Toplam sayı
    const total = await Plan.countDocuments(query);
    
    // ObjectId ve Date nesnelerini düz JSON'a çevirme işlemi
    const serializedPlans = safeStringify(plans);
    
    return {
      plans: serializedPlans,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Planları getirme hatası:', error);
    throw new Error('Planlar getirilirken bir hata oluştu');
  }
}

export async function getPlanById(id: string) {
  try {
    connectDB();
    const plan = await Plan.findById(id)
      .populate('creator', 'username firstName lastName profilePicture')
      .populate('leaders', 'username firstName lastName profilePicture')
      .lean();
    
    if (!plan) {
      throw new Error('Plan bulunamadı');
    }
    
    // ObjectId ve Date nesnelerini düz JSON'a çevirme işlemi
    const serializedPlan = safeStringify(plan);
    
    return serializedPlan;
  } catch (error) {
    console.error('Plan detayı getirme hatası:', error);
    throw new Error('Plan detayı getirilirken bir hata oluştu');
  }
}

export async function getUserPlans(userId: string) {
  try {
    connectDB();
    
    console.log("getUserPlans çağrıldı, userId:", userId);
    
    if (!userId) {
      console.log("getUserPlans: userId boş");
      return { plans: [] };
    }
    
    let query: any = { isActive: true };
    
    // ObjectID kontrolü için isValidObjectId kullan
    if (isValidObjectId(userId)) {
      // MongoDB ObjectId formatındaysa, creator alanında ara
      query.creator = userId;
    } else {
      // Google ID ise oauth_creator_id alanında ara
      query.oauth_creator_id = userId;
      
      // Ayrıca string olarak creator alanında da kontrol et
      // query.creator = userId; // Bu satırı kaldırdık
    }
    
    console.log("Sorgu:", JSON.stringify(query));
    
    const plans = await Plan.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    console.log("Bulunan planlar:", plans.length);
    
    // ObjectId ve Date nesnelerini düz JSON'a çevirme işlemi
    const serializedPlans = safeStringify(plans);
    
    return { plans: serializedPlans };
  } catch (error) {
    console.error('Kullanıcı planları listeleme hatası:', error);
    return { plans: [] };
  }
}

export async function getUserSavedPlans(userId: string) {
  try {
    connectDB();
    
    console.log("getUserSavedPlans çağrıldı, userId:", userId);
    
    if (!userId) {
      console.log("getUserSavedPlans: userId boş");
      return { plans: [] };
    }
    
    // String olarak arıyoruz, Google ID'ler için
    const plans = await Plan.find({ 
      isActive: true,
      saves: userId.toString()
    })
    .sort({ createdAt: -1 })
    .lean();
    
    console.log("Bulunan kaydedilen planlar:", plans.length);
    
    // ObjectId ve Date nesnelerini düz JSON'a çevirme işlemi
    const serializedPlans = safeStringify(plans);
    
    return { plans: serializedPlans };
  } catch (error) {
    console.error('Kaydedilen planları listeleme hatası:', error);
    return { plans: [] };
  }
}

export async function getUserParticipatingPlans(userId: string) {
  try {
    connectDB();
    
    console.log("getUserParticipatingPlans çağrıldı, userId:", userId);
    
    if (!userId) {
      console.log("getUserParticipatingPlans: userId boş");
      return { plans: [] };
    }
    
    let query: any = { isActive: true };
    let mongoUserId = userId;
    
    // Google ID formatında mı kontrolü
    if (!isValidObjectId(userId)) {
      // Google ID için kullanıcıyı bul ve MongoDB ID'sini al
      const user = await User.findOne({ oauth_id: userId });
      
      if (user) {
        mongoUserId = user._id.toString();
        query.participants = mongoUserId;
        console.log("OAuth kullanıcısının MongoDB ID'si bulundu:", mongoUserId);
      } else {
        console.log("Google ID ile kullanıcı bulunamadı, boş dönülüyor");
        return { plans: [] };
      }
    } else {
      // MongoDB ObjectId formatında ise doğrudan kullan
      query.participants = mongoUserId;
    }
    
    const plans = await Plan.find(query)
      .sort({ startDate: 1 })
      .lean();
    
    console.log("Bulunan katılınan planlar:", plans.length);
    
    // ObjectId ve Date nesnelerini düz JSON'a çevirme işlemi
    const serializedPlans = safeStringify(plans);
    
    return { plans: serializedPlans };
  } catch (error) {
    console.error('Katılınan planları listeleme hatası:', error);
    return { plans: [] };
  }
}

// Mesaj işlemleri
export async function getPlanMessages(planId: string) {
  try {
    connectDB();
    const messages = await Message.find({ planId })
      .sort({ createdAt: 1 })
      .populate("userId", "username profilePicture")
      .lean();
    
    // ObjectId ve Date nesnelerini düz JSON'a çevirme işlemi
    return safeStringify(messages);
  } catch (error) {
    console.error("Plan mesajları listeleme hatası:", error);
    throw error;
  }
};

// Bakiye işlemleri
export async function getUserTransactions(userId: string) {
  try {
    connectDB();
    
    // Önce kullanıcıyı bul
    let user;
    
    // Google ID formatında mı (24 karakter olmayan) kontrolü
    if (userId.length !== 24 || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      // Eğer ObjectId formatında değilse oauth_id ile kullanıcıyı bul
      user = await User.findOne({ oauth_id: userId });
      
      if (!user) {
        throw new Error("Kullanıcı bulunamadı");
      }
      
      // Kullanıcının MongoDB _id'sini kullan
      userId = user._id.toString();
    }
    
    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .populate("planId", "title")
      .lean();

    return safeStringify(transactions);
  } catch (error) {
    console.error("Transactions error:", error);
    return [];
  }
}

// Kullanıcı bakiyesini güncelle
export async function updateUserBalance(
  userId: string,
  amount: number,
  type: TransactionType,
  planId?: string,
  description?: string
) {
  if (!userId || !amount || !type) {
    throw new Error("userId, amount ve type alanları gereklidir");
  }

  try {
    connectDB();
    
    // Kullanıcıyı bul
    let user;
    
    // Google ID formatında mı (24 karakter olmayan) kontrolü
    if (userId.length !== 24 || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      // Eğer ObjectId formatında değilse oauth_id ile kullanıcıyı bul
      user = await User.findOne({ oauth_id: userId });
      
      if (!user) {
        throw new Error("Kullanıcı bulunamadı");
      }
      
      // Kullanıcının MongoDB _id'sini kullan
      userId = user._id.toString();
    } else {
      user = await User.findById(userId);
      
      if (!user) {
        throw new Error("Kullanıcı bulunamadı");
      }
    }
    
    // Çekme işlemi için yetersiz bakiye kontrolü
    if (type === "withdraw" && user.balance < amount) {
      throw new Error("Yetersiz bakiye");
    }

    // Bakiyeyi güncelle
    const newBalance =
      type === "deposit"
        ? user.balance + amount
        : type === "withdraw" || type === "refund"
        ? user.balance - amount
        : user.balance;

    // planId kontrolü ve doğrulama
    let validPlanId = undefined;
    if (planId) {
      if (planId.length === 24 && /^[0-9a-fA-F]{24}$/.test(planId)) {
        // Plan gerçekten var mı kontrol et
        const planExists = await Plan.findById(planId);
        if (planExists) {
          validPlanId = planId;
        }
      }
    }

    // Transaction oluştur
    await Transaction.create({
      userId,
      amount,
      type,
      planId: validPlanId,
      description,
    });

    // Kullanıcı bakiyesini güncelle
    await User.findByIdAndUpdate(userId, { balance: newBalance });

    return newBalance;
  } catch (error) {
    console.error("Bakiye güncelleme hatası:", error);
    throw error;
  }
}

// AI bellek işlemleri
export const getAIMemory = async (userId: string) => {
  try {
    connectDB();
    const memory = await AIMemory.findOne({ userId });
    if (!memory) {
      // Bellek yoksa yeni oluştur
      return await AIMemory.create({ userId, preferences: {} });
    }
    return memory;
  } catch (error) {
    console.error("AI bellek alma hatası:", error);
    throw error;
  }
};

export const updateAIMemory = async (userId: string, preferences: Record<string, any>) => {
  try {
    connectDB();
    return await AIMemory.findOneAndUpdate(
      { userId },
      { preferences, lastInteraction: new Date() },
      { new: true, upsert: true }
    );
  } catch (error) {
    console.error("AI bellek güncelleme hatası:", error);
    throw error;
  }
};

export const clearAIMemory = async (userId: string) => {
  try {
    connectDB();
    return await AIMemory.findOneAndUpdate(
      { userId },
      { preferences: {}, lastInteraction: new Date() },
      { new: true }
    );
  } catch (error) {
    console.error("AI bellek temizleme hatası:", error);
    throw error;
  }
};

export async function likePlan({
  userId,
  planId,
}: {
  userId: string;
  planId: string;
}) {
  try {
    connectDB();

    const plan = await Plan.findById(planId);
    
    if (!plan) {
      throw new Error('Plan bulunamadı');
    }

    // Kullanıcı beğenmiş mi kontrol et
    const userLikedIdx = plan.likes?.findIndex((id: any) => 
      id === userId || (id && id.toString && id.toString() === userId)
    );
    
    const userLiked = userLikedIdx !== -1 && userLikedIdx !== undefined;

    if (userLiked) {
      // Kullanıcı halihazırda beğenmişse, beğeniyi kaldır
      plan.likes = plan.likes?.filter((id: any) => 
        id !== userId && (!id || !id.toString || id.toString() !== userId)
      ) || [];
      
      await plan.save();
    } else {
      // Kullanıcı beğenmemişse, beğeni ekle
      plan.likes = plan.likes || [];
      plan.likes.push(userId);
      
      await plan.save();
    }

    return { success: true };
  } catch (error) {
    console.error('Beğeni işlemi hatası:', error);
    throw new Error('Beğeni işlemi sırasında bir hata oluştu');
  }
}

export async function savePlan({
  userId,
  planId,
}: {
  userId: string;
  planId: string;
}) {
  try {
    connectDB();

    const plan = await Plan.findById(planId);
    
    if (!plan) {
      throw new Error('Plan bulunamadı');
    }

    // Kullanıcı kaydetmiş mi kontrol et
    const userSavedIdx = plan.saves?.findIndex((id: any) => 
      id === userId || (id && id.toString && id.toString() === userId)
    );
    
    const userSaved = userSavedIdx !== -1 && userSavedIdx !== undefined;

    if (userSaved) {
      // Kullanıcı halihazırda kaydetmişse, kaydı kaldır
      plan.saves = plan.saves?.filter((id: any) => 
        id !== userId && (!id || !id.toString || id.toString() !== userId)
      ) || [];
      
      await plan.save();
    } else {
      // Kullanıcı kaydetmemişse, kayıt ekle
      plan.saves = plan.saves || [];
      plan.saves.push(userId);
      
      await plan.save();
    }

    return { success: true };
  } catch (error) {
    console.error('Kaydetme işlemi hatası:', error);
    throw new Error('Kaydetme işlemi sırasında bir hata oluştu');
  }
}

export async function getUserLikedPlans(userId: string) {
  try {
    connectDB();
    
    console.log("getUserLikedPlans çağrıldı, userId:", userId);
    
    if (!userId) {
      console.log("getUserLikedPlans: userId boş");
      return { plans: [] };
    }
    
    // String olarak arıyoruz, Google ID'ler için
    const plans = await Plan.find({ 
      isActive: true,
      likes: userId.toString()
    })
    .sort({ createdAt: -1 })
    .lean();
    
    console.log("Bulunan beğenilen planlar:", plans.length);
    
    // ObjectId ve Date nesnelerini düz JSON'a çevirme işlemi
    const serializedPlans = safeStringify(plans);
    
    return { plans: serializedPlans };
  } catch (error) {
    console.error('Beğenilen planları listeleme hatası:', error);
    return { plans: [] };
  }
}

/**
 * Yeni bildirim oluştur
 * @param userId Bildirim alıcısının ID'si
 * @param type Bildirim türü
 * @param title Bildirim başlığı
 * @param message Bildirim mesajı
 * @param link İsteğe bağlı bağlantı
 * @returns Oluşturulan bildirim nesnesi 
 */
export const createNotification = async (
  userId: string,
  type: 'system' | 'invitation' | 'message' | 'like' | 'join' | 'reminder',
  title: string,
  message: string,
  link?: string
) => {
  try {
    const response = await fetch('/api/notifications/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        type,
        title,
        message,
        link,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Bildirim oluşturma hatası:', error);
      return null;
    }

    const data = await response.json();
    return data.notification;
  } catch (error) {
    console.error('Bildirim oluşturma hatası:', error);
    return null;
  }
}; 
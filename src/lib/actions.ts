'use server';

import { connectDB } from './db';
import Plan from '@/models/Plan';
import User from '@/models/User';
import Message from '@/models/Message';
import Transaction from '@/models/Transaction';
import AIMemory from '@/models/AIMemory';
import { IPlan, IUser, IMessage, ITransaction } from './types';
import { ObjectId } from 'mongoose';
import { revalidatePath } from 'next/cache';

// Kullanıcı işlemleri
export async function getUserByEmail(email: string) {
  try {
    await connectDB();
    const user = await User.findOne({ email }).select('+password').lean();
    return user;
  } catch (error) {
    console.error('Kullanıcı getirme hatası:', error);
    throw new Error('Kullanıcı bilgisi getirilirken bir hata oluştu');
  }
}

export async function getUserById(id: string) {
  try {
    await connectDB();
    return await User.findById(id);
  } catch (error) {
    console.error('Kullanıcı bulma hatası:', error);
    throw error;
  }
}

export async function getUserByUsername(username: string) {
  try {
    await connectDB();
    return await User.findOne({ username });
  } catch (error) {
    console.error('Kullanıcı bulma hatası:', error);
    throw error;
  }
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
}) {
  try {
    await connectDB();
    
    const {
      page = 1,
      limit = 10,
      search,
      isActive = true,
      isFree,
      isOnline,
      sortField = 'createdAt',
      sortOrder = 'desc',
    } = options;
    
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
    
    return {
      plans,
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
    await connectDB();
    const plan = await Plan.findById(id)
      .populate('creator', 'username firstName lastName profilePicture')
      .populate('leaders', 'username firstName lastName profilePicture')
      .lean();
    
    if (!plan) {
      throw new Error('Plan bulunamadı');
    }
    
    return plan;
  } catch (error) {
    console.error('Plan detayı getirme hatası:', error);
    throw new Error('Plan detayı getirilirken bir hata oluştu');
  }
}

export async function getUserPlans(userId: string) {
  try {
    await connectDB();
    return await Plan.find({ creator: userId, isActive: true })
      .sort({ createdAt: -1 });
  } catch (error) {
    console.error('Kullanıcı planları listeleme hatası:', error);
    throw error;
  }
}

export async function getUserSavedPlans(userId: string) {
  try {
    await connectDB();
    return await Plan.find({ saves: userId, isActive: true })
      .sort({ createdAt: -1 });
  } catch (error) {
    console.error('Kaydedilen planları listeleme hatası:', error);
    throw error;
  }
}

export async function getUserParticipatingPlans(userId: string) {
  try {
    await connectDB();
    return await Plan.find({ participants: userId, isActive: true })
      .sort({ startDate: 1 });
  } catch (error) {
    console.error('Katılınan planları listeleme hatası:', error);
    throw error;
  }
}

// Mesaj işlemleri
export async function getPlanMessages(planId: string) {
  try {
    await connectDB();
    return await Message.find({ planId })
      .sort({ createdAt: 1 })
      .populate("userId", "username profilePicture");
  } catch (error) {
    console.error("Plan mesajları listeleme hatası:", error);
    throw error;
  }
};

// Bakiye işlemleri
export const getUserTransactions = async (userId: string) => {
  try {
    await connectDB();
    return await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .populate("planId", "title");
  } catch (error) {
    console.error("Bakiye işlemleri listeleme hatası:", error);
    throw error;
  }
};

// Kullanıcı bakiyesini güncelle
export const updateUserBalance = async (userId: string, amount: number, type: "deposit" | "withdrawal" | "refund", description?: string, planId?: string) => {
  try {
    await connectDB();
    
    // İşlemi oluştur
    const transaction = await Transaction.create({
      userId,
      amount,
      type,
      description,
      planId,
    });
    
    // Kullanıcı bakiyesini güncelle
    const user = await User.findById(userId);
    if (!user) throw new Error("Kullanıcı bulunamadı");
    
    if (type === "deposit" || type === "refund") {
      user.balance += amount;
    } else if (type === "withdrawal") {
      if (user.balance < amount) throw new Error("Yetersiz bakiye");
      user.balance -= amount;
    }
    
    await user.save();
    
    return { transaction, userBalance: user.balance };
  } catch (error) {
    console.error("Bakiye güncelleme hatası:", error);
    throw error;
  }
};

// AI bellek işlemleri
export const getAIMemory = async (userId: string) => {
  try {
    await connectDB();
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
    await connectDB();
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
    await connectDB();
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
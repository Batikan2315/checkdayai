import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import User from "@/models/User";
import Plan from "@/models/Plan";
import Notification from "@/models/Notification";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    // Sadece admin rolündeki kullanıcılar bu işlemi yapabilir
    // Gerçek uygulamada burada bir yetki kontrolü yapılması gerekir

    // Tüm koleksiyonları sıfırla
    await Promise.all([
      User.deleteMany({}),
      Plan.deleteMany({}),
      Notification.deleteMany({}),
      // Diğer koleksiyonlar
    ]);

    // Admin kullanıcısı oluştur
    const adminUser = new User({
      username: "batikan_admin",
      email: "batikan@checkday.org",
      password: await bcrypt.hash("checkday123", 10),
      firstName: "Batıkan",
      lastName: "Admin",
      isVerified: true,
      role: "admin",
      balance: 0,
    });

    await adminUser.save();

    // Normal test kullanıcısı oluştur
    const testUser = new User({
      username: "testuser",
      email: "test@checkday.org",
      password: await bcrypt.hash("test123", 10),
      firstName: "Test",
      lastName: "User",
      isVerified: true,
      role: "user",
      balance: 100,
    });

    await testUser.save();

    // Hoş geldin bildirimi oluştur
    const adminNotification = new Notification({
      userId: adminUser._id,
      type: "system",
      title: "Hoş Geldiniz",
      message: "CheckDay Admin paneline hoş geldiniz! Sisteminiz başarıyla sıfırlandı.",
      isRead: false
    });

    await adminNotification.save();

    return NextResponse.json({
      message: "Veritabanı başarıyla sıfırlandı",
      adminCreated: {
        email: adminUser.email,
        username: adminUser.username
      }
    });
  } catch (error: any) {
    console.error("Veritabanı sıfırlama hatası:", error);
    return NextResponse.json(
      { message: "Veritabanı sıfırlanamadı", error: error.message },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { verifyEmailToken } from "@/lib/auth";
import bcryptjs from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const { token, password } = await req.json();
    
    // Token ve şifre gerekli
    if (!token || !password) {
      return NextResponse.json(
        { message: "Token ve yeni şifre gereklidir" },
        { status: 400 }
      );
    }
    
    // Şifre uzunluğunu kontrol et
    if (password.length < 6) {
      return NextResponse.json(
        { message: "Şifre en az 6 karakter olmalıdır" },
        { status: 400 }
      );
    }
    
    // Token'ı doğrula
    const email = verifyEmailToken(token);
    if (!email) {
      return NextResponse.json(
        { message: "Geçersiz veya süresi dolmuş token" },
        { status: 400 }
      );
    }
    
    // Kullanıcıyı bul
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { message: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }
    
    // Şifreyi hashle
    const hashedPassword = await bcryptjs.hash(password, 10);
    
    // Şifreyi güncelle
    user.password = hashedPassword;
    await user.save();
    
    return NextResponse.json(
      { message: "Şifre başarıyla güncellendi" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Şifre güncelleme hatası:", error);
    return NextResponse.json(
      { message: "Şifre güncellenirken bir hata oluştu", error: error.message },
      { status: 500 }
    );
  }
} 
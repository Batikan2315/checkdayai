import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { generateToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    // JSON verisini çıkar
    const { email, password } = await req.json();
    
    // Gerekli alanları kontrol et
    if (!email || !password) {
      return NextResponse.json(
        { 
          message: "Email ve şifre gereklidir", 
          code: "MISSING_FIELDS" 
        }, 
        { status: 400 }
      );
    }
    
    console.log(`Giriş denemesi: ${email}`);
    
    // Kullanıcıyı bul - şifreyi de dahil et
    const user = await User.findOne({ email }).select("+password");
    
    // Kullanıcı yoksa hata döndür
    if (!user) {
      console.log(`Kullanıcı bulunamadı: ${email}`);
      return NextResponse.json(
        { 
          message: "Geçersiz email veya şifre", 
          code: "INVALID_CREDENTIALS" 
        }, 
        { status: 401 }
      );
    }
    
    // Kullanıcı, şifresi olmayan Google hesabıysa
    if (user.oauth_id && !user.password) {
      return NextResponse.json(
        { 
          message: "Bu hesap Google ile kaydedilmiş ve henüz şifre belirlenmemiş. Lütfen Google ile giriş yapın veya 'Şifremi Unuttum' seçeneğini kullanarak bir şifre belirleyin.", 
          code: "GOOGLE_USER_NO_PASSWORD" 
        }, 
        { status: 400 }
      );
    }
    
    // E-posta doğrulanmış mı kontrol et
    if (!user.isVerified) {
      return NextResponse.json(
        { 
          message: "Lütfen önce e-posta adresinizi doğrulayın", 
          code: "EMAIL_NOT_VERIFIED" 
        }, 
        { status: 403 }
      );
    }
    
    // Şifre doğru mu kontrol et
    console.log("Şifre kontrolü yapılıyor...");
    const isMatch = await user.comparePassword(password);
    
    console.log("Şifre eşleşme sonucu:", isMatch);
    
    if (!isMatch) {
      return NextResponse.json(
        { 
          message: "Geçersiz email veya şifre", 
          code: "INVALID_CREDENTIALS" 
        }, 
        { status: 401 }
      );
    }

    // Token oluştur
    const tokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role
    };
    
    const token = generateToken(tokenPayload);
    
    // Kullanıcı bilgilerini döndür (şifre olmadan)
    const userData = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      role: user.role || "user",
      profilePicture: user.profilePicture,
      isVerified: user.isVerified,
      token
    };
    
    console.log(`Başarılı giriş: ${email}`);
    
    return NextResponse.json(userData);
  } catch (error: any) {
    console.error("Giriş hatası:", error);
    
    return NextResponse.json(
      { 
        message: error.message || "Bir hata oluştu", 
        code: "SERVER_ERROR" 
      }, 
      { status: 500 }
    );
  }
} 
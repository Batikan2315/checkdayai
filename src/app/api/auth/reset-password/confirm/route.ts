import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const { token, newPassword } = await req.json();
    
    // Token ve şifre gerekli
    if (!token || !newPassword) {
      return NextResponse.json(
        { 
          message: "Token ve yeni şifre gereklidir",
          code: "MISSING_FIELDS" 
        },
        { status: 400 }
      );
    }
    
    // Şifre uzunluğunu kontrol et
    if (newPassword.length < 6) {
      return NextResponse.json(
        { 
          message: "Şifre en az 6 karakter olmalıdır",
          code: "PASSWORD_TOO_SHORT" 
        },
        { status: 400 }
      );
    }
    
    // Tokeni doğrula
    let decodedToken: any;
    try {
      const secret = process.env.JWT_SECRET || 'gizli-anahtar';
      decodedToken = jwt.verify(token, secret);
    } catch (error) {
      return NextResponse.json(
        { 
          message: "Geçersiz veya süresi dolmuş token",
          code: "INVALID_TOKEN" 
        },
        { status: 400 }
      );
    }
    
    // Kullanıcıyı bul
    const user = await User.findOne({ email: decodedToken.email });
    
    if (!user) {
      return NextResponse.json(
        { 
          message: "Kullanıcı bulunamadı",
          code: "USER_NOT_FOUND" 
        },
        { status: 404 }
      );
    }
    
    // Şifreyi hash'le
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Şifreyi güncelle ve kullanıcıyı kaydet
    user.password = hashedPassword;
    await user.save();
    
    // İşlem başarılı
    return NextResponse.json(
      { 
        message: "Şifreniz başarıyla güncellendi. Şimdi giriş yapabilirsiniz.",
        code: "PASSWORD_RESET_SUCCESS" 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Şifre sıfırlama doğrulama hatası:", error);
    return NextResponse.json(
      { 
        message: "Şifre güncellenirken bir hata oluştu",
        error: error.message,
        code: "SERVER_ERROR" 
      },
      { status: 500 }
    );
  }
} 
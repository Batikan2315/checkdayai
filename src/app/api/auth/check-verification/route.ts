import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json(
        { message: "E-posta adresi gereklidir", errorCode: "missing_email" },
        { status: 400 }
      );
    }
    
    // Kullanıcıyı bul
    const user = await User.findOne({ email });
    
    if (!user) {
      return NextResponse.json(
        { message: "Bu e-posta adresiyle kayıtlı bir kullanıcı bulunamadı", isVerified: false, errorCode: "user_not_found" },
        { status: 404 }
      );
    }
    
    // Kullanıcının doğrulama durumunu döndür
    return NextResponse.json({
      isVerified: user.isVerified,
      message: user.isVerified 
        ? "E-posta adresiniz doğrulanmış" 
        : "E-posta adresiniz henüz doğrulanmamış",
      errorCode: user.isVerified ? null : "email_not_verified"  
    });
    
  } catch (error: any) {
    console.error("Doğrulama durumu kontrol hatası:", error);
    return NextResponse.json(
      { message: "Bir hata oluştu", error: error.message, isVerified: false, errorCode: "server_error" },
      { status: 500 }
    );
  }
} 
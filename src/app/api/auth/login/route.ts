import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { generateToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const { email, password } = await req.json();
    
    // Gerekli alanları kontrol et
    if (!email || !password) {
      return NextResponse.json(
        { message: "E-posta ve şifre gereklidir" },
        { status: 400 }
      );
    }
    
    // Kullanıcıyı e-posta ile bul
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { message: "Geçersiz e-posta veya şifre" },
        { status: 401 }
      );
    }
    
    // Şifreyi kontrol et
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return NextResponse.json(
        { message: "Geçersiz e-posta veya şifre" },
        { status: 401 }
      );
    }
    
    // JWT token oluştur
    const token = generateToken(user._id.toString(), user.email, user.role);
    
    return NextResponse.json(
      {
        message: "Giriş başarılı",
        token,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          profilePicture: user.profilePicture,
          isVerified: user.isVerified,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Giriş hatası:", error);
    return NextResponse.json(
      { message: "Giriş sırasında bir hata oluştu", error: error.message },
      { status: 500 }
    );
  }
} 
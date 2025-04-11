import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { generateToken, generateVerificationToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const { email, password, username, firstName, lastName } = await req.json();
    
    // Gerekli alanları kontrol et
    if (!email || !password) {
      return NextResponse.json(
        { message: "E-posta ve şifre gereklidir" },
        { status: 400 }
      );
    }
    
    // E-posta formatını kontrol et
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Geçerli bir e-posta adresi giriniz" },
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
    
    // E-posta ve kullanıcı adı benzersizliğini kontrol et
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return NextResponse.json(
        { message: "Bu e-posta adresi zaten kullanımda" },
        { status: 400 }
      );
    }
    
    if (username) {
      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
        return NextResponse.json(
          { message: "Bu kullanıcı adı zaten kullanımda" },
          { status: 400 }
        );
      }
    }
    
    // Yeni kullanıcı oluştur
    const newUser = new User({
      email,
      password,
      username: username || email.split("@")[0],
      firstName,
      lastName,
      isVerified: false,
      role: "user",
    });
    
    // Otomatik kullanıcı adı oluştur
    if (!username) {
      await newUser.generateUsername();
    }
    
    // Kullanıcıyı kaydet
    await newUser.save();
    
    // Doğrulama token'ı oluştur
    const verificationToken = generateVerificationToken(email);
    
    // Doğrulama e-postası gönder - Bu örnek için atlanıyor
    // await sendVerificationEmail(email, verificationToken);
    
    return NextResponse.json(
      {
        message: "Kullanıcı başarıyla kaydedildi",
        user: {
          id: newUser._id,
          email: newUser.email,
          username: newUser.username,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Kayıt hatası:", error);
    return NextResponse.json(
      { message: "Kayıt sırasında bir hata oluştu", error: error.message },
      { status: 500 }
    );
  }
} 
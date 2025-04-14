import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { generateToken, generateVerificationToken } from "@/lib/auth";
import nodemailer from "nodemailer";
import bcryptjs from "bcryptjs";

// Sistem tarafından rezerve edilmiş kullanıcı adları
const RESERVED_USERNAMES = [
  // İngilizce URL'ler
  'admin', 'plans', 'calendar', 'profile', 'api', 'login', 'register', 'plan', 'ai-check',
  'about', 'help', 'support', 'contact', 'terms', 'privacy',
  'settings', 'notifications', 'messages', 'search', 'explore', 'home', 'trending',
  'checkday', 'app', 'dashboard', 'user', 'users', 'account', 'accounts', 'auth',
  'static', 'assets', 'public', 'images', 'js', 'css', 'reset-password',
  
  // Türkçe karşılıkları (geçici olarak hem İngilizce hem Türkçe korunacak)
  'planlar', 'takvim', 'profil', 'giris', 'kayit', 'sifremi-sifirla'
];

// E-posta gönderme fonksiyonu
async function sendVerificationEmail(email: string, token: string) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Nodemailer transport oluştur (Gmail)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || "your-gmail@gmail.com",
      pass: process.env.EMAIL_PASSWORD || "your-gmail-password",
    },
  });

  // E-posta içeriği
  const mailOptions = {
    from: process.env.EMAIL_USER || "your-gmail@gmail.com",
    to: email,
    subject: "CheckDay - E-posta Doğrulama",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">E-posta Doğrulama</h2>
        <p>CheckDay hesabınızı doğrulamak için aşağıdaki bağlantıya tıklayın:</p>
        <p style="margin: 25px 0;">
          <a href="${APP_URL}/api/auth/verify-email?token=${token}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">E-postamı Doğrula</a>
        </p>
        <p>Bu bağlantı 24 saat içinde geçerliliğini yitirecektir.</p>
        <p>Bu e-postayı siz talep etmediyseniz, lütfen dikkate almayın.</p>
        <p style="margin-top: 30px; font-size: 12px; color: #777;">
          &copy; ${new Date().getFullYear()} CheckDay. Tüm hakları saklıdır.
        </p>
      </div>
    `,
  };

  // E-postayı gönder
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Doğrulama e-postası gönderildi:", info.messageId);
    return true;
  } catch (error) {
    console.error("E-posta gönderme hatası:", error);
    return false;
  }
}

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
    
    // Kullanıcı adı için ek kontroller
    if (username) {
      // Kullanıcı adı formatını kontrol et
      const usernameRegex = /^[a-zA-Z0-9_.]+$/;
      if (!usernameRegex.test(username)) {
        return NextResponse.json(
          { message: "Kullanıcı adı sadece harf, rakam, nokta ve alt çizgi içerebilir" },
          { status: 400 }
        );
      }
      
      // Kullanıcı adı uzunluğunu kontrol et
      if (username.length < 3 || username.length > 20) {
        return NextResponse.json(
          { message: "Kullanıcı adı 3-20 karakter arasında olmalıdır" },
          { status: 400 }
        );
      }
      
      // Rezerve edilmiş kullanıcı adlarını kontrol et
      if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
        return NextResponse.json(
          { message: "Bu kullanıcı adı sistem tarafından rezerve edilmiştir ve kullanılamaz" },
          { status: 400 }
        );
      }
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
      const usernameExists = await User.findOne({ username: username.toLowerCase() });
      if (usernameExists) {
        return NextResponse.json(
          { message: "Bu kullanıcı adı zaten kullanımda" },
          { status: 400 }
        );
      }
    }
    
    // Şifreyi hashle
    const hashedPassword = await bcryptjs.hash(password, 10);
    
    // Yeni kullanıcı oluştur
    const newUser = new User({
      username: username ? username.toLowerCase() : undefined,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      isVerified: false,
      role: "user"
    });
    
    // Otomatik kullanıcı adı oluşturma - Model'deki validator tarafından kontrol edilecek
    if (!username) {
      await newUser.generateUsername();
    }
    
    // Doğrulama token'ı oluştur
    const verificationToken = generateVerificationToken(email);
    
    // Doğrulama e-postası gönder
    const emailSent = await sendVerificationEmail(email, verificationToken);
    
    // Kullanıcıyı kaydet
    await newUser.save();
    
    return NextResponse.json(
      {
        message: "Kullanıcı başarıyla kaydedildi. Lütfen e-postanızı kontrol edin ve hesabınızı doğrulayın.",
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
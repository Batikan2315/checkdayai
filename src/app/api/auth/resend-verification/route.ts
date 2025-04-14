import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { generateVerificationToken } from "@/lib/auth";
import nodemailer from "nodemailer";

// E-posta gönderme fonksiyonu
async function sendVerificationEmail(email: string, token: string) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Nodemailer transport oluştur
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // E-posta içeriği
  const mailOptions = {
    from: process.env.EMAIL_USER,
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
    return true;
  } catch (error) {
    return false;
  }
}

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
        { message: "Bu e-posta adresiyle kayıtlı bir kullanıcı bulunamadı", errorCode: "user_not_found" },
        { status: 404 }
      );
    }
    
    // Kullanıcı zaten doğrulanmış mı kontrol et
    if (user.isVerified) {
      return NextResponse.json(
        { message: "E-posta adresiniz zaten doğrulanmış. Giriş yapabilirsiniz.", errorCode: "already_verified" },
        { status: 200 }
      );
    }
    
    // Yeni doğrulama token'ı oluştur
    const verificationToken = generateVerificationToken(email);
    
    // Doğrulama e-postasını gönder
    const emailSent = await sendVerificationEmail(email, verificationToken);
    
    if (emailSent) {
      return NextResponse.json(
        { message: "Doğrulama e-postası başarıyla gönderildi. Lütfen e-postanızı kontrol edin." },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { message: "Doğrulama e-postası gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.", errorCode: "email_send_failed" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { message: "Bir hata oluştu", error: error.message, errorCode: "server_error" },
      { status: 500 }
    );
  }
} 
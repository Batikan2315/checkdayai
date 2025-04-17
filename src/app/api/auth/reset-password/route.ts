import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { generateResetToken } from "@/lib/auth";
import nodemailer from "nodemailer";

// Şifre sıfırlama e-postası gönderme fonksiyonu
async function sendPasswordResetEmail(email: string, token: string) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    // Nodemailer transport oluştur (Gmail)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error("E-posta gönderimi için kullanıcı adı veya şifre eksik.");
      throw new Error("E-posta yapılandırması eksik");
    }

    // E-posta içeriği
    const mailOptions = {
      from: `"CheckDay" <${process.env.EMAIL_USER || "destek@checkday.ai"}>`,
      to: email,
      subject: "CheckDay - Şifre Sıfırlama",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">Şifre Sıfırlama</h2>
          <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
          <p style="margin: 25px 0;">
            <a href="${APP_URL}/reset-password?token=${token}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Şifremi Sıfırla</a>
          </p>
          <p>Bu bağlantı 1 saat içinde geçerliliğini yitirecektir.</p>
          <p>Bu e-postayı siz talep etmediyseniz, lütfen dikkate almayın.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #777;">
            &copy; ${new Date().getFullYear()} CheckDay. Tüm hakları saklıdır.
          </p>
        </div>
      `,
    };

    // E-postayı gönder
    const info = await transporter.sendMail(mailOptions);
    console.log("Şifre sıfırlama e-postası gönderildi:", info.messageId);
    return true;
  } catch (error) {
    console.error("E-posta gönderme hatası:", error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    // Gelen verileri kontrol et
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("İstek gövdesi ayrıştırma hatası:", parseError);
      return NextResponse.json(
        { 
          message: "Geçersiz istek formatı",
          code: "INVALID_REQUEST_FORMAT"
        },
        { status: 400 }
      );
    }
    
    const { email } = body;
    
    // E-posta gerekli
    if (!email) {
      return NextResponse.json(
        { 
          message: "E-posta adresi gereklidir",
          code: "EMAIL_REQUIRED"
        },
        { status: 400 }
      );
    }
    
    // E-posta formatını kontrol et
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          message: "Geçerli bir e-posta adresi giriniz",
          code: "INVALID_EMAIL_FORMAT"
        },
        { status: 400 }
      );
    }
    
    // Kullanıcıyı bul
    const user = await User.findOne({ email });
    
    // Kullanıcı yoksa bile başarılı yanıt dön (güvenlik için)
    if (!user) {
      // Güvenlik nedeniyle başarılı mesajı dön ama e-posta gönderme
      return NextResponse.json(
        { 
          message: "Şifre sıfırlama bağlantısı gönderildi. Lütfen e-postanızı kontrol edin.",
          code: "EMAIL_SENT"
        },
        { status: 200 }
      );
    }
    
    // Şifre sıfırlama tokeni oluştur
    const resetToken = generateResetToken(email);
    
    // E-posta gönder
    const emailSent = await sendPasswordResetEmail(email, resetToken);
    
    if (!emailSent) {
      return NextResponse.json(
        { 
          message: "E-posta gönderirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
          code: "EMAIL_SEND_ERROR"
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        message: "Şifre sıfırlama bağlantısı gönderildi. Lütfen e-postanızı kontrol edin.",
        code: "EMAIL_SENT"
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Şifre sıfırlama hatası:", error);
    return NextResponse.json(
      { 
        message: "Şifre sıfırlama sırasında bir hata oluştu", 
        error: error.message,
        code: "SERVER_ERROR"
      },
      { status: 500 }
    );
  }
} 
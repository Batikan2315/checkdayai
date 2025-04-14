import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { verifyEmailToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // URL'den token'ı al
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return new Response("Geçersiz doğrulama bağlantısı", {
        status: 400,
        headers: {
          "Content-Type": "text/html",
        },
      });
    }

    await connectDB();

    // Token'ı doğrula
    const email = verifyEmailToken(token);
    if (!email) {
      return new Response(
        `
        <html>
          <head>
            <title>E-posta Doğrulama Hatası</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 40px 20px; }
              .container { max-width: 600px; margin: 0 auto; }
              h1 { color: #e74c3c; }
              .button { display: inline-block; background-color: #3498db; color: white; padding: 10px 20px; 
                text-decoration: none; border-radius: 5px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Doğrulama Bağlantısı Geçersiz</h1>
              <p>Bu doğrulama bağlantısı geçersiz veya süresi dolmuş. Lütfen yeni bir doğrulama bağlantısı talep edin.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/giris" class="button">Giriş Sayfasına Dön</a>
            </div>
          </body>
        </html>
        `,
        {
          status: 400,
          headers: {
            "Content-Type": "text/html",
          },
        }
      );
    }

    // Kullanıcıyı bul ve doğrula
    const user = await User.findOne({ email });
    if (!user) {
      return new Response(
        `
        <html>
          <head>
            <title>E-posta Doğrulama Hatası</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 40px 20px; }
              .container { max-width: 600px; margin: 0 auto; }
              h1 { color: #e74c3c; }
              .button { display: inline-block; background-color: #3498db; color: white; padding: 10px 20px; 
                text-decoration: none; border-radius: 5px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Kullanıcı Bulunamadı</h1>
              <p>Bu e-posta adresiyle kayıtlı bir kullanıcı bulunamadı. Lütfen önce kayıt olun.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/giris" class="button">Giriş Sayfasına Dön</a>
            </div>
          </body>
        </html>
        `,
        {
          status: 404,
          headers: {
            "Content-Type": "text/html",
          },
        }
      );
    }

    // Kullanıcı zaten doğrulanmış mı?
    if (user.isVerified) {
      return new Response(
        `
        <html>
          <head>
            <title>E-posta Zaten Doğrulanmış</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 40px 20px; }
              .container { max-width: 600px; margin: 0 auto; }
              h1 { color: #27ae60; }
              .button { display: inline-block; background-color: #3498db; color: white; padding: 10px 20px; 
                text-decoration: none; border-radius: 5px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>E-posta Zaten Doğrulanmış</h1>
              <p>E-posta adresiniz zaten doğrulanmış. Hesabınıza giriş yapabilirsiniz.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/giris" class="button">Giriş Yap</a>
            </div>
          </body>
        </html>
        `,
        {
          status: 200,
          headers: {
            "Content-Type": "text/html",
          },
        }
      );
    }

    // Kullanıcıyı doğrula
    user.isVerified = true;
    await user.save();

    // Başarılı doğrulama sayfası
    return new Response(
      `
      <html>
        <head>
          <title>E-posta Doğrulandı</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 40px 20px; }
            .container { max-width: 600px; margin: 0 auto; }
            h1 { color: #27ae60; }
            .success-icon { font-size: 60px; color: #27ae60; margin-bottom: 20px; }
            .button { display: inline-block; background-color: #3498db; color: white; padding: 10px 20px; 
              text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✓</div>
            <h1>E-posta Doğrulandı</h1>
            <p>E-posta adresiniz başarıyla doğrulandı. Artık hesabınıza giriş yapabilirsiniz.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/giris" class="button">Giriş Yap</a>
          </div>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html",
        },
      }
    );
  } catch (error: any) {
    console.error("E-posta doğrulama hatası:", error);
    
    return new Response(
      `
      <html>
        <head>
          <title>Sunucu Hatası</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 40px 20px; }
            .container { max-width: 600px; margin: 0 auto; }
            h1 { color: #e74c3c; }
            .button { display: inline-block; background-color: #3498db; color: white; padding: 10px 20px; 
              text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Sunucu Hatası</h1>
            <p>E-posta doğrulama sırasında bir sorun oluştu. Lütfen daha sonra tekrar deneyin.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/giris" class="button">Giriş Sayfasına Dön</a>
          </div>
        </body>
      </html>
      `,
      {
        status: 500,
        headers: {
          "Content-Type": "text/html",
        },
      }
    );
  }
} 
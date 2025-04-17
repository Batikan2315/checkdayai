import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    connectDB();

    const body = await req.json();
    const { userId, username, firstName, lastName, password } = body;

    if (!userId || !username) {
      return NextResponse.json({ message: "Kullanıcı ID ve kullanıcı adı zorunludur" }, { status: 400 });
    }

    // Kullanıcı adı validasyonu
    const usernameRegex = /^[a-z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { message: "Kullanıcı adı sadece küçük harf, rakam ve alt çizgi içerebilir" },
        { status: 400 }
      );
    }

    // Önce kullanıcıyı bul
    let user;
    
    // Google ID formatında mı (24 karakter olmayan) kontrolü
    const isMongoObjectId = userId.length === 24 && /^[0-9a-fA-F]{24}$/.test(userId);
    
    if (!isMongoObjectId) {
      // Eğer ObjectId formatında değilse oauth_id ile kontrol et
      console.log(`OAuth ID ile kullanıcı aranıyor: ${userId}`);
      user = await User.findOne({ oauth_id: userId });
    } else {
      // ObjectId formatında ise _id ile bul
      console.log(`MongoDB ID ile kullanıcı aranıyor: ${userId}`);
      user = await User.findById(userId);
    }
    
    if (!user) {
      // Son çare olarak hem _id hem de oauth_id olarak ara
      console.log(`Hem ID hem de OAuth ID olarak aranıyor: ${userId}`);
      user = await User.findOne({ $or: [{ _id: userId }, { oauth_id: userId }] });
      
      if (!user) {
        return NextResponse.json({ message: "Kullanıcı bulunamadı" }, { status: 404 });
      }
    }

    console.log(`Kullanıcı bulundu: ${user.username} (ID: ${user._id}, OAuth ID: ${user.oauth_id || 'yok'})`);

    // Kullanıcı adı unique mi kontrolü (mevcut kullanıcı hariç)
    const existingUser = await User.findOne({
      username: username,
      _id: { $ne: user._id }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Bu kullanıcı adı başkası tarafından kullanılıyor" },
        { status: 400 }
      );
    }

    // Güncellenecek alanlar
    const updateData: any = {
      username,
      firstName,
      lastName
    };

    // Şifre varsa hash'le ve ekle
    if (password) {
      // Manuel olarak hash işlemini yapıyoruz (save middleware çalışmayacağı için)
      console.log('Şifre değişti, yeni hash oluşturuluyor...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      console.log('Şifre hash\'lendi:', hashedPassword.substring(0, 20) + '...');
      updateData.password = hashedPassword;
      
      // OAuth kullanıcıları için önemli: şifreyi eklerken, bu kullanıcıların
      // hem OAuth ile hem de şifre ile giriş yapabilmesini sağla
      if (user.provider === "google" || user.oauth_id) {
        // Şifre eklenen OAuth kullanıcısını doğrula
        updateData.isVerified = true;
      }
    }

    // Kullanıcının mevcut provider ve oauth_id bilgilerini koru
    if (user.provider) {
      updateData.provider = user.provider;
    }

    if (user.oauth_id) {
      updateData.oauth_id = user.oauth_id;
    }

    // Kullanıcıyı güncelle
    console.log(`Kullanıcı güncelleniyor: ID ${user._id}`);
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      updateData,
      { new: true } // Güncellenmiş dokümanı döndür
    );

    console.log(`Kullanıcı güncellendi, yeni username: ${updatedUser.username}`);

    // Hassas bilgileri kaldır
    const userResponse = {
      _id: updatedUser._id,
      username: updatedUser.username,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      role: updatedUser.role,
      provider: updatedUser.provider,
      profilePicture: updatedUser.profilePicture
    };

    return NextResponse.json({
      message: "Profil başarıyla güncellendi",
      user: userResponse
    });
  } catch (error: any) {
    console.error("Profil güncelleme hatası:", error);
    return NextResponse.json(
      { message: error.message || "Profil güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
} 
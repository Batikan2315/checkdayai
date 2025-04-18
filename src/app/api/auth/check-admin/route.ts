import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getServerSession } from "next-auth";

// GET - Admin yetkisini kontrol et
export async function GET(req: NextRequest) {
  try {
    console.log("Admin kontrol API'si çağrıldı");
    
    // Session kontrolü - doğrudan session'ı parametre olmadan alıyoruz
    const session = await getServerSession();
    console.log("Session bilgisi:", JSON.stringify({ 
      hasSession: !!session, 
      email: session?.user?.email 
    }));
    
    if (!session?.user?.email) {
      console.log("Oturum açılmamış");
      return NextResponse.json(
        { error: "Oturum açılmamış", isAdmin: false },
        { status: 401 }
      );
    }

    // Veritabanı bağlantısı
    await connectDB();

    // Kullanıcı bilgilerini al
    const user = await User.findOne({ email: session.user.email });
    console.log("Kullanıcı bilgisi:", JSON.stringify({ 
      hasUser: !!user, 
      role: user?.role 
    }));

    if (!user) {
      console.log("Kullanıcı bulunamadı");
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı", isAdmin: false },
        { status: 404 }
      );
    }

    // Admin kontrolü
    const isAdmin = user.role === "admin";
    console.log("Admin kontrolü sonucu:", { isAdmin });

    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error("Admin kontrolü hatası:", error);
    return NextResponse.json(
      { error: "Admin kontrolü yapılırken bir hata oluştu", isAdmin: false },
      { status: 500 }
    );
  }
} 
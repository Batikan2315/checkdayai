import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    // Güvenlik kontrolü - sadece geliştirme ortamında çalışsın
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { message: "Bu işlem sadece geliştirme ortamında yapılabilir" },
        { status: 403 }
      );
    }

    await connectDB();
    
    const { email, username } = await req.json();
    
    if (!email && !username) {
      return NextResponse.json(
        { message: "E-posta adresi veya kullanıcı adı gereklidir" },
        { status: 400 }
      );
    }
    
    // Arama kriterini oluştur
    const searchCriteria = email ? { email } : { username };
    console.log("Arama kriteri:", searchCriteria);
    
    // Kullanıcıyı bul
    const user = await User.findOne(searchCriteria);
    
    if (!user) {
      console.log("Kullanıcı bulunamadı. Arama kriterleri:", searchCriteria);
      return NextResponse.json(
        { message: "Kullanıcı bulunamadı", searchCriteria },
        { status: 404 }
      );
    }
    
    console.log("Kullanıcı bulundu:", {
      id: user._id,
      email: user.email,
      username: user.username,
      roleOld: user.role,
    });
    
    // Kullanıcının rolünü admin olarak güncelle
    user.role = "admin";
    await user.save();
    
    console.log("Kullanıcı admin yapıldı:", {
      id: user._id,
      email: user.email,
      username: user.username,
      roleNew: user.role,
    });
    
    return NextResponse.json(
      { 
        message: "Kullanıcı başarıyla admin yapıldı",
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: user.role
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Admin yapma hatası:", error);
    return NextResponse.json(
      { message: "Admin yapma hatası", error: error.message },
      { status: 500 }
    );
  }
} 
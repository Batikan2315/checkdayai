import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getServerSession } from "next-auth";

export async function GET(req: NextRequest) {
  try {
    // Oturumu al ve admin kontrolü yap
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Yetkilendirme hatası" },
        { status: 401 }
      );
    }
    
    // Admin olup olmadığını kontrol et
    const admin = await User.findOne({ 
      email: session.user.email,
      role: "admin"
    });
    
    if (!admin) {
      return NextResponse.json(
        { message: "Admin yetkisi gerekiyor" },
        { status: 403 }
      );
    }
    
    // Veritabanına bağlan
    await connectDB();
    
    // Kullanıcıları getir (şifre hariç)
    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 });
    
    return NextResponse.json(users);
  } catch (error: any) {
    console.error("Kullanıcı listeleme hatası:", error);
    return NextResponse.json(
      { message: "Kullanıcılar alınamadı", error: error.message },
      { status: 500 }
    );
  }
} 
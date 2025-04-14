import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getServerSession } from "next-auth";

export async function POST(req: NextRequest) {
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
    
    // Request body'den verileri al
    const { userId, role } = await req.json();
    
    if (!userId || !role) {
      return NextResponse.json(
        { message: "Kullanıcı ID ve rol gereklidir" },
        { status: 400 }
      );
    }
    
    // Geçerli roller kontrolü
    if (role !== "admin" && role !== "user") {
      return NextResponse.json(
        { message: "Geçersiz rol. Sadece 'admin' veya 'user' olabilir" },
        { status: 400 }
      );
    }
    
    // Veritabanına bağlan
    await connectDB();
    
    // Kullanıcıyı bul ve güncelle
    const user = await User.findById(userId);
    
    if (!user) {
      return NextResponse.json(
        { message: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }
    
    // Kendisini düşürememesi için kontrol
    if (user.email === session.user.email && role !== "admin") {
      return NextResponse.json(
        { message: "Kendi admin yetkinizi düşüremezsiniz" },
        { status: 400 }
      );
    }
    
    // Rol güncelle
    user.role = role;
    await user.save();
    
    return NextResponse.json({
      message: `Kullanıcı rolü başarıyla '${role}' olarak güncellendi`,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error("Rol değiştirme hatası:", error);
    return NextResponse.json(
      { message: "Rol güncellenemedi", error: error.message },
      { status: 500 }
    );
  }
} 
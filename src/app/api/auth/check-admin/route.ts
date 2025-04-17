import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { verifyToken } from "@/lib/auth";

// Admin durumunu kontrol etmek için kullanılan API
export async function GET(req: NextRequest) {
  try {
    // Tam bir oturum bilgisi al
    const session = await getServerSession();
    console.log("Admin kontrolü için oturum bilgisi:", JSON.stringify(session));
    
    if (!session || !session.user || !session.user.email) {
      console.log("Admin erişim hatası: Geçerli oturum bulunamadı");
      return NextResponse.json(
        { message: "Oturum açık değil", isAdmin: false },
        { status: 401 }
      );
    }
    
    // DB'ye bağlan
    await connectDB();
    
    // Kullanıcıyı bul
    const userEmail = session.user.email;
    const user = await User.findOne({ email: userEmail });
    
    console.log("Admin kontrolü: Kullanıcı bilgisi:", {
      email: userEmail,
      kullanıcıBulundu: !!user,
      rol: user?.role,
      provider: user?.provider
    });
    
    if (!user) {
      return NextResponse.json(
        { message: "Kullanıcı bulunamadı", isAdmin: false },
        { status: 404 }
      );
    }
    
    // Admin kontrolü
    const isAdmin = user.role === "admin";
    
    console.log("Admin kontrolü sonucu:", { isAdmin, userId: user._id });
    
    if (!isAdmin) {
      return NextResponse.json(
        { message: "Admin yetkisi bulunmuyor", isAdmin: false },
        { status: 403 }
      );
    }
    
    // Admin yetkisi var
    return NextResponse.json({
      isAdmin: true,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error("Admin kontrol hatası:", error);
    return NextResponse.json(
      { message: "Admin kontrolü yapılamadı", error: error.message, isAdmin: false },
      { status: 500 }
    );
  }
} 
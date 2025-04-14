import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    // Oturumu al
    const session = await getServerSession(authOptions);
    
    console.log("Admin kontrolü - session:", session?.user);
    
    if (!session?.user?.email) {
      console.log("Admin kontrolü - oturum yok");
      return NextResponse.json({ 
        isAdmin: false,
        tokenRole: null,
        dbRole: null,
        message: "Oturum bulunamadı"
      });
    }
    
    // Kullanıcıyı e-posta ile bul
    const user = await User.findOne({ email: session.user.email });
    
    // Token ve veritabanındaki rolleri al
    const tokenRole = session?.user?.role || 'bulunamadı';
    const dbRole = user?.role || 'bulunamadı';
    
    // MongoDB'deki role bilgisini kullan
    const isAdmin = dbRole === "admin";
    
    console.log("Admin kontrolü:", {
      email: session.user.email, 
      userExists: !!user,
      tokenRole,
      dbRole,
      isAdmin
    });
    
    return NextResponse.json({ 
      isAdmin,
      tokenRole,
      dbRole,
      email: session.user.email
    });
  } catch (error) {
    console.error("Admin kontrolü hatası:", error);
    return NextResponse.json({ 
      isAdmin: false, 
      error: String(error),
      tokenRole: null,
      dbRole: null 
    });
  }
} 
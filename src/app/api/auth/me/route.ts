import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // Token'ı oku
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "Yetkilendirme token'ı eksik veya geçersiz" },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(" ")[1];
    
    // Token'ı doğrula
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { message: "Geçersiz veya süresi dolmuş token" },
        { status: 401 }
      );
    }
    
    await connectDB();
    
    // Kullanıcıyı bul (password hariç)
    const user = await User.findById(decoded.id).select("-password");
    
    if (!user) {
      return NextResponse.json(
        { message: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      id: user._id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      profilePicture: user.profilePicture,
      isVerified: user.isVerified,
      balance: user.balance,
    });
  } catch (error: any) {
    console.error("Kullanıcı bilgileri alma hatası:", error);
    return NextResponse.json(
      { message: "Kullanıcı bilgileri alınırken bir hata oluştu", error: error.message },
      { status: 500 }
    );
  }
} 
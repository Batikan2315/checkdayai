import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getServerSession } from "next-auth";

export async function POST(req: NextRequest) {
  try {
    // Admin yetkisini kontrol et
    const session = await getServerSession();
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ message: "Oturum açık değil" }, { status: 401 });
    }

    // DB'ye bağlan
    await connectDB();

    // İşlemi yapan kullanıcının admin olup olmadığını kontrol et
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ message: "Bu işlem için yetkiniz yok" }, { status: 403 });
    }

    // Gelen email'i al
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ message: "Email adresi gereklidir" }, { status: 400 });
    }

    // Admin yapılacak kullanıcıyı bul
    const userToUpdate = await User.findOne({ email });
    if (!userToUpdate) {
      return NextResponse.json({ message: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    // Kullanıcıyı admin yap
    userToUpdate.role = "admin";
    await userToUpdate.save();

    return NextResponse.json({ 
      message: "Kullanıcı admin olarak ayarlandı", 
      user: {
        id: userToUpdate._id,
        email: userToUpdate.email,
        role: userToUpdate.role
      }
    });
  } catch (error: any) {
    console.error("Admin yapma hatası:", error);
    return NextResponse.json(
      { message: "İşlem başarısız", error: error.message },
      { status: 500 }
    );
  }
} 
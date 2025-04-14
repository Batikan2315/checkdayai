import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Bildirim tercihlerini getir
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Oturum açmanız gerekiyor" },
        { status: 401 }
      );
    }
    
    const user = await User.findById(session.user.id);
    
    if (!user) {
      return NextResponse.json(
        { message: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      preferences: user.notificationPreferences
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: "Tercihler getirilemedi", error: error.message },
      { status: 500 }
    );
  }
}

// Bildirim tercihlerini güncelle
export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Oturum açmanız gerekiyor" },
        { status: 401 }
      );
    }
    
    const preferences = await req.json();
    
    const user = await User.findById(session.user.id);
    
    if (!user) {
      return NextResponse.json(
        { message: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }
    
    // Tercihleri güncelle
    user.notificationPreferences = {
      ...user.notificationPreferences,
      ...preferences
    };
    
    await user.save();
    
    return NextResponse.json({
      message: "Bildirim tercihleri güncellendi",
      preferences: user.notificationPreferences
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: "Tercihler güncellenemedi", error: error.message },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Plan from "@/models/Plan";
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
    
    // Planları getir
    const plans = await Plan.find({})
      .sort({ createdAt: -1 });
    
    // Plan oluşturucularının isimlerini ekle
    const plansWithCreatorNames = await Promise.all(
      plans.map(async (plan) => {
        const planObj = plan.toObject();
        
        if (planObj.creator) {
          try {
            const user = await User.findById(planObj.creator);
            planObj.creatorName = user ? (user.firstName || user.username || user.email) : "Bilinmiyor";
          } catch (error) {
            planObj.creatorName = "Bilinmiyor";
          }
        } else {
          planObj.creatorName = "Bilinmiyor";
        }
        
        return planObj;
      })
    );
    
    return NextResponse.json(plansWithCreatorNames);
  } catch (error: any) {
    console.error("Plan listeleme hatası:", error);
    return NextResponse.json(
      { message: "Planlar alınamadı", error: error.message },
      { status: 500 }
    );
  }
} 
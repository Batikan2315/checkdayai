import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Plan from "@/models/Plan";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Bu API endpoint'i aşağıdaki planları tespit edip düzeltir:
 * 1. Creator bilgisi eksik olan planlar
 * 2. Creator ID'si geçersiz veya olmayan planlar 
 * 3. Kullanıcı profil sayfasında "İsimsiz" görünen planlar
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    // Sadece admin rolündeki kullanıcılar bu işlemi yapabilir
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        success: false, 
        message: "Oturum bulunamadı" 
      }, { status: 401 });
    }
    
    // Kullanıcıyı e-posta ile bul
    const user = await User.findOne({ email: session.user.email });
    
    // Admin kontrolü
    if (!user || user.role !== "admin") {
      return NextResponse.json({ 
        success: false, 
        message: "Bu işlem için admin yetkisi gerekiyor" 
      }, { status: 403 });
    }
    
    // 1. Creator bilgisi olmayan planları tespit et
    const plansWithoutCreator = await Plan.find({ 
      $or: [
        { creator: { $exists: false } },
        { creator: null }
      ]
    });
    
    // 2. Creator ID'si geçersiz olan planları tespit et
    const allPlans = await Plan.find();
    const plansWithInvalidCreator = [];
    
    for (const plan of allPlans) {
      if (plan.creator) {
        // Creator bir ID ise, kullanıcı var mı kontrol et
        const creatorId = plan.creator.toString();
        const creatorExists = await User.findById(creatorId);
        
        if (!creatorExists) {
          plansWithInvalidCreator.push(plan);
        }
      }
    }
    
    // 3. Düzeltilecek planları topla
    const plansToFix = [...plansWithoutCreator, ...plansWithInvalidCreator];
    
    // Hiç problem yoksa bilgi mesajı döndür
    if (plansToFix.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Düzeltilecek plan bulunamadı",
        fixedCount: 0
      });
    }
    
    // Düzeltme işlemi
    const fixResults = [];
    
    for (const plan of plansToFix) {
      try {
        // Plan oluşturma zamanını al
        const createdAt = plan.createdAt;
        
        // En yakın tarihteki planı oluşturan kullanıcıyı bul
        // Bu yaklaşık bir tahmin, kesin sonuç değil
        const possibleCreator = await User.findOne({
          createdAt: { $lte: createdAt }
        }).sort({ createdAt: -1 });
        
        // Varsayılan olarak admin kullanıcısını al
        const defaultCreator = await User.findOne({ role: "admin" });
        
        // Hangi kullanıcı uygun ise onu kullan
        const newCreator = possibleCreator || defaultCreator || user;
        
        // Planı güncelle
        await Plan.findByIdAndUpdate(plan._id, {
          creator: newCreator._id,
          leaders: [newCreator._id],
          $addToSet: { participants: newCreator._id }
        });
        
        fixResults.push({
          planId: plan._id,
          title: plan.title,
          oldCreator: plan.creator || "yok",
          newCreator: newCreator.username
        });
      } catch (error) {
        console.error(`Plan düzeltme hatası (${plan._id}):`, error);
        fixResults.push({
          planId: plan._id,
          error: "Düzeltme başarısız oldu"
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `${fixResults.length} plan düzeltildi`,
      fixedCount: fixResults.length,
      details: fixResults
    });
  } catch (error: any) {
    console.error("Plan düzeltme hatası:", error);
    return NextResponse.json(
      { success: false, message: "İşlem sırasında hata oluştu", error: error.message },
      { status: 500 }
    );
  }
} 
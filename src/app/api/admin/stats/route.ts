import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Plan from "@/models/Plan";
import Transaction from "@/models/Transaction";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

export async function GET(req: NextRequest) {
  try {
    // Veritabanına bağlan
    await connectDB();
    
    // İstatistikleri al
    const userCount = await User.countDocuments();
    const planCount = await Plan.countDocuments();
    
    // Toplam işlem miktarını hesapla
    const transactions = await Transaction.find({});
    const transactionTotal = transactions.reduce((total, transaction) => {
      if (transaction.type === "deposit") {
        return total + (transaction.amount || 0);
      }
      return total;
    }, 0);
    
    // Son aktiviteler
    const recentActivities = [];
    
    // Son 5 kullanıcı
    const recentUsers = await User.find({})
      .sort({ createdAt: -1 })
      .limit(3);
    
    for (const user of recentUsers) {
      recentActivities.push({
        title: "Yeni kullanıcı kaydoldu",
        description: `${user.firstName || user.username || user.email}`,
        time: formatDistanceToNow(new Date(user.createdAt || new Date()), { addSuffix: true, locale: tr })
      });
    }
    
    // Son 5 plan
    const recentPlans = await Plan.find({})
      .sort({ createdAt: -1 })
      .limit(3);
    
    for (const plan of recentPlans) {
      recentActivities.push({
        title: "Yeni plan oluşturuldu",
        description: `${plan.title} - ${plan.location || ""}`,
        time: formatDistanceToNow(new Date(plan.createdAt || new Date()), { addSuffix: true, locale: tr })
      });
    }
    
    // Son 5 işlem
    const recentTransactions = await Transaction.find({})
      .sort({ createdAt: -1 })
      .limit(3);
    
    for (const transaction of recentTransactions) {
      const user = await User.findById(transaction.userId);
      recentActivities.push({
        title: `${transaction.type === "deposit" ? "Bakiye yükleme" : 
                transaction.type === "withdrawal" ? "Bakiye çekme" : 
                "Para iadesi"}`,
        description: `${user ? (user.firstName || user.username) : "Kullanıcı"} - ${transaction.amount} ₺`,
        time: formatDistanceToNow(new Date(transaction.createdAt || new Date()), { addSuffix: true, locale: tr })
      });
    }
    
    // Aktiviteleri tarihe göre sırala
    recentActivities.sort((a, b) => {
      const timeA = a.time.includes("önce") ? -1 : 1;
      const timeB = b.time.includes("önce") ? -1 : 1;
      return timeA - timeB;
    });
    
    return NextResponse.json({
      userCount,
      planCount,
      transactionTotal,
      recentActivities: recentActivities.slice(0, 5) // Sadece ilk 5 aktiviteyi gönder
    });
  } catch (error: any) {
    console.error("İstatistik hatası:", error);
    return NextResponse.json(
      { message: "İstatistikler alınamadı", error: error.message },
      { status: 500 }
    );
  }
} 
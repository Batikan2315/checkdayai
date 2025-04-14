import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";

const countdownFilePath = path.join(process.cwd(), "data", "countdown.json");

// Tip tanımlamaları
interface CountdownData {
  title: string;
  date: string;
  active: boolean;
}

// Geri sayım verilerini dosyadan oku
const readCountdownData = (): CountdownData | null => {
  try {
    // data klasörü yoksa oluştur
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Dosya yoksa boş bir dosya oluştur
    if (!fs.existsSync(countdownFilePath)) {
      const initialData: CountdownData = {
        title: "",
        date: "",
        active: false
      };
      fs.writeFileSync(countdownFilePath, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    
    const fileContent = fs.readFileSync(countdownFilePath, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Geri sayım verisini okuma hatası:", error);
    return null;
  }
};

// Geri sayım verilerini dosyaya yaz
const writeCountdownData = (data: CountdownData): boolean => {
  try {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(countdownFilePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error("Geri sayım verisini yazma hatası:", error);
    return false;
  }
};

// GET isteği - geri sayım verilerini getir
export async function GET() {
  try {
    const countdownData = readCountdownData();
    
    if (!countdownData) {
      return NextResponse.json(
        { error: "Geri sayım verisi okunamadı" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(countdownData);
  } catch (error) {
    console.error("Geri sayım GET hatası:", error);
    return NextResponse.json(
      { error: "Geri sayım verileri getirilemedi" },
      { status: 500 }
    );
  }
}

// POST isteği - geri sayım verilerini güncelle
export async function POST(request: NextRequest) {
  try {
    // Kullanıcı oturumunu kontrol et
    const session = await getServerSession(authOptions);
    
    console.log("Admin countdown endpoint'i çağrıldı", {
      sessionUser: session?.user,
      userRole: session?.user?.role,
    });
    
    if (!session) {
      return NextResponse.json(
        { error: "Bu işlem için giriş yapmalısınız" },
        { status: 401 }
      );
    }
    
    // Kullanıcı admin mi kontrol et
    if (!session.user || session.user.role !== "admin") {
      console.log("Admin yetkisi reddedildi:", {
        userRole: session.user?.role || "role yok",
        user: session.user
      });
      
      return NextResponse.json(
        { error: "Bu işlem için admin yetkisine sahip olmalısınız" },
        { status: 403 }
      );
    }
    
    // İstek gövdesini al
    const data = await request.json();
    
    // Gerekli alanları doğrula
    if (!data.title) {
      return NextResponse.json(
        { error: "Geri sayım başlığı gereklidir" },
        { status: 400 }
      );
    }
    
    if (!data.date) {
      return NextResponse.json(
        { error: "Geri sayım tarihi gereklidir" },
        { status: 400 }
      );
    }
    
    // Verileri hazırla
    const countdownData: CountdownData = {
      title: data.title,
      date: data.date,
      active: data.active || false
    };
    
    // Verileri kaydet
    const success = writeCountdownData(countdownData);
    
    if (!success) {
      return NextResponse.json(
        { error: "Geri sayım verileri kaydedilemedi" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: "Geri sayım verileri başarıyla güncellendi",
      data: countdownData
    });
  } catch (error) {
    console.error("Geri sayım POST hatası:", error);
    return NextResponse.json(
      { error: "Geri sayım verileri güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from "next/server";
import { Socket } from "net";
import { Server as SocketIOServer } from "socket.io";
import { configureSocketServer } from "@/lib/socket";

interface SocketServerIO extends Socket {
  server: {
    io?: SocketIOServer;
  };
}

// Sunucu tarafında güncelleme için global bir değişken 
// (normalde iyi bir pratik değil, ancak Next.js'in App Router yapısında 
// WebSocket sunucusunu yönetmek için kullanışlı)
let io: SocketIOServer | null = null;

export async function GET(req: NextRequest) {
  try {
    // İstek origin bilgisini al
    const origin = req.headers.get('origin') || '*';
    const isProd = process.env.NODE_ENV === 'production';
    
    if (!io) {
      // Eğer io yoksa yeni bir instance oluştur
      console.log("WebSocket sunucusu başlatılıyor...");
      
      // En basit yapılandırma ile socket.io sunucusu başlat
      io = new SocketIOServer({
        cors: {
          origin: isProd ? [
            "https://checkday.ai", 
            "https://www.checkday.ai"
          ] : "*",
          methods: ["GET", "POST"],
          credentials: false  // Cookie kullanma
        },
        transports: ['polling', 'websocket'], // Önce polling, sonra WebSocket kullan 
        pingTimeout: 30000,        // 30 saniye (artırıldı)
        pingInterval: 25000,       // 25 saniye (artırıldı)
        connectTimeout: 15000,     // 15 saniye (artırıldı)
        cookie: false,             // Cookie oluşturma
        path: '/api/socketio/',    // API path
        // SSL yapılandırması - üretimde aktif
        secure: isProd,
      });
      
      io.on("connection", (socket) => {
        console.log("Yeni kullanıcı bağlandı:", socket.id);
        
        // Auth verilerini kontrol et
        const userId = socket.handshake.auth?.userId;
        if (userId) {
          console.log(`Auth ile kullanıcı ID alındı: ${userId}`);
          socket.join(`user:${userId}`);
        }
        
        socket.on("authenticate", (data) => {
          const userId = data?.userId;
          if (userId) {
            socket.join(`user:${userId}`);
            console.log(`Kullanıcı ${userId} odaya katıldı`);
          }
        });
        
        socket.on("disconnect", () => {
          console.log("Kullanıcı bağlantısı kesildi:", socket.id);
        });
      });
      
      console.log("WebSocket sunucusu başlatıldı");
    } else {
      console.log("WebSocket sunucusu zaten çalışıyor");
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "WebSocket sunucusu hazır",
      environment: isProd ? 'production' : 'development'  
    });
  } catch (error) {
    console.error("WebSocket sunucusu başlatma hatası:", error);
    return NextResponse.json(
      { success: false, message: "WebSocket sunucusu başlatılamadı", error },
      { status: 500 }
    );
  }
} 
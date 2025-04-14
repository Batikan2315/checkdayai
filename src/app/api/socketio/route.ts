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
    if (!io) {
      // Eğer io yoksa yeni bir instance oluştur
      console.log("WebSocket sunucusu başlatılıyor...");
      
      // En basit yapılandırma ile socket.io sunucusu başlat
      io = new SocketIOServer({
        cors: {
          origin: "*",
          methods: ["GET", "POST"],
          credentials: false  // Cookie kullanma
        },
        transports: ['websocket'], // Sadece WebSocket kullan, polling kullanma
        pingTimeout: 10000,        // 10 saniye
        pingInterval: 10000,       // 10 saniye
        connectTimeout: 5000,      // 5 saniye
        cookie: false,             // Cookie oluşturma
        path: '/api/socketio/'     // API path
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
    
    return NextResponse.json({ success: true, message: "WebSocket sunucusu hazır" });
  } catch (error) {
    console.error("WebSocket sunucusu başlatma hatası:", error);
    return NextResponse.json(
      { success: false, message: "WebSocket sunucusu başlatılamadı", error },
      { status: 500 }
    );
  }
} 
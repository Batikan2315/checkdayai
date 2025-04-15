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
          credentials: true
        },
        transports: ['polling', 'websocket'], 
        pingTimeout: 60000,      
        pingInterval: 30000,     
        connectTimeout: 30000,  
        cookie: {
          name: "io",
          path: "/",
          httpOnly: true,
          sameSite: "lax"
        },
        path: '/api/socketio/'
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
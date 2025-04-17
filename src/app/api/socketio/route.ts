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
let io: SocketIOServer | null = null;
// Bağlantı sayısını takip et
let connectionCount = 0;
const MAX_CONNECTIONS = 1000;

export async function GET(req: NextRequest) {
  try {
    // İstek origin bilgisini al
    const origin = req.headers.get('origin') || '*';
    const isProd = process.env.NODE_ENV === 'production';
    
    if (!io) {
      // Eğer io yoksa yeni bir instance oluştur
      
      // Socket.IO yapılandırması - ÖLÇEKLENME İÇİN OPTİMİZE EDİLDİ
      io = new SocketIOServer({
        cors: {
          origin: isProd ? [
            "https://checkday.ai", 
            "https://www.checkday.ai",
            "http://localhost:3000"
          ] : "*",
          methods: ["GET", "POST"],
          credentials: true,
          allowedHeaders: ['Content-Type', 'Authorization']
        },
        // Polling öncelikli, WebSocket'e yükseltme var, ama polling aralığını artırdık
        transports: ['polling', 'websocket'],
        // İstemci ping-pong ve zamanaşımı ayarları (artırıldı)
        pingTimeout: 30000,      
        pingInterval: 40000,  
        connectTimeout: 15000,
        
        // Performans Optimizasyonları
        perMessageDeflate: {
          threshold: 1024, // Sadece 1KB'den büyük mesajları sıkıştır
          zlibDeflateOptions: { level: 6 } // Orta seviye sıkıştırma
        },
        
        // Bellek Optimizasyonları (daha sıkı)
        maxHttpBufferSize: 500 * 1024, // 500KB maksimum mesaj boyutu
        httpCompression: true,
        
        // Cookie Optimizasyonu - COOKIE BOYUTU İÇİN KRİTİK
        cookie: {
          name: "io",
          path: "/",
          httpOnly: true,
          sameSite: "strict", // "lax" yerine "strict" kullanıyoruz
          secure: isProd,
          maxAge: 43200, // 12 saat (saniyeler) - 1 gün yerine
        },
        
        // Otomatik düzeltmeler ve cache busting için
        cleanupEmptyChildNamespaces: true,
        path: '/api/socketio/'
      });
      
      io.on("connection", (socket) => {
        // Bağlantı sayısını kontrol et
        connectionCount++;
        if (connectionCount > MAX_CONNECTIONS) {
          socket.disconnect(true);
          connectionCount--;
          return;
        }
        
        // Kullanıcı bazlı izleme
        const userId = socket.handshake.auth?.userId;
        if (userId) {
          socket.join(`user:${userId}`);
           
          // WebSocket'e yükseltmeyi destekle
          socket.conn.on("upgrade", () => {
            // WebSocket bağlantısı başlatıldı
            // İşlemler burada yapılabilir
          });
        } else {
          // Kullanıcı kimliği yoksa hemen bağlantıyı kapat
          setTimeout(() => {
            socket.disconnect(true);
          }, 5000);
        }
        
        socket.on("authenticate", (data) => {
          const userId = data?.userId;
          if (userId) {
            socket.join(`user:${userId}`);
          } else {
            // Kimlik doğrulama başarısız, bağlantıyı kapat
            socket.disconnect(true);
          }
        });
        
        // Hafif ping-pong mekanizması
        socket.on("ping", () => {
          socket.emit("pong");
        });
        
        // İstemci bağlantısı kapandığında kaynakları serbest bırak
        socket.on("disconnect", () => {
          connectionCount--;
          if (userId) {
            socket.leave(`user:${userId}`);
          }
          socket.removeAllListeners();
        });
        
        // Uzun süredir boşta kalan soketleri kapat
        const inactivityTimeout = setTimeout(() => {
          socket.disconnect(true);
        }, 30 * 60 * 1000); // 30 dakika
        
        socket.on('activity', () => {
          // Aktivite olduğunda zamanlayıcıyı sıfırla
          clearTimeout(inactivityTimeout);
        });
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Socket.IO sunucusu hazır",
      environment: isProd ? 'production' : 'development',
      connections: connectionCount
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Socket.IO sunucusu başlatılamadı", error },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );
  }
} 
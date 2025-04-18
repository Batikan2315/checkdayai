import { NextRequest, NextResponse } from "next/server";
import { Socket } from "net";
import { Server as SocketIOServer } from "socket.io";
import { configureSocketServer } from "@/lib/socket";
import { Server as NetServer } from 'http';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

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

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    const origin = req.headers.get('origin') || '';
    
    // İzin verilen originler
    const allowedOrigins = [
      "https://checkday.ai", 
      "https://www.checkday.ai",
      "http://localhost:3000"
    ];
    
    // OPTIONS isteği için preflight yanıtı
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': isProd 
            ? '*'  // Tüm originlere izin ver
            : '*',
          'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // Gelen istek izin verilen origin mi kontrol et
    const corsOrigin = isProd 
      ? '*'  // Tüm originlere izin ver
      : "*";
    
    if (!io) {
      // Eğer io yoksa yeni bir instance oluştur
      
      // Socket.IO yapılandırması - ÖLÇEKLENME VE PERFORMANS İÇİN OPTİMİZE EDİLDİ
      io = new SocketIOServer({
        cors: {
          origin: corsOrigin,
          methods: ["GET", "POST"],
          credentials: true,
          allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin']
        },
        // WebSocket öncelikli, polling yedek olarak - çift tırnak yerine tek tırnak
        transports: ['polling', 'websocket'],
        // İstemci ping-pong ve zamanaşımı ayarları (artırıldı)
        pingTimeout: 60000,      
        pingInterval: 40000,  
        connectTimeout: 60000,
        
        // Performans Optimizasyonları
        perMessageDeflate: {
          threshold: 1024, // Sadece 1KB'den büyük mesajları sıkıştır
          zlibDeflateOptions: { level: 6 } // Orta seviye sıkıştırma
        },
        
        // Bellek Optimizasyonları (daha sıkı)
        maxHttpBufferSize: 1000 * 1024, // 1MB maksimum mesaj boyutu
        httpCompression: true,
        
        // Cookie Optimizasyonu - COOKIE BOYUTU İÇİN KRİTİK
        cookie: {
          name: "io",
          path: "/",
          httpOnly: true,
          sameSite: "lax", // "strict" yerine "lax" kullanıyoruz - daha iyi destek
          secure: isProd,
          maxAge: 86400 * 7, // 7 gün (saniyeler)
        },
        
        // Otomatik düzeltmeler ve cache busting için
        cleanupEmptyChildNamespaces: true,
        path: '/api/socketio'
      });
      
      io.on("connection", (socket) => {
        // Bağlantı sayısını kontrol et
        connectionCount++;
        if (connectionCount > MAX_CONNECTIONS) {
          socket.disconnect(true);
          connectionCount--;
          return;
        }
        
        // WebSocket transport izleme
        socket.conn.on("upgrade", (transport) => {
          console.log(`[Socket ${socket.id}] WebSocket'e yükseltildi`);
        });
        
        // Transport durumunu kontrol et
        if (socket.conn.transport.name === "polling") {
          console.log(`[Socket ${socket.id}] Polling modunda çalışıyor`);
          
          // 30 saniye sonra WebSocket'e geçemediyse uyarı log'u
          setTimeout(() => {
            if (socket.connected && socket.conn.transport.name === "polling") {
              console.log(`[Socket ${socket.id}] Hala polling modunda - WebSocket mümkün olmayabilir`);
            }
          }, 30000);
        }
        
        // Kullanıcı bazlı izleme
        const userId = socket.handshake.auth?.userId;
        if (userId) {
          socket.join(`user:${userId}`);
          
          // Kullanıcıya özel oda oluştur
          socket.join(`user:${userId}`);
          
          // Kullanıcıya bağlantı başarılı bildirimi
          socket.emit("connect_success", { 
            socketId: socket.id,
            userId,
            transport: socket.conn.transport.name
          });
        } else {
          // Kullanıcı kimliği yoksa hemen bağlantıyı kapat
          console.log(`[Socket ${socket.id}] Kimlik doğrulama yok - bağlantı kapatılacak`);
          setTimeout(() => {
            socket.disconnect(true);
          }, 5000);
        }
        
        socket.on("authenticate", (data) => {
          const userId = data?.userId;
          if (userId) {
            socket.join(`user:${userId}`);
            // Başarılı bildirim
            socket.emit("auth_success", { userId });
          } else {
            // Kimlik doğrulama başarısız, bağlantıyı kapat
            socket.emit("auth_error", { message: "Kullanıcı kimliği geçersiz" });
            socket.disconnect(true);
          }
        });
        
        // Hafif ping-pong mekanizması
        socket.on("ping", () => {
          socket.emit("pong", { time: Date.now() });
        });
        
        // Hata yakalama
        socket.on("error", (error) => {
          console.error(`[Socket ${socket.id}] Hata:`, error);
        });
        
        // İstemci bağlantısı kapandığında kaynakları serbest bırak
        socket.on("disconnect", (reason) => {
          connectionCount--;
          console.log(`[Socket ${socket.id}] Bağlantı kesildi, neden: ${reason}`);
          if (userId) {
            socket.leave(`user:${userId}`);
          }
          socket.removeAllListeners();
        });
        
        // Uzun süredir boşta kalan soketleri kapat
        const inactivityTimeout = setTimeout(() => {
          console.log(`[Socket ${socket.id}] İnaktif - bağlantı kapatılıyor`);
          socket.disconnect(true);
        }, 30 * 60 * 1000); // 30 dakika
        
        socket.on('activity', () => {
          // Aktivite olduğunda zamanlayıcıyı sıfırla
          clearTimeout(inactivityTimeout);
        });
      });
      
      // Sunucu performans izleme
      setInterval(() => {
        const clientCount = io?.engine?.clientsCount || 0;
        console.log(`[Socket.IO Stats] Bağlı istemci: ${clientCount}, Toplam bağlantı: ${connectionCount}`);
      }, 60000); // Her dakika
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Socket.IO sunucusu hazır",
      environment: isProd ? 'production' : 'development',
      connections: connectionCount,
      transports: ['websocket', 'polling'],
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Credentials': 'true',
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error: any) {
    console.error("Socket.IO API hatası:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Socket.IO sunucusu başlatılamadı", 
        error: error.message || "Bilinmeyen hata"
      },
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
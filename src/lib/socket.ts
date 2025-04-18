import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";

export const configureSocketServer = (httpServer: HTTPServer) => {
  // Optimize edilmiş Socket.IO sunucusu yapılandırması
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true  // Cookie göndermeyi etkinleştir (tarayıcılar arası oturum desteği için)
    },
    // WebSocket ve polling desteği ile başlat, performans için önce websocket dene
    transports: ['websocket', 'polling'],
    // Daha uzun ping timeout ve aralığı ile bağlantıları koru
    pingTimeout: 20000,       // 20 saniye ping timeout
    pingInterval: 25000,      // 25 saniye ping aralığı
    connectTimeout: 10000,    // 10 saniye bağlantı timeout
    
    // Performans optimizasyonları
    perMessageDeflate: {
      threshold: 1024,  // 1KB'den büyük mesajları sıkıştır
      zlibDeflateOptions: { level: 6 } // Orta seviye sıkıştırma
    },
    
    // Güvenli cookie kullanımı
    cookie: {
      name: "io",
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === 'production'
    },
    
    // API yolu
    path: '/api/socketio/'
  });
  
  io.on("connection", (socket) => {
    console.log("Yeni kullanıcı bağlandı:", socket.id);
    
    // WebSocket bağlantı güncellemelerini izle
    socket.conn.on("upgrade", (transport) => {
      console.log(`Soket ${socket.id} bağlantısı başarıyla WebSocket'e yükseltildi`);
    });
    
    // Polling'de kaldı ise log gönder
    if (socket.conn.transport.name === "polling") {
      console.log(`Soket ${socket.id} polling modunda çalışıyor, WebSocket'e yükseltilemedi`);
    }
    
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
        // Başarılı kimlik doğrulama bildirimi gönder
        socket.emit("auth_success", { userId });
      } else {
        // Kimlik doğrulama başarısız
        socket.emit("auth_error", { message: "Kullanıcı ID'si geçersiz" });
      }
    });
    
    // Basit ping-pong işlevi
    socket.on("ping", () => {
      socket.emit("pong", { time: Date.now() });
    });
    
    // Hata yakalama
    socket.on("error", (error) => {
      console.error(`Soket ${socket.id} bağlantısında hata:`, error);
    });
    
    socket.on("disconnect", (reason) => {
      console.log(`Kullanıcı bağlantısı kesildi: ${socket.id}, neden: ${reason}`);
    });
  });
  
  // Bağlantı durumunu her 30 saniyede bir loglayalım
  setInterval(() => {
    const count = io.engine.clientsCount;
    console.log(`[Socket Stats] Bağlı istemci sayısı: ${count}`);
  }, 30000);
  
  return io;
};

// Kullanıcıya bildirim gönderme işlevi
export const sendNotificationToUser = (io: SocketIOServer, userId: string, notification: any) => {
  try {
    io.to(`user:${userId}`).emit("notification", notification);
    return true;
  } catch (error) {
    console.error(`Bildirim gönderme hatası (${userId}):`, error);
    return false;
  }
};

// Tüm kullanıcılara bildirim gönder
export const broadcastNotification = (io: SocketIOServer, notification: any) => {
  try {
    io.emit("broadcast", notification);
    return true;
  } catch (error) {
    console.error("Toplu bildirim gönderme hatası:", error);
    return false;
  }
}; 
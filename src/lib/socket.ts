import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";

export const configureSocketServer = (httpServer: HTTPServer) => {
  // En basit yapılandırma ile Socket.IO sunucusu oluştur
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: false  // Cookie gönderme
    },
    transports: ['websocket'], // Sadece WebSocket kullan
    pingTimeout: 10000,        // 10 saniye ping timeout 
    pingInterval: 10000,       // 10 saniye ping aralığı
    connectTimeout: 5000,      // 5 saniye bağlantı timeout
    cookie: false,             // Cookie kullanımını kapat
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
  
  return io;
};

// Kullanıcıya bildirim gönderme işlevi
export const sendNotificationToUser = (io: SocketIOServer, userId: string, notification: any) => {
  io.to(`user:${userId}`).emit("notification", notification);
}; 
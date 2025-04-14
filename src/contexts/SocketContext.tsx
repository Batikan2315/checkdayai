"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import socketIOClient from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  connectionError: null,
});

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionAttempted, setConnectionAttempted] = useState(false);
  const { data: session } = useSession();
  const [user, setUser] = useState(session?.user);

  // WebSocket bağlantısını oluştur ve yönet
  const initSocket = useCallback(() => {
    try {
      // Eğer aktif bir Socket bağlantısı varsa yenisini oluşturma
      if (socket && socket.connected) {
        console.log("Socket zaten bağlı, yeni bağlantı oluşturulmayacak");
        return;
      }
      
      console.log("WebSocket istemcisi başlatılıyor");
      
      const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'https://checkday.ai';
      const MAX_RETRIES = 2;
      
      // Socket.IO bağlantı ayarları
      const socketOptions = {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: MAX_RETRIES,
        reconnectionDelay: 1000,
        timeout: 5000,
        forceNew: false
      };
      
      // Bağlantıyı oluştur
      const socketInstance = socketIOClient(SOCKET_URL, socketOptions);
      
      socketInstance.on('connect', () => {
        console.log(`Socket bağlantısı kuruldu: ${socketInstance.id}`);
        setIsConnected(true);
        setConnectionError(null);
        
        // Kullanıcı kimliği varsa oturum aç
        if (user?.id) {
          socketInstance.emit('authenticate', { userId: user.id });
          console.log(`Kullanıcı ${user.id} kimliği ile Socket oturumu açıldı`);
        }
      });
      
      socketInstance.on('connect_error', (error) => {
        console.log("Socket bağlantı hatası:", error.message);
        setIsConnected(false);
        setConnectionError(error.message);
        
        if (error.message.includes('websocket')) {
          console.log("WebSocket kullanılamıyor, polling mekanizması devrede");
        }
      });
      
      socketInstance.on('disconnect', (reason) => {
        console.log(`Socket bağlantısı kesildi: ${reason}`);
        setIsConnected(false);
        
        if (reason === 'io server disconnect') {
          // Sunucu tarafından kapatıldı, yeniden bağlanmayı dene
          setTimeout(() => {
            socketInstance.connect();
          }, 2000);
        }
      });
      
      // Socket referansını güncelle
      setSocket(socketInstance);
      
      // Temizleme fonksiyonu
      return () => {
        if (socketInstance) {
          console.log("Socket bağlantısı temizleniyor");
          socketInstance.disconnect();
        }
      };
    } catch (error) {
      console.error("Socket başlatma hatası:", error);
      setConnectionError("Socket bağlantısı kurulamadı");
      setIsConnected(false);
    }
  }, [user]);

  // WebSocket başlatma
  useEffect(() => {
    // 1. Oturum yoksa veya zaten bağlantı denemesi yapıldıysa çık
    if (!session?.user || connectionAttempted) return;
    
    // 2. İlk olarak API'yi çağır ve sunucunun hazır olup olmadığını kontrol et
    const initSocket = async () => {
      try {
        // WebSocket sunucusunu başlat
        const apiResponse = await fetch('/api/socketio');
        if (!apiResponse.ok) {
          console.log("WebSocket sunucusu hazır değil, bağlantı yapılmayacak");
          setConnectionError("Sunucu hazır değil");
          return;
        }
        
        // 3. Socket.io istemcisini oluştur
        console.log("WebSocket istemcisi başlatılıyor");
        
        // WebSocket URL'ini çevre değişkeninden veya varsayılan olarak ayarla
        const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
        
        const socketInstance = io(SOCKET_URL, {
          reconnectionAttempts: 3,     // 3 kez yeniden bağlanma denemesi
          reconnectionDelay: 5000,     // 5 saniye bekle
          timeout: 10000,              // 10 saniye timeout
          transports: ["websocket", "polling"], // WebSocket yoksa polling'e düş
          path: '/api/socketio/',
          auth: { userId: session.user.id },
          forceNew: true,              // Her seferinde yeni bağlantı aç
          withCredentials: false,      // Cookie kullanma
          autoConnect: false,          // Manuel bağlanacağız
          upgrade: true,               // websocket'e yükseltmeye izin ver
          rememberUpgrade: true,       // websocket tespitini hatırla
        });
        
        // 4. Socket.io olay dinleyicilerini ayarla
        socketInstance.on("connect", () => {
          console.log("Socket bağlantısı başarılı - ID:", socketInstance.id);
          setIsConnected(true);
          setConnectionError(null);
          
          // Kullanıcı kimlik doğrulaması
          socketInstance.emit("authenticate", { userId: session.user.id });
        });
        
        socketInstance.on("connect_error", (err) => {
          console.error("Socket bağlantı hatası:", err.message);
          setIsConnected(false);
          setConnectionError(`Bağlantı hatası: ${err.message}`);
          
          // Bağlantı hatası durumunda polling'e düş
          if (socketInstance.io.engine.transport.name === 'websocket') {
            console.log("WebSocket kullanılamıyor, polling mekanizması devrede");
            // Transport değiştirmeyi dene
            socketInstance.io.engine.transport.close();
          }
        });
        
        socketInstance.on("disconnect", () => {
          console.log("Socket bağlantısı kesildi");
          setIsConnected(false);
        });
        
        // 5. Bağlantıyı başlat
        socketInstance.connect();
        setSocket(socketInstance);
        
        // 6. Bağlantı denemesi yapıldığını işaretle
        setConnectionAttempted(true);
        
        // 7. Cleanup fonksiyonu
        return () => {
          console.log("Socket bağlantısı temizleniyor");
          socketInstance.disconnect();
          setSocket(null);
          setIsConnected(false);
        };
      } catch (error) {
        console.error("WebSocket başlatma hatası:", error);
        setConnectionError("Bağlantı hatası oluştu");
      }
    };
    
    // WebSocket'i başlat
    initSocket();
    
  }, [session, connectionAttempted]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, connectionError }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext); 
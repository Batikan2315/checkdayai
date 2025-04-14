"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

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
        const socketInstance = io(window.location.origin, {
          reconnectionAttempts: 1, // Sadece bir kez yeniden bağlanma denemesi yap
          reconnectionDelay: 2000, // 2 saniye bekle
          timeout: 5000, // 5 saniye timeout
          transports: ["websocket"], // Sadece WebSocket, polling yok
          path: '/api/socketio/',
          auth: { userId: session.user.id },
          forceNew: true, // Her seferinde yeni bağlantı aç
          withCredentials: false, // Cookie kullanma
          autoConnect: false // Manuel bağlanacağız
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
          
          // Bağlantı hatası durumunda WebSocket'i temizle
          socketInstance.close();
        });
        
        socketInstance.on("disconnect", () => {
          console.log("Socket bağlantısı kesildi");
          setIsConnected(false);
          
          // Bağlantı kesildikten sonra tekrar bağlanma denemesi yapma
          // useNotifications polling mekanizması kullanacak
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
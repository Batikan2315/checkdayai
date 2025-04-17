"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';

// Arayüz sadeleştirildi - gereksiz alanlar kaldırıldı
interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  reconnect: () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [pollingMode, setPollingMode] = useState(false);
  const { user, loading } = useAuth();
  
  // Mevcut socket bağlantısını takip etmek için ref
  const socketRef = useRef<Socket | null>(null);
  
  // Son bağlantı denemesi zamanı
  const lastConnectAttemptRef = useRef<number>(0);
  
  // Zamanlayıcıları tutmak için ref
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  
  // Soket bağlantısını temizle
  const cleanupSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    // Zamanlayıcıları temizle
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current = [];
  }, []);
  
  // Soketi bağla - ÖLÇEKLENME İÇİN OPTİMİZE EDİLDİ
  const initSocket = useCallback(() => {
    // Eğer kullanıcı oturum açmamışsa bağlantı kurmayı atla
    if (!user || !user._id || loading) {
      cleanupSocket();
      return;
    }
    
    // Hız sınırlaması - son bağlantı denemesinden bu yana 10 saniye geçmemişse atla
    const now = Date.now();
    if (now - lastConnectAttemptRef.current < 10000) {
      return;
    }
    lastConnectAttemptRef.current = now;
    
    // Mevcut soket varsa kapat
    cleanupSocket();
    
    // Tarayıcıda çalışmıyorsa çık
    if (typeof window === 'undefined') return;
    
    try {
      // Socket.IO sunucusunun URL'sini belirle
      const SOCKET_URL = window.location.origin;
      
      // Socket.IO client yapılandırması - OPTİMİZE EDİLMİŞ
      const newSocket = io(SOCKET_URL, {
        path: '/api/socketio/',
        // Polling ve websocket desteği
        transports: pollingMode ? ['polling'] : ['polling', 'websocket'],
        // Bağlantı ayarları - daha agresif zaman aşımları
        reconnectionAttempts: 2, // 3 yerine 2
        reconnectionDelay: 5000, // 3000 yerine 5000
        timeout: 10000,
        // Bellek optimizasyonları
        autoConnect: true,
        forceNew: true,
        // Mesaj boyutu limiti
        rememberUpgrade: true,
        // Cookie kullanma - webstorage tercih et (farklı sekmelerde çalışabilir)
        withCredentials: false,
        // Kimlik doğrulama
        auth: {
          userId: user._id
        }
      });
      
      // Bağlantı kurulduğunda
      newSocket.on('connect', () => {
        setIsConnected(true);
        setReconnectAttempts(0);
        
        // Kullanıcı kimliğini gönder
        newSocket.emit('authenticate', { userId: user._id });
        
        // Aktif tutmak için düzenli ping gönder
        const pingInterval = setInterval(() => {
          if (newSocket.connected) {
            newSocket.emit('ping');
            // Aktif olduğumuzu bildir
            newSocket.emit('activity');
          } else {
            clearInterval(pingInterval);
          }
        }, 60000); // 1 dakika
        
        timersRef.current.push(pingInterval);
      });
      
      // Bağlantı kesildiğinde
      newSocket.on('disconnect', () => {
        setIsConnected(false);
        
        // Vercel'de WebSocket sorunları varsa polling moduna geç
        if (reconnectAttempts > 0) {
          setPollingMode(true);
        }
      });
      
      // Bağlantı hatası olduğunda
      newSocket.on('connect_error', (err) => {
        // WebSocket hatası, polling moduna geç
        if (err.message.includes('websocket')) {
          setPollingMode(true);
        }
        
        // 2 denemeden sonra vazgeç - daha agresif
        if (reconnectAttempts < 2) {
          const reconnectTimer = setTimeout(() => {
            if (!newSocket.connected) {
              setReconnectAttempts(prev => prev + 1);
              
              // Yeniden bağlanmaya çalış
              newSocket.connect();
            }
          }, 10000); // 5000 yerine 10000 - daha uzun bekleme süresi
          
          timersRef.current.push(reconnectTimer);
        }
      });
      
      // Soket referansını güncelle
      socketRef.current = newSocket;
      setSocket(newSocket);
      
    } catch (error) {
      console.error('Socket bağlantısı kurulamadı');
    }
  }, [user, loading, reconnectAttempts, pollingMode, cleanupSocket]);
  
  // Yeniden bağlanma işlevi - sadeleştirildi
  const reconnect = useCallback(() => {
    setReconnectAttempts(0);
    setPollingMode(false);
    initSocket();
  }, [initSocket]);
  
  // Component unmount olduğunda temizlik yap
  useEffect(() => {
    return () => {
      cleanupSocket();
    };
  }, [cleanupSocket]);
  
  // Kullanıcı değiştiğinde soketi yeniden başlat
  useEffect(() => {
    // Kullanıcı varsa bağlan, yoksa temizle
    if (user && user._id) {
      initSocket();
    } else {
      cleanupSocket();
      setIsConnected(false);
    }
  }, [user, initSocket, cleanupSocket]);
  
  // Sekme görünürlüğü değiştiğinde bağlantıyı kontrol et - daha fazla optimizasyon
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (user && user._id && !isConnected && socketRef.current === null) {
          // Sadece sekme aktifse, user varsa ve bağlantı yoksa yeniden bağlan
          reconnect();
        }
      } else if (document.visibilityState === 'hidden') {
        // Sekme arkaplandaysa ve bağlantı ihtiyacı yoksa disconnnect
        // Bu opsiyonel - bazı uygulamalar arka planda da bağlantı ister
        // Yorum satırını kaldırarak etkinleştirebilirsiniz
        // cleanupSocket();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, isConnected, reconnect, cleanupSocket]);
  
  // Context Provider
  return (
    <SocketContext.Provider value={{ 
      socket, 
      isConnected, 
      reconnect
    }}>
      {children}
    </SocketContext.Provider>
  );
}; 
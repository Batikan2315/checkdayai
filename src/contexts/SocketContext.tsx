"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';

// Daha kapsamlı ve açıklayıcı arayüz
interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  reconnect: () => void;
  connectionType: 'websocket' | 'polling' | 'none';
  lastConnectTime: number | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  reconnect: () => {},
  connectionType: 'none',
  lastConnectTime: null
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [pollingMode, setPollingMode] = useState(false);
  const [connectionType, setConnectionType] = useState<'websocket' | 'polling' | 'none'>('none');
  const [lastConnectTime, setLastConnectTime] = useState<number | null>(null);
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
      console.log('Socket bağlantısı temizleniyor...');
      
      try {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      } catch (error) {
        console.error('Socket temizleme hatası:', error);
      }
      
      socketRef.current = null;
      setConnectionType('none');
    }
    
    // Zamanlayıcıları temizle
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current = [];
  }, []);
  
  // Soketi bağla - OPTİMİZE EDİLDİ VE GÜÇLENDİRİLDİ
  const initSocket = useCallback(() => {
    // Eğer kullanıcı oturum açmamışsa bağlantı kurmayı atla
    if (!user || !user._id || loading) {
      cleanupSocket();
      return;
    }
    
    // Hız sınırlaması - son bağlantı denemesinden bu yana 5 saniye geçmemişse atla
    const now = Date.now();
    if (now - lastConnectAttemptRef.current < 5000) {
      console.log('Çok sık bağlantı denemesi, atlıyorum...');
      return;
    }
    lastConnectAttemptRef.current = now;
    setLastConnectTime(now);
    
    // Mevcut soket varsa kapat
    cleanupSocket();
    
    // Tarayıcıda çalışmıyorsa çık
    if (typeof window === 'undefined') return;
    
    // Debug modu için konsol mesajı
    console.log('Socket.IO bağlantısı başlatılıyor...');
    
    try {
      // Socket.IO sunucu URL'si - CORS sorununu çözmek için güncelledim
      const SOCKET_URL = typeof window !== 'undefined' 
        ? window.location.origin 
        : process.env.NODE_ENV === 'production' 
          ? 'https://checkday.ai' 
          : 'http://localhost:3000';
      
      // Socket.IO client yapılandırması - GÜÇLENDİRİLDİ
      const newSocket = io(SOCKET_URL, {
        path: '/api/socketio',
        // WebSocket hataları nedeniyle polling kullanıyoruz, sonra WebSocket'e geçeceğiz
        transports: ['polling', 'websocket'],
        // Bağlantı ayarları - daha kararlı zaman aşımları
        reconnectionAttempts: 10,      // Daha fazla deneme
        reconnectionDelay: 1000,       // 1 saniye bekleme
        reconnectionDelayMax: 10000,   // En fazla 10 saniye bekleme
        timeout: 60000,                // 60 saniye zaman aşımı
        // Bellek optimizasyonları
        autoConnect: true,
        forceNew: true,
        withCredentials: true,         // CORS için önemli
        // Kimlik doğrulama
        auth: {
          userId: user._id
        },
        // CORS ayarları
        extraHeaders: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": "true"
        }
      });
      
      // Bağlantı olaylarını dinle
      newSocket.on('connect', () => {
        console.log(`Socket bağlantısı kuruldu [ID: ${newSocket.id}]`);
        
        setIsConnected(true);
        setReconnectAttempts(0);
        
        // Transport tipini belirle
        const transport = newSocket.io.engine.transport.name;
        setConnectionType(transport as 'websocket' | 'polling');
        
        if (transport === 'polling') {
          console.log('WebSocket kullanılamıyor, polling mekanizması devrede');
        } else {
          console.log('Socket bağlantısı aktif: WebSocket bildirim dinleyicisi ekleniyor');
        }
        
        // Kullanıcı kimliğini gönder
        newSocket.emit('authenticate', { userId: user._id });
        
        // Kullanıcıya bildir
        if (!pollingMode && transport === 'polling') {
          toast.error('Gerçek zamanlı bağlantı kurulamadı. Bazı özellikler kısıtlı olabilir.', {
            duration: 5000,
            id: 'socket-polling-warning'
          });
        }
        
        // Aktif tutmak için düzenli ping gönder
        const pingInterval = setInterval(() => {
          if (newSocket.connected) {
            newSocket.emit('ping');
          } else {
            clearInterval(pingInterval);
          }
        }, 40000); // 40 saniye
        
        timersRef.current.push(pingInterval);
      });
      
      // Transport güncellemelerini dinle
      newSocket.io.engine.on('upgrade', () => {
        const transport = newSocket.io.engine.transport.name;
        console.log(`Transport güncellendi: ${transport}`);
        setConnectionType(transport as 'websocket' | 'polling');
      });
      
      // Bağlantı geri alınırsa
      newSocket.io.on('reconnect', (attempt) => {
        console.log(`Yeniden bağlantı sağlandı (${attempt}. deneme)`);
        setIsConnected(true);
        setReconnectAttempts(0);
        
        // Kullanıcı kimliğini tekrar gönder
        newSocket.emit('authenticate', { userId: user._id });
      });
      
      // Yeniden bağlanmaya çalışırken
      newSocket.io.on('reconnect_attempt', (attempt) => {
        console.log(`Yeniden bağlanılıyor... (${attempt}. deneme)`);
        
        // 3 denemeden sonra polling'e geç
        if (attempt >= 3 && !pollingMode) {
          console.log('WebSocket bağlantısı başarısız, polling moduna geçiliyor');
          setPollingMode(true);
        }
      });
      
      // Bağlantı kesildiğinde
      newSocket.on('disconnect', (reason) => {
        console.log(`Socket bağlantısı kesildi, neden: ${reason}`);
        setIsConnected(false);
        setConnectionType('none');
        
        // Bazı hata nedenlerinde polling moduna geç
        if (reason === 'transport error' || reason === 'transport close') {
          if (!pollingMode) {
            console.log('Transport hatası, polling moduna geçiliyor');
            setPollingMode(true);
          }
        }
      });
      
      // Bağlantı hatası olduğunda
      newSocket.on('connect_error', (err) => {
        console.error('Socket bağlantı hatası:', err.message);
        
        // WebSocket hatası, polling moduna geç
        if (err.message.includes('websocket')) {
          if (!pollingMode) {
            console.log('WebSocket hatası tespit edildi, polling moduna geçiliyor');
            setPollingMode(true);
          }
        }
        
        // Vercel yüklenme sorunu - bağlantı hatası
        if (err.message.includes('xhr poll error')) {
          toast.error('Sunucu bağlantı hatası. Yenileme gerekebilir.', {
            id: 'socket-xhr-error'
          });
        }
        
        // 3 deneme sonrası bildir
        if (reconnectAttempts >= 3) {
          toast.error('Sunucu ile bağlantı kurulamıyor. Sayfayı yenilemeyi deneyin.', {
            id: 'socket-reconnect-error',
            duration: 10000
          });
        }
        
        setReconnectAttempts(prev => prev + 1);
      });
      
      // Sunucu hatası
      newSocket.on('error', (error) => {
        console.error('Socket sunucu hatası:', error);
      });
      
      // Bildirim geldiğinde
      newSocket.on('notification', (data) => {
        console.log('Yeni bildirim alındı:', data);
      });
      
      // Pong yanıtı - bağlantı sağlıklı
      newSocket.on('pong', (data) => {
        // Sessiz pong
      });
      
      // Soket referansını güncelle
      socketRef.current = newSocket;
      setSocket(newSocket);
      
    } catch (error) {
      console.error('Socket bağlantısı kurulamadı:', error);
      toast.error('Gerçek zamanlı bildirim sistemi başlatılamadı', {
        id: 'socket-init-error'
      });
    }
  }, [user, loading, reconnectAttempts, pollingMode, cleanupSocket]);
  
  // Yeniden bağlanma işlevi - kolayca çağrılabilir
  const reconnect = useCallback(() => {
    console.log('Manuel yeniden bağlantı başlatılıyor...');
    setReconnectAttempts(0);
    setPollingMode(false);
    toast.loading('Sunucuya yeniden bağlanılıyor...', {
      id: 'socket-reconnect'
    });
    
    setTimeout(() => {
      initSocket();
      toast.dismiss('socket-reconnect');
    }, 1000);
  }, [initSocket]);
  
  // Component unmount olduğunda temizlik yap
  useEffect(() => {
    return () => {
      console.log('SocketProvider unmounting - bağlantılar temizleniyor');
      cleanupSocket();
    };
  }, [cleanupSocket]);
  
  // Kullanıcı değiştiğinde soketi yeniden başlat
  useEffect(() => {
    // Kullanıcı varsa bağlan, yoksa temizle
    if (user && user._id) {
      console.log('Kullanıcı mevcut, Socket.IO başlatılıyor...');
      initSocket();
    } else {
      console.log('Kullanıcı yok, Socket.IO temizleniyor...');
      cleanupSocket();
      setIsConnected(false);
    }
  }, [user, initSocket, cleanupSocket]);
  
  // Sekme görünürlüğü değiştiğinde bağlantıyı kontrol et
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (user && user._id && !isConnected) {
          console.log('Sayfa görünür oldu ve bağlantı yok, yeniden bağlanılıyor...');
          // Sadece belirli bir süre geçmişse yeniden bağlan (5 dakika)
          const now = Date.now();
          if (!lastConnectTime || now - lastConnectTime > 5 * 60 * 1000) {
            initSocket();
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, isConnected, initSocket, lastConnectTime]);
  
  // Internet bağlantı durumunu izle
  useEffect(() => {
    const handleOnline = () => {
      console.log('İnternet bağlantısı geri geldi, yeniden bağlanılıyor');
      if (user && user._id && !isConnected) {
        // Kısa bir gecikmeyle bağlan - ağ stabilizasyonu için
        setTimeout(() => {
          initSocket();
        }, 2000);
      }
    };
    
    const handleOffline = () => {
      console.log('İnternet bağlantısı kesildi');
      // Offline durumda soket bağlantısını temizle
      cleanupSocket();
      setIsConnected(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, isConnected, initSocket, cleanupSocket]);
  
  // Context Provider
  return (
    <SocketContext.Provider value={{ 
      socket, 
      isConnected, 
      reconnect,
      connectionType,
      lastConnectTime
    }}>
      {children}
    </SocketContext.Provider>
  );
}; 
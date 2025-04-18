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
    // Sunucu tarafında çalışmasını engelle
    if (typeof window === "undefined") return null;
    
    // Önceden bağlantı varsa temizle
    if (socket && socket.connected) {
      socket.disconnect();
    }
    
    // Eğer kullanıcı oturum açmamışsa bağlantı kurmayı atla
    if (!user || !user._id || loading) {
      cleanupSocket();
      return;
    }
    
    // Hız sınırlaması - son bağlantı denemesinden bu yana 10 saniye geçmemişse atla
    const now = Date.now();
    if (now - lastConnectAttemptRef.current < 10000) {
      console.log('Çok sık bağlantı denemesi, atlıyorum...');
      return;
    }
    lastConnectAttemptRef.current = now;
    setLastConnectTime(now);
    
    // Mevcut soket varsa kapat
    cleanupSocket();
    
    // Yeni bağlantı sayısını göster
    const reconnectCount = reconnectAttempts > 0 ? ` (${reconnectAttempts}. deneme)` : '';
    console.log(`Socket.IO bağlantısı başlatılıyor...${reconnectCount}`);
    
    try {
      // Socket.IO sunucu URL'si - CORS sorununu çözmek için güncelledim
      const SOCKET_URL = typeof window !== 'undefined' 
        ? window.location.origin 
        : process.env.NODE_ENV === 'production' 
          ? 'https://checkday.ai' 
          : 'http://localhost:3000';
      
      // Socket.IO client yapılandırması - HATAYA KARŞI DAHA DAYANIKLI
      const newSocket = io(SOCKET_URL, {
        path: '/api/socketio',
        // Önce polling, ardından upgrade stratejisi uyguluyoruz
        transports: pollingMode ? ['polling'] : ['polling', 'websocket'],
        // Bağlantı ayarları - daha güvenli değerler
        reconnectionAttempts: 8,       // Daha fazla deneme
        reconnectionDelay: 2000,       // 2 saniye bekleme (daha uzun)
        reconnectionDelayMax: 10000,   // En fazla 10 saniye bekleme
        timeout: 40000,                // 40 saniye zaman aşımı
        // Bellek ve bağlantı optimizasyonları
        autoConnect: true,
        forceNew: true,
        multiplex: false,              // Her bağlantı için yeni bir soket (izolasyon)
        withCredentials: true,
        // Kimlik doğrulama
        auth: {
          userId: user._id,
          ts: Date.now()              // Zaman damgası
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
          console.log('Polling bağlantısı kuruldu - performans optimize ediliyor');
          // 3 saniye sonra websocket'e geçmeyi dene (daha uzun süre)
          const upgradeTimer = setTimeout(() => {
            if (newSocket.connected && transport === 'polling') {
              console.log('WebSocket bağlantısına geçiliyor...');
              // Daha nazik bir upgrade stratejisi
              try {
                newSocket.io.engine.transport.query.EIO = '4';
                newSocket.io.engine.transport.query.transport = 'websocket';
              } catch (error) {
                console.warn('WebSocket upgrade hatası:', error);
              }
            }
          }, 3000);
          
          timersRef.current.push(upgradeTimer);
        } else {
          console.log('WebSocket bağlantısı aktif: Gerçek zamanlı bildirimler aktif');
        }
        
        // Kullanıcı kimliğini gönder (daha fazla bilgi ile)
        newSocket.emit('authenticate', { 
          userId: user._id,
          transport: transport,
          timestamp: Date.now(),
          reconnect: reconnectAttempts > 0
        });
        
        // Aktif tutmak için düzenli ping gönder (daha sık)
        const pingInterval = setInterval(() => {
          if (newSocket.connected) {
            newSocket.emit('ping', { ts: Date.now() });
          } else {
            clearInterval(pingInterval);
          }
        }, 30000); // 30 saniye (daha sık)
        
        timersRef.current.push(pingInterval);
      });
      
      // Transport güncellemelerini dinle
      newSocket.io.engine.on('upgrade', () => {
        const transport = newSocket.io.engine.transport.name;
        console.log(`Transport güncellendi: ${transport}`);
        setConnectionType(transport as 'websocket' | 'polling');
        
        // WebSocket'e upgrade başarılı olduğunda
        if (transport === 'websocket') {
          setPollingMode(false); // Polling modunu kapat
        }
      });
      
      // Bağlantı geri alınırsa
      newSocket.io.on('reconnect', (attempt) => {
        console.log(`Yeniden bağlantı sağlandı (${attempt}. deneme)`);
        setIsConnected(true);
        setReconnectAttempts(0);
        
        // Kullanıcı kimliğini tekrar gönder
        newSocket.emit('authenticate', { 
          userId: user._id,
          timestamp: Date.now(),
          reconnect: true
        });
      });
      
      // Yeniden bağlanmaya çalışırken
      newSocket.io.on('reconnect_attempt', (attempt) => {
        console.log(`Yeniden bağlanılıyor... (${attempt}. deneme)`);
        
        // 3 denemeden sonra polling'e geç
        if (attempt >= 3 && !pollingMode) {
          console.log('WebSocket bağlantısı başarısız, polling moduna geçiliyor');
          setPollingMode(true);
        }
        
        // 5. denemeden sonra kullanıcıya bildir
        if (attempt === 5) {
          toast.error('Sunucu bağlantısı kurulamıyor. Lütfen internet bağlantınızı kontrol edin.', {
            id: 'socket-reconnect-warning',
            duration: 8000
          });
        }
      });
      
      // Bağlantı kesildiğinde
      newSocket.on('disconnect', (reason) => {
        console.log(`Socket bağlantısı kesildi, neden: ${reason}`);
        setIsConnected(false);
        setConnectionType('none');
        
        // Sunucu tarafından kapatıldıysa
        if (reason === 'io server disconnect') {
          // Sunucu tarafı kapatma, manuel yeniden bağlantı gerekli
          console.log('Sunucu tarafından bağlantı kapatıldı, manuel yeniden bağlanmayı deneyin');
          toast.error('Oturum sonlandırıldı. Yeniden giriş yapmanız gerekebilir.', {
            id: 'socket-server-disconnect',
            duration: 10000
          });
        }
        // Bazı hata nedenlerinde polling moduna geç
        else if (['transport error', 'transport close', 'ping timeout'].includes(reason)) {
          if (!pollingMode) {
            console.log(`Transport sorunu (${reason}), polling moduna geçiliyor`);
            setPollingMode(true);
          }
          
          // Kısa bir süre sonra yeniden bağlanmayı dene
          const reconnectTimer = setTimeout(() => {
            if (!isConnected && user && user._id) {
              initSocket();
            }
          }, 5000);
          
          timersRef.current.push(reconnectTimer);
        }
      });
      
      // Bağlantı hatası olduğunda
      newSocket.on('connect_error', (err) => {
        console.error('Socket bağlantı hatası:', err.message);
        
        // Hataya özgü stratejiler
        if (err.message.includes('websocket')) {
          if (!pollingMode) {
            console.log('WebSocket hatası tespit edildi, polling moduna geçiliyor');
            setPollingMode(true);
          }
        }
        
        // 3-5 deneme sonrası bildir
        if (reconnectAttempts === 3) {
          toast.error('Sunucu ile bağlantı kurulamıyor. Internet bağlantınızı kontrol edin.', {
            id: 'socket-reconnect-error',
            duration: 8000
          });
        }
        
        setReconnectAttempts(prev => prev + 1);
      });
      
      // Sunucu hatası
      newSocket.on('error', (error) => {
        console.error('Socket sunucu hatası:', error);
      });
      
      // Pong yanıtı - bağlantı sağlıklı
      newSocket.on('pong', (data) => {
        // Bağlantı gecikmesini hesapla
        if (data?.ts) {
          const latency = Date.now() - data.ts;
          // Yüksek gecikme tespiti
          if (latency > 2000) {
            console.warn(`Yüksek bağlantı gecikmesi: ${latency}ms`);
          }
        }
      });
      
      // Soket referansını güncelle
      socketRef.current = newSocket;
      setSocket(newSocket);
      
    } catch (error) {
      console.error('Socket bağlantısı kurulamadı:', error);
      toast.error('Gerçek zamanlı bildirim sistemi başlatılamadı', {
        id: 'socket-init-error'
      });
      
      // Hata durumunda 10 saniye sonra tekrar dene
      const retryTimer = setTimeout(() => {
        if (user && user._id && !isConnected) {
          setReconnectAttempts(prev => prev + 1);
          initSocket();
        }
      }, 10000);
      
      timersRef.current.push(retryTimer);
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
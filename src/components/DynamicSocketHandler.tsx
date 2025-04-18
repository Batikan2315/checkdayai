"use client";

import { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import Script from 'next/script';

// Socket.IO tipini tanımla
interface Socket {
  id: string;
  connected: boolean;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  emit: (event: string, ...args: any[]) => void;
  connect: () => void;
  disconnect: () => void;
  removeAllListeners: () => void;
  io: any;
}

// Socket.IO Client global tanımı
declare global {
  interface Window {
    io: (url: string, options: any) => Socket;
  }
}

interface Props {
  session: any;
}

export default function DynamicSocketHandler({ session }: Props) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socketScriptLoaded, setSocketScriptLoaded] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const retryCountRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Socket.IO script yüklenince
  const handleSocketScriptLoad = () => {
    console.log('Socket.IO script yüklendi');
    setSocketScriptLoaded(true);
  };
  
  // Socket bağlantısı kurma
  const connect = () => {
    // Socket.IO script yüklü değilse çık
    if (!socketScriptLoaded || typeof window.io !== 'function') {
      console.log('Socket.IO script henüz yüklenmedi');
      return;
    }
    
    // Önceki soket varsa temizle
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    console.log('Socket.IO bağlantısı başlatılıyor...');
    
    try {
      // Yeni socket bağlantısı oluştur
      const socket = window.io(window.location.origin, {
        path: '/api/socketio',
        transports: ['polling'],
        reconnection: false,
        timeout: 15000,
        query: {
          userId: session?.user?.id || session?.user?._id || null
        },
        withCredentials: true,
        autoConnect: true,
        forceNew: true,
      });
      
      socketRef.current = socket;
      
      // Bağlantı olaylarını dinle
      socket.on('connect', () => {
        console.log('Socket.IO bağlantısı kuruldu!');
        setIsConnected(true);
        setError(null);
        retryCountRef.current = 0;
        
        // Kimlik doğrulama
        socket.emit('authenticate', { 
          userId: session?.user?.id || session?.user?._id,
          timestamp: Date.now() 
        });
        
        // Bildirimleri al
        fetchNotifications();
      });
      
      socket.on('connect_error', (err) => {
        console.error('Socket bağlantı hatası:', err.message);
        setIsConnected(false);
        setError(err.message);
        
        // Otomatik yeniden bağlanma
        if (retryCountRef.current < 5) {
          const delay = Math.min(5000, (retryCountRef.current + 1) * 1000);
          console.log(`Yeniden bağlanma deneniyor: ${delay}ms sonra`);
          
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            retryCountRef.current++;
            connect();
          }, delay);
        } else {
          toast.error('Sunucu bağlantısı kurulamıyor. Lütfen daha sonra tekrar deneyin.', {
            id: 'socket-error',
            duration: 5000,
          });
        }
      });
      
      socket.on('disconnect', (reason) => {
        console.log('Socket bağlantısı kesildi:', reason);
        setIsConnected(false);
        
        // Bağlantı otomatik olarak yeniden kurulsun
        if (reason !== 'io client disconnect' && reason !== 'io server disconnect') {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      });
      
      socket.on('error', (err) => {
        console.error('Socket hatası:', err);
        setError(String(err));
      });
      
      // Yeni bildirim dinleme
      socket.on('yeni-bildirim', (yeniBildirim) => {
        console.log('Yeni bildirim alındı:', yeniBildirim);
        
        // Bildirim göster
        toast.success(yeniBildirim.mesaj || 'Yeni bir bildirim aldınız', {
          id: `bildirim-${yeniBildirim._id || Date.now()}`,
          duration: 5000,
        });
        
        // Bildirimleri yenile
        fetchNotifications();
      });
    } catch (error) {
      console.error('Socket oluşturma hatası:', error);
      setError(String(error));
    }
  };
  
  // Bildirimleri alma
  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (!response.ok) {
        throw new Error('Bildirimler alınamadı');
      }
      // Yanıtı işle, burada bir şey yapmamıza gerek yok
    } catch (error) {
      console.error('Bildirimler alınamadı:', error);
    }
  };
  
  // Manuel yeniden bağlanma
  const reconnect = () => {
    toast.loading('Sunucuya yeniden bağlanılıyor...', {
      id: 'reconnect-toast',
      duration: 3000,
    });
    retryCountRef.current = 0;
    connect();
  };
  
  // Socket.IO script yüklendiğinde bağlantıyı başlat
  useEffect(() => {
    if (socketScriptLoaded && session?.user) {
      connect();
    }
    
    // Temizlik işlevi
    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
      
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [socketScriptLoaded, session]);
  
  // Sayfa görünürlüğünü izle
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected && session?.user) {
        connect();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, session]);
  
  return (
    <>
      <Script 
        src="https://cdn.socket.io/4.5.4/socket.io.min.js"
        integrity="sha384-/KNQL8Nu5gCHLqwqfQjA689Hhoqgi2S84SNUxC3roTe4EhJ9AfLkp8QiQcU8AMzI"
        crossOrigin="anonymous"
        onLoad={handleSocketScriptLoad}
        strategy="afterInteractive"
      />
      
      {/* Yeniden bağlan butonu */}
      {!isConnected && error && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={reconnect}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Yeniden Bağlan</span>
          </button>
        </div>
      )}
    </>
  );
} 
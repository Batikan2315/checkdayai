"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';
import { IUser } from '@/lib/types';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  lastPing: number | null;
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  lastPing: null,
  reconnect: () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastPing, setLastPing] = useState<number | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const { user, loading } = useAuth();
  
  // Soketi bağla
  const initSocket = useCallback(() => {
    // Eğer kullanıcı oturum açmamışsa veya yükleme devam ediyorsa, bağlantı kurmayı atla
    if (!user || loading) return;
    
    // Eğer soket zaten varsa, önceki soket bağlantısını kapat
    if (socket) {
      socket.disconnect();
    }
    
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://checkday.app';
    const newSocket = io(SOCKET_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('token')
      }
    });
    
    newSocket.on('connect', () => {
      console.log('Socket.io bağlantısı kuruldu');
      setIsConnected(true);
      setReconnectAttempts(0);
      
      // Kullanıcıyı kendi odasına ekle
      if (user) {
        newSocket.emit('join_user_room', { userId: user._id });
      }
    });
    
    newSocket.on('disconnect', () => {
      console.log('Socket.io bağlantısı kesildi');
      setIsConnected(false);
    });
    
    newSocket.on('connect_error', (err) => {
      console.log('Socket.io bağlantı hatası:', err.message);
      
      if (reconnectAttempts < 5) {
        setTimeout(() => {
          newSocket.connect();
          setReconnectAttempts(prev => prev + 1);
        }, 5000); // 5 saniyede bir yeniden bağlanmayı dene
      } else {
        toast.error('Gerçek zamanlı bağlantı kurulamadı, lütfen sayfayı yenileyin.');
      }
    });
    
    // Ping kontrolü
    newSocket.on('pong', () => {
      setLastPing(Date.now());
    });
    
    // 30 saniyede bir ping gönder
    const pingInterval = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('ping');
      }
    }, 30000);
    
    setSocket(newSocket);
    
    // Temizleme işlemleri
    return () => {
      clearInterval(pingInterval);
      newSocket.disconnect();
    };
  }, [user, loading, reconnectAttempts]);
  
  // Yeniden bağlanma işlevi
  const reconnect = useCallback(() => {
    setReconnectAttempts(0);
    initSocket();
  }, [initSocket]);
  
  // Kullanıcı değiştiğinde soketi yeniden başlat
  useEffect(() => {
    const cleanup = initSocket();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [initSocket, user]);
  
  // Tarayıcı sekme aktif/pasif olduğunda bağlantıyı yönet
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (socket && !isConnected) {
          reconnect();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [socket, isConnected, reconnect]);
  
  // 5 dakika boyunca ping alınmazsa bağlantıyı yeniden kur
  useEffect(() => {
    const checkPingInterval = setInterval(() => {
      if (isConnected && lastPing) {
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        if (now - lastPing > fiveMinutes) {
          console.log('5 dakikadan uzun süredir ping alınamadı, bağlantı yenileniyor');
          reconnect();
        }
      }
    }, 60000); // Her dakika kontrol et
    
    return () => {
      clearInterval(checkPingInterval);
    };
  }, [isConnected, lastPing, reconnect]);
  
  return (
    <SocketContext.Provider value={{ socket, isConnected, lastPing, reconnect }}>
      {children}
    </SocketContext.Provider>
  );
}; 
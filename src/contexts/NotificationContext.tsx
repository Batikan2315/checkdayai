"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

// Bildirim türü
interface Notification {
  _id: string;
  userId: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

// Context türü
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  totalCount: number;
  isLoadingNotifications: boolean;
  fetchNotifications: (page?: number, limit?: number, unreadOnly?: boolean) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

// Context oluştur
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Context hook
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Provider bileşeni
export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  const [forceRefresh, setForceRefresh] = useState(false);

  // Bildirimleri getir
  const fetchNotifications = async (page = 1, limit = 10, unreadOnly = false) => {
    if (!session?.user?.id) {
      console.log('Kullanıcı giriş yapmadı, bildirim getirme engellendi');
      return;
    }
    
    // 10 saniye içinde tekrar çağrılmasını engelle
    const now = Date.now();
    if (lastFetchTime && now - lastFetchTime < 10000) {
      console.log('Çok sık bildirim sorgulaması engellendi');
      return;
    }
    
    if (isLoadingNotifications) {
      console.log('Bildirimler zaten yükleniyor, tekrar çağrılmıyor');
      return;
    }
    
    if (notifications.length > 0 && !forceRefresh) {
      console.log('Bildirimler zaten yüklendi, tekrar çağrılmıyor');
      return;
    }
    
    try {
      setIsLoadingNotifications(true);
      setLastFetchTime(now);
      
      const response = await fetch(
        `/api/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Bildirimler getirilemedi');
      }
      
      const data = await response.json();
      setNotifications(data.notifications || []);
      setTotalCount(data.totalCount || 0);
      setUnreadCount(data.unreadCount || 0);
      
      // Başarılı getirildikten sonra forceRefresh'i sıfırla
      setForceRefresh(false);
    } catch (error) {
      console.error('Bildirim getirme hatası:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  // Bildirimi okundu olarak işaretle
  const markAsRead = async (notificationId: string) => {
    if (!session?.user?.id) return;
    
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Bildirim okundu olarak işaretlenemedi');
      }
      
      // Bildirimleri güncelle
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification._id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
      
      // Okunmamış sayısını güncelle
      setUnreadCount(prevCount => Math.max(0, prevCount - 1));
    } catch (error) {
      console.error('Bildirim işaretleme hatası:', error);
    }
  };

  // Tüm bildirimleri okundu olarak işaretle
  const markAllAsRead = async () => {
    if (!session?.user?.id) return;
    
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Tüm bildirimler okundu olarak işaretlenemedi');
      }
      
      // Bildirimleri güncelle
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({ ...notification, read: true }))
      );
      
      // Okunmamış sayısını sıfırla
      setUnreadCount(0);
    } catch (error) {
      console.error('Toplu bildirim işaretleme hatası:', error);
    }
  };

  // Kullanıcı oturumu değiştiğinde bildirimleri getir
  useEffect(() => {
    if (session?.user?.id) {
      console.log('İlk yükleme bildirimleri getiriliyor');
      fetchNotifications();
    }
  }, [session?.user?.id]);

  // Context değerleri
  const value = {
    notifications,
    unreadCount,
    totalCount,
    isLoadingNotifications,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext; 
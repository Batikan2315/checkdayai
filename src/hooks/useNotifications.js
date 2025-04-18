"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import useSocket from './useSocket';

export default function useNotifications() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeType, setActiveType] = useState(null);
  const { socket, bağlantıDurumu } = useSocket();
  
  // Bildirimleri API'den getiren fonksiyon
  const fetchNotifications = useCallback(async ({ force = false } = {}) => {
    // Oturum yoksa çıkış yap
    if (!session?.user?.id) {
      console.log("Kullanıcı giriş yapmadı, API isteği engelleniyor");
      return;
    }
    
    // Son istek kontrolü (3 dakika)
    const lastFetch = localStorage.getItem('lastNotificationFetch');
    const now = Date.now();
    
    if (lastFetch && !force && (now - parseInt(lastFetch) < 3 * 60 * 1000)) {
      console.log("Son istekten beri 3 dakikadan az zaman geçti, istek engelleniyor");
      return;
    }
    
    try {
      setLoading(true);
      console.log("İlk yükleme bildirimleri getiriliyor");
      
      // API isteği
      const response = await fetch('/api/notifications');
      
      if (!response.ok) {
        throw new Error('API yanıtı alınamadı');
      }
      
      const data = await response.json();
      
      // Bildirimleri kaydet
      setNotifications(data);
      
      // Okunmamış sayısını hesapla
      const unread = data.filter(n => !n.read).length;
      setUnreadCount(unread);
      
      // Son istek zamanını kaydet
      localStorage.setItem('lastNotificationFetch', now.toString());
    } catch (error) {
      console.error("Bildirimler alınamadı:", error);
    } finally {
      setLoading(false);
    }
  }, [session]);
  
  // WebSocket ile yeni bildirimleri alma
  useEffect(() => {
    if (!socket || !bağlantıDurumu || !session?.user?.id) return;
    
    // Yeni bildirim geldiğinde
    const handleNewNotification = (newNotification) => {
      console.log("Yeni bildirim alındı:", newNotification);
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };
    
    // Bildirim silindiğinde
    const handleDeletedNotification = (notificationId) => {
      console.log("Bildirim silindi:", notificationId);
      setNotifications(prev => {
        const notification = prev.find(n => n._id === notificationId);
        const isUnread = notification && !notification.read;
        
        // Bildirim sayısını güncelle
        if (isUnread) {
          setUnreadCount(count => Math.max(0, count - 1));
        }
        
        return prev.filter(n => n._id !== notificationId);
      });
    };
    
    // Okunma durumu güncellendiğinde
    const handleReadStatusChange = (data) => {
      console.log("Bildirim okunma durumu değişti:", data);
      
      if (data.allRead) {
        // Tümü okundu
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      } else if (data.notificationId) {
        // Tek bildirim okundu
        setNotifications(prev => prev.map(n => 
          n._id === data.notificationId ? { ...n, read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    };
    
    // Socket olaylarını dinle
    socket.on('new_notification', handleNewNotification);
    socket.on('notification_deleted', handleDeletedNotification);
    socket.on('notification_read', handleReadStatusChange);
    
    // İlk bildirimleri getir
    fetchNotifications();
    
    // Temizlik
    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('notification_deleted', handleDeletedNotification);
      socket.off('notification_read', handleReadStatusChange);
    };
  }, [socket, bağlantıDurumu, session, fetchNotifications]);
  
  // Önceki kullanıcıdan kalan bildirimleri temizle
  useEffect(() => {
    if (!session?.user) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [session]);
  
  // İlk yüklemede bildirimleri getir
  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications();
    }
  }, [session, fetchNotifications]);
  
  // Bildirimi okundu olarak işaretle
  const markAsRead = async (notificationId) => {
    if (!session?.user?.id) return;
    
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ read: true }),
      });
      
      if (!response.ok) {
        throw new Error('API yanıtı alınamadı');
      }
      
      // UI güncelle
      setNotifications(prev => prev.map(n => 
        n._id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Bildirim okundu işaretlenirken hata:", error);
    }
  };
  
  // Tüm bildirimleri okundu olarak işaretle
  const markAllAsRead = async () => {
    if (!session?.user?.id) return;
    
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('API yanıtı alınamadı');
      }
      
      // UI güncelle
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Tüm bildirimler okundu işaretlenirken hata:", error);
    }
  };
  
  // Bildirimi sil
  const deleteNotification = async (notificationId) => {
    if (!session?.user?.id) return;
    
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('API yanıtı alınamadı');
      }
      
      // UI güncelle
      setNotifications(prev => {
        const notification = prev.find(n => n._id === notificationId);
        const isUnread = notification && !notification.read;
        
        // Bildirim sayısını güncelle
        if (isUnread) {
          setUnreadCount(count => Math.max(0, count - 1));
        }
        
        return prev.filter(n => n._id !== notificationId);
      });
    } catch (error) {
      console.error("Bildirim silinirken hata:", error);
    }
  };
  
  // Tüm bildirimleri veya belirli tipteki tüm bildirimleri sil
  const deleteAllNotifications = async (type = null) => {
    if (!session?.user?.id) return;
    
    try {
      const endpoint = type 
        ? `/api/notifications/delete-by-type?type=${type}` 
        : '/api/notifications/delete-all';
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('API yanıtı alınamadı');
      }
      
      // UI güncelle
      if (type) {
        setNotifications(prev => {
          const newNotifications = prev.filter(n => n.type !== type);
          
          // Okunmamış bildirimleri yeniden hesapla
          const unread = newNotifications.filter(n => !n.read).length;
          setUnreadCount(unread);
          
          return newNotifications;
        });
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Bildirimler silinirken hata:", error);
    }
  };
  
  // Bildirimleri tipe göre filtrele
  const filterByType = (type) => {
    setActiveType(type);
  };
  
  // Filtrelenmiş bildirimleri döndür
  const filteredNotifications = activeType
    ? notifications.filter(n => n.type === activeType)
    : notifications;
  
  return {
    notifications: filteredNotifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    fetchNotifications,
    filterByType,
    activeType,
  };
} 
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';

// Basit bir önbellek implementasyonu
const CACHE_TTL = 5 * 60 * 1000; // 5 dakika - milisaniye cinsinden
const cache: Record<string, { data: any; timestamp: number }> = {};

// Bildirim tipi
type Notification = {
  _id: string;
  userId: string;
  type: 'system' | 'invitation' | 'message' | 'like' | 'join' | 'reminder';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
};

type NotificationResponse = {
  notifications: Notification[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  unreadCount: number;
};

// API çağrı sayısını takip etmek için
let apiCallCounter = 0;
let issuedApiWarning = false;

export default function useNotifications() {
  const { data: session } = useSession();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  // Aktif filtreleri tutmak için state ekle
  const [activeType, setActiveType] = useState<string | null>(null);
  // Son bildirim yüklemesi zamanını tut
  const lastFetchRef = useRef<number>(0);
  // Debounce için zamanlayıcı
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // İlk yüklemeyi takip et
  const initialLoadDoneRef = useRef<boolean>(false);

  // Debounce ile yenileme
  const debouncedFetch = useCallback((options?: { 
    page?: number, 
    limit?: number, 
    unreadOnly?: boolean,
    type?: string,
    force?: boolean
  }) => {
    // Eğer zaten bir zamanlayıcı varsa, onu temizle
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Zamanlayıcı kur - 2 saniye bekle
    debounceTimerRef.current = setTimeout(() => {
      fetchNotifications(options);
      debounceTimerRef.current = null;
    }, 2000);
  }, []);

  // Bildirimleri getir
  const fetchNotifications = useCallback(async (options?: { 
    page?: number, 
    limit?: number, 
    unreadOnly?: boolean,
    type?: string,
    force?: boolean
  }) => {
    if (!session || !user) {
      console.log('Kullanıcı giriş yapmadı, API isteği engelleniyor');
      return;
    }
    
    // Zaten yükleniyor durumundaysa tekrar istek yapma
    if (loading) {
      console.log('Zaten bildirimler yükleniyor, istek atlanıyor');
      return;
    }
    
    // Zaten yüklenmiş ise ve force değilse yeni istek yapma
    if (initialLoadDoneRef.current && !options?.force && notifications.length > 0) {
      console.log('Bildirimler zaten yüklendi, tekrar çağrılmıyor');
      return;
    }
    
    // API çağrısı sınırlama
    apiCallCounter++;
    if (apiCallCounter > 10 && !issuedApiWarning) {
      console.warn(`⚠️ Çok fazla API çağrısı yapıldı: ${apiCallCounter}`);
      issuedApiWarning = true;
      
      // Çok fazla istek varsa bir süre engelle
      if (apiCallCounter > 20 && !options?.force) {
        console.log('Çok fazla istek yapıldı, API istekleri geçici olarak engellendi');
        return;
      }
    }
    
    // Çok sık yenileme yapılmasını engelle (en az 60 saniye ara ile)
    const now = Date.now();
    if (!options?.force && now - lastFetchRef.current < 60000) {
      console.log('Çok sık bildirim sorgulaması engellendi');
      return;
    }
    
    setLoading(true);
    setError(null);
    lastFetchRef.current = now;
    
    try {
      const page = options?.page || pagination.page;
      const limit = options?.limit || pagination.limit;
      const unreadOnly = options?.unreadOnly || false;
      // Bildirim türü filtresini ekle
      const type = options?.type || activeType;
      
      // Tür parametresi değiştiyse, state'i güncelle
      if (options?.type !== undefined && options.type !== activeType) {
        setActiveType(options.type);
      }
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        unreadOnly: unreadOnly.toString(),
      });
      
      // Tür filtresi ekle
      if (type) {
        queryParams.append('type', type);
      }
      
      // Timeout ekleyelim
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout
      
      try {
        const response = await fetch(`/api/notifications?${queryParams.toString()}`, {
          signal: controller.signal,
          // Hata ayıklama için kredensiyelleri ekleyelim
          credentials: 'include'
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Bilinmeyen hata' }));
          throw new Error(error.message || `Sunucu hatası: ${response.status}`);
        }
        
        const data: NotificationResponse = await response.json().catch(() => {
          throw new Error('API yanıtı JSON formatında değil');
        });
        
        // Yanıt doğrulama
        if (!data || !Array.isArray(data.notifications)) {
          // API yanıtı geçerli değilse boş dizi döndür, kullanıcı deneyimini bozmayalım
          console.error('API yanıtı geçersiz format:', data);
          setNotifications([]);
          setUnreadCount(0);
          setPagination({...pagination, total: 0, totalPages: 0});
          return;
        }
        
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
        setPagination(data.pagination || {...pagination, total: data.notifications.length});
        
        // İlk yükleme tamamlandı
        initialLoadDoneRef.current = true;
      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          console.log('Bildirimler yüklenirken zaman aşımı oluştu, endişelenmeyin');
          setError('Bildirimler yüklenemedi. Daha sonra tekrar deneyin.');
        } else {
          setError(fetchError.message);
          console.error('Bildirim getirme hatası:', fetchError);
        }
        
        // Kullanıcı arayüzünü düzgün göstermek için boş dizi ayarla
        setNotifications([]);
      }
    } catch (err: any) {
      setError(err.message || 'Beklenmeyen bir hata oluştu');
      console.error('useNotifications genel hata:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, user, pagination, activeType, loading, notifications.length]);

  // Bildirimi okundu olarak işaretle
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!session || !user) return false;
    
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Bildirim güncellenemedi');
      }
      
      // Bildirimi güncelle
      setNotifications(prev => 
        prev.map(n => 
          n._id === notificationId 
            ? { ...n, isRead: true } 
            : n
        )
      );
      
      // Okunmamış bildirim sayısını güncelle
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      return true;
    } catch (err) {
      console.error('Bildirim okundu işaretleme hatası:', err);
      return false;
    }
  }, [session, user]);

  // Tüm bildirimleri okundu olarak işaretle
  const markAllAsRead = useCallback(async () => {
    if (!session || !user) return false;
    
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAllRead: true }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Bildirimler güncellenemedi');
      }
      
      // Bildirimleri güncelle
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );
      
      // Okunmamış bildirim sayısını sıfırla
      setUnreadCount(0);
      
      return true;
    } catch (err) {
      console.error('Tüm bildirimleri okundu işaretleme hatası:', err);
      return false;
    }
  }, [session, user]);

  // Bildirimi sil
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!session || !user) return false;
    
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Bildirim silinemedi');
      }
      
      // Bildirimi listeden kaldır
      setNotifications(prev => 
        prev.filter(n => n._id !== notificationId)
      );
      
      // Eğer okunmamış bir bildirim silindiyse sayacı güncelle
      const deletedNotification = notifications.find(n => n._id === notificationId);
      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      return true;
    } catch (err) {
      console.error('Bildirim silme hatası:', err);
      return false;
    }
  }, [session, user, notifications]);

  // Toplu silme işlevi ekle
  const deleteAllNotifications = useCallback(async (type?: string) => {
    if (!session || !user) return false;
    
    try {
      // URL parametrelerini hazırla
      const queryParams = new URLSearchParams();
      
      if (type) {
        queryParams.append('type', type);
      } else {
        queryParams.append('deleteAll', 'true');
      }
      
      const response = await fetch(`/api/notifications?${queryParams.toString()}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Bildirimler silinemedi');
      }
      
      // Silinen bildirimleri UI'dan temizle
      if (type) {
        setNotifications(prev => prev.filter(n => n.type !== type));
        // Okunmamış bildirimleri güncelle
        const unreadDeleted = notifications.filter(n => n.type === type && !n.isRead).length;
        setUnreadCount(prev => Math.max(0, prev - unreadDeleted));
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
      
      return true;
    } catch (err) {
      console.error('Bildirim toplu silme hatası:', err);
      return false;
    }
  }, [session, user, notifications]);

  // Bildirimleri türe göre filtrele
  const filterByType = useCallback((type: string | null) => {
    setActiveType(type);
    
    // Debounce ile api çağrısı
    debouncedFetch({ 
      page: 1, // Sayfa 1'e dön
      type: type || undefined,
      force: true
    });
  }, [debouncedFetch]);

  // Sayfa değiştirme
  const changePage = useCallback((newPage: number) => {
    const page = Math.max(1, Math.min(newPage, pagination.totalPages));
    setPagination(prev => ({ ...prev, page }));
    
    // Debounce ile api çağrısı
    debouncedFetch({ 
      page, 
      type: activeType || undefined,
      force: true
    });
  }, [pagination.totalPages, debouncedFetch, activeType]);

  // İlk yükleme ve bildirim dinleyicileri
  useEffect(() => {
    if (!session || !user) return;
    
    // Zaten yüklenmiş mi kontrol et
    if (initialLoadDoneRef.current && notifications.length > 0) {
      console.log("Bildirimler zaten yüklendi, tekrar çağrılmıyor");
      return;
    }
    
    console.log("İlk yükleme bildirimleri getiriliyor");
    fetchNotifications({ force: true });
    initialLoadDoneRef.current = true;
    
    // WebSocket ile bildirim dinleme VEYA polling mekanizması
    let pollingInterval: NodeJS.Timeout | null = null;
    
    // WebSocket bağlantısı kontrol et
    if (socket && isConnected) {
      console.log("Socket bağlantısı aktif: WebSocket bildirim dinleyicisi ekleniyor");
      
      // Yeni bildirim dinleyicisi
      const handleNewNotification = (notification: Notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      };
      
      socket.on('notification', handleNewNotification);
      
      // Bildirimleri yeniden yükleme olayı
      socket.on('refresh_notifications', () => {
        fetchNotifications({ force: true });
      });
    } else {
      console.log("WebSocket kullanılamıyor, polling mekanizması devrede");
      
      // Polling mekanizmasını başlat - 60 saniyede bir bildirim kontrolü
      pollingInterval = setInterval(() => {
        console.log("Polling bildirim kontrolü yapılıyor");
        fetchNotifications({ force: true });
      }, 60000);
      
      // Polling için maksimum 5 dakika süre
      setTimeout(() => {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          console.log("Polling mekanizması durduruldu");
        }
      }, 5 * 60 * 1000);
    }
    
    // Cleanup fonksiyonu
    return () => {
      // WebSocket bağlantısı temizleme
      if (socket && isConnected) {
        socket.off('notification');
        socket.off('refresh_notifications');
      }
      
      // Polling interval temizleme
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, user, socket, isConnected]);

  // Sayfa değiştiğinde bildirimleri getir
  useEffect(() => {
    if (initialLoadDoneRef.current && user) {
      fetchNotifications();
    }
  }, [pagination.page, activeType, fetchNotifications, user]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    pagination,
    activeType,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    filterByType,
    changePage,
    // Yeniden bağlantı için
    refreshNotifications: () => fetchNotifications({ force: true })
  };
} 
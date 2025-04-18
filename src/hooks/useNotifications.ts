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
let lastApiReset = Date.now();

// API çağrı sayacı sıfırlama (30 dakikada bir)
setInterval(() => {
  apiCallCounter = 0;
  issuedApiWarning = false;
  lastApiReset = Date.now();
}, 30 * 60 * 1000);

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
  // İşlem devam ediyor mu?
  const isFetchingRef = useRef<boolean>(false);
  // Debounce için zamanlayıcı
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // İlk yüklemeyi takip et
  const initialLoadDoneRef = useRef<boolean>(false);
  // Polling interval referansı
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    
    // Zamanlayıcı kur - 5 saniye bekle
    debounceTimerRef.current = setTimeout(() => {
      fetchNotifications(options);
      debounceTimerRef.current = null;
    }, 5000);
  }, []);

  // Bildirimleri getir
  const fetchNotifications = useCallback(async (options?: { 
    page?: number, 
    limit?: number, 
    unreadOnly?: boolean,
    type?: string,
    force?: boolean
  }) => {
    // Zaten bir istek yapılıyorsa işlemi durdur
    if (isFetchingRef.current) {
      console.log('Zaten bildirimler yükleniyor, istek atlanıyor');
      return;
    }
    
    // İşlemin başladığını işaretle
    isFetchingRef.current = true;
    
    // API çağrısı sayacını kontrol et ve sıfırla
    const now = Date.now();
    if (now - lastApiReset > 30 * 60 * 1000) {
      apiCallCounter = 0;
      issuedApiWarning = false;
      lastApiReset = now;
    }
    
    // Kullanıcı giriş yapmamışsa ve mock data yoksa boş array döndür
    if (!session && !options?.force) {
      console.log('Kullanıcı giriş yapmadı, test bildirimleri getiriliyor');
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      isFetchingRef.current = false;
      initialLoadDoneRef.current = true;
      return;
    }
    
    // Zaten yüklenmiş ise ve force değilse yeni istek yapma
    if (initialLoadDoneRef.current && !options?.force && notifications.length > 0) {
      console.log('Bildirimler zaten yüklendi, tekrar çağrılmıyor');
      isFetchingRef.current = false;
      return;
    }
    
    // API çağrısı sınırlama - sayacı artır
    apiCallCounter++;
    
    // En fazla 15 istek yapılabilir (5'ten artırıldı)
    if (apiCallCounter > 15 && !issuedApiWarning) {
      console.warn(`⚠️ Çok fazla API çağrısı yapıldı: ${apiCallCounter}`);
      issuedApiWarning = true;
      
      // Çok fazla istek varsa bir süre engelle
      if (apiCallCounter > 30 && !options?.force) {
        console.log('Çok fazla istek yapıldı, API istekleri geçici olarak engellendi');
        isFetchingRef.current = false;
        return;
      }
    }
    
    // Çok sık yenileme yapılmasını engelle - 3 dakikaya yükseltildi
    if (!options?.force && now - lastFetchRef.current < 3 * 60 * 1000) {
      console.log('Çok sık bildirim sorgulaması engellendi');
      isFetchingRef.current = false;
      return;
    }
    
    // Yükleme durumunu güncelle
    setLoading(true);
    setError(null);
    lastFetchRef.current = now;
    
    try {
      const page = options?.page || pagination.page;
      const limit = options?.limit || pagination.limit;
      const unreadOnly = options?.unreadOnly || false;
      // Bildirim türü filtresini ekle
      const type = options?.type !== undefined ? options.type : activeType;
      
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
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 saniye timeout (artırıldı)
      
      try {
        const response = await fetch(`/api/notifications?${queryParams.toString()}`, {
          signal: controller.signal,
          // Hata ayıklama için kredensiyelleri ekleyelim
          credentials: 'include'
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          // 401 hatası gelirse kullanıcı giriş yapmamış demektir, sessiz şekilde geç
          if (response.status === 401) {
            console.log('Kullanıcı oturumu yok veya süresi dolmuş');
            setNotifications([]);
            setUnreadCount(0);
            return;
          }
          
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
          console.log('Bildirimler yüklenirken zaman aşımı oluştu');
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
      isFetchingRef.current = false; // İşlemin bittiğini işaretle
    }
  }, [session, pagination.page, pagination.limit, activeType, notifications.length]);

  // Bildirimi okundu olarak işaretle
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!session) return false;
    
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
  }, [session]);

  // Tüm bildirimleri okundu olarak işaretle
  const markAllAsRead = useCallback(async () => {
    if (!session) return false;
    
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
  }, [session]);

  // Bildirimi sil
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!session) return false;
    
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
  }, [session, notifications]);

  // Toplu silme işlevi ekle
  const deleteAllNotifications = useCallback(async (type?: string) => {
    if (!session) return false;
    
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
  }, [session, notifications]);

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

  // WebSocket bağlantısını başlat veya poling mekanizmasını başlat
  const startNotificationListener = useCallback(() => {
    // Zaten polling interval çalışıyorsa kapat
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    // WebSocket dinleme
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
      
      return () => {
        socket.off('notification');
        socket.off('refresh_notifications');
      };
    } else {
      console.log("WebSocket kullanılamıyor, polling mekanizması devrede");
      
      // Polling mekanizmasını başlat (5 dakikada bir kontrol - artırıldı)
      pollingIntervalRef.current = setInterval(() => {
        console.log("Polling bildirim kontrolü yapılıyor");
        if (!isFetchingRef.current) {
          fetchNotifications({ force: true });
        }
      }, 5 * 60 * 1000);
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [socket, isConnected, fetchNotifications]);

  // İlk yükleme ve bildirim dinleyicileri
  useEffect(() => {
    if (!session) {
      // Session yokken bile UI'ı boş bir liste ile hazır hale getirelim
      if (!initialLoadDoneRef.current) {
        setNotifications([]);
        setUnreadCount(0);
        initialLoadDoneRef.current = true;
      }
      return;
    }
    
    // Zaten yüklenmiş mi kontrol et
    if (initialLoadDoneRef.current && notifications.length > 0) {
      console.log("Bildirimler zaten yüklendi, tekrar çağrılmıyor");
      return;
    }
    
    // İlk yükleme
    console.log("İlk yükleme bildirimleri getiriliyor");
    fetchNotifications({ force: true });
    
    // WebSocket veya polling başlat
    const cleanup = startNotificationListener();
    
    // Temizleme fonksiyonu
    return () => {
      if (cleanup) cleanup();
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [session, fetchNotifications, startNotificationListener, notifications.length]);

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
    refreshNotifications: () => fetchNotifications({ force: true })
  };
} 
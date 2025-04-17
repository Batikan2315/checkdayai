"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { getUserByEmail } from "@/lib/actions";
import { IUser } from "@/lib/types";
import { 
  signIn, 
  signOut, 
  useSession, 
  getSession 
} from "next-auth/react";
import axios from "axios";

// Önbellek sabitleri - azaltılmış süreler
const USER_CACHE_KEY = 'user_cache';
// 15 dakika -> 5 dakika
const SESSION_CACHE_TTL = 5 * 60 * 1000; // 5 dakika
const API_REQUEST_THROTTLE = 5000; // 5 saniye

// Kullanıcı verilerinden gereksiz alanları çıkarmak için
const sanitizeUserData = (userData: any) => {
  if (!userData) return null;
  
  // Saklanacak alanlar
  const fieldsToKeep = [
    '_id', 
    'email', 
    'username', 
    'firstName', 
    'lastName',
    'isAdmin',
    'verified'
  ];
  
  // Sadece gerekli alanları sakla
  const sanitized: any = {};
  fieldsToKeep.forEach(field => {
    if (userData[field] !== undefined) {
      sanitized[field] = userData[field];
    }
  });
  
  return sanitized;
};

interface AuthContextType {
  user: IUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: {
    email: string;
    password: string;
    username: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  refreshUserData: (force?: boolean) => Promise<any>;
  loginWithGoogle: () => Promise<boolean>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message: string; code?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  
  // API istek sayacı ve zamanlayıcı
  const apiRequestCount = useRef(0);
  const lastApiRequestTime = useRef(0);
  
  // NextAuth session
  const { data: session, status } = useSession();

  // Kullanıcı bilgilerini yenile - ÖNEMLİ OPTİMİZASYONLAR YAPILDI
  const refreshUserData = useCallback(async (force = false) => {
    try {
      // Önbellekleme ve hız sınırlaması için yapılan optimizasyonlar
      const now = Date.now();
      
      // Çok fazla API isteği yapılıyorsa, API Rate Limit'e takılmamak için sınırla
      apiRequestCount.current++;
      if (apiRequestCount.current > 20 && now - lastApiRequestTime.current < 60000) {
        // 1 dakikada 20'den fazla istek yapıldıysa mevcut kullanıcıyı dön
        return user;
      }
      
      // Son istek zamanını güncelle
      lastApiRequestTime.current = now;
      
      // API isteği sayacını belirli aralıklarla sıfırla
      setTimeout(() => {
        apiRequestCount.current = 0;
      }, 60000);
      
      // API hız sınırlaması
      const lastRefreshTime = localStorage.getItem('lastRefreshTime');
      if (!force && lastRefreshTime && now - parseInt(lastRefreshTime) < API_REQUEST_THROTTLE) {
        // Son istekten beri 5 saniyeden az zaman geçtiyse istek engelleniyor
        return user;
      }
      
      // İstek zamanını kaydet - her API isteği için sadece bir kez
      localStorage.setItem('lastRefreshTime', now.toString());
      
      const sessionResult = await getSession();
      
      // Session yoksa null dön
      if (!sessionResult) {
        setUser(null);
        setLoading(false);
        return null;
      }
      
      const response = await fetch("/api/auth/me");
      
      if (!response.ok) {
        throw new Error("Kullanıcı bilgileri alınamadı");
      }
      
      const userData = await response.json();
      
      if (userData && userData.authenticated) {
        // Kullanıcı verilerini güncelle
        setUser(userData);
        
        // Kullanıcı verilerini localStorage'a kaydet - Sadece önemli değişiklikler varsa
        const shouldUpdateCache = !user || 
          user.username !== userData.username || 
          user.firstName !== userData.firstName || 
          user.balance !== userData.balance;
        
        if (shouldUpdateCache) {
          localStorage.setItem(USER_CACHE_KEY, JSON.stringify(userData));
        }
      } else {
        // Kullanıcı verisi yoksa, oturumu sonlandır
        setUser(null);
      }
      
      return userData;
    } catch (error) {
      console.error("Kullanıcı bilgileri yenilenirken hata:", error);
      // Mevcut kullanıcıyı döndür
      return user;
    } finally {
      setLoading(false);
    }
  }, [user, getSession]);

  // Auth durumunu kontrol et
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      
      // NextAuth session kontrolü - en güvenilir yöntem
      if (status === "authenticated" && session?.user) {
        // API'den detaylı kullanıcı verisini al
        const userData = await refreshUserData();
        setLoading(false);
        return !!userData;
      }
      
      // Giriş yapmamış
          setUser(null);
      setLoading(false);
      return false;
    } catch (error) {
      setUser(null);
      setLoading(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshUserData, session, status]);

  // Giriş yap
  const login = async (email: string, password: string) => {
    setLoading(true);
    
    try {
      // API çağrısı
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Kullanıcı bilgilerini al ve güncelle
        await refreshUserData(true);
        toast.success("Giriş başarılı");
          return true;
      } else {
        toast.error(data.message || "Giriş başarısız");
        return false;
      }
    } catch (error) {
      toast.error("Giriş sırasında bir hata oluştu");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Kayıt ol
  const register = async (userData: {
    email: string;
    password: string;
    username: string;
    firstName?: string;
    lastName?: string;
  }) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Kayıt başarılı! E-posta adresinizi doğrulayın.");
        return true;
      } else {
        toast.error(data.message || "Kayıt başarısız");
        return false;
      }
    } catch (error) {
      toast.error("Kayıt sırasında bir hata oluştu");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Çıkış yap
  const logout = () => {
    // Tüm önbellekleri ve depoları temizle
    localStorage.removeItem(USER_CACHE_KEY);
    localStorage.removeItem('lastRefreshTime');
    
    // API istek sayacını sıfırla
    apiRequestCount.current = 0;
    
    // Oturum gereksiz verileri temizle
    sessionStorage.clear();
    
    // NextAuth oturumunu kapat
    signOut({ callbackUrl: '/' });
  };

  // Google ile giriş
  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      await signIn('google', { 
        callbackUrl: '/',
        redirect: true
      });
      // signIn sonrası otomatik yönlendirme olduğundan burada özel bir şey yapmamıza gerek yok
      return true;
    } catch (error) {
      console.error('Google girişi hatası:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Şifre sıfırlama
  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const response = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      
      const data = await response.json();
        return { 
        success: response.ok, 
        message: data.message,
          code: data.code 
        };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.message || "Bir hata oluştu" 
      };
    }
  };

  // Şifre sıfırlama isteği
  const requestPasswordReset = async (email: string) => {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
        return { 
        success: response.ok, 
        message: data.message 
        };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.message || "Bir hata oluştu" 
      };
    }
  };
  
  // Uygulama yüklendikten sonra oturum kontrolü
  useEffect(() => {
    const handleSessionChange = async () => {
      if (status === "authenticated" && session) {
        // Session varsa kullanıcı bilgilerini getir
        try {
          await refreshUserData(true);
          // Google ile ilgili ek log mesajını kaldır
          const provider = session?.user?.provider || '';
          if (provider === 'google') {
            // Google ile giriş yapan kullanıcı için ek işlemler
            // console.log('Google ile giriş yapıldı'); - Gereksiz log kaldırıldı
          }
        } catch (error) {
          console.error('Kullanıcı bilgileri alınırken hata:', error);
        }
      } else if (status === "unauthenticated") {
        // Session yoksa kullanıcıyı temizle
        setUser(null);
        localStorage.removeItem(USER_CACHE_KEY);
      }
      
      // İlk yüklemeyi tamamla
      setLoading(false);
      setIsInitialized(true);
    };
    
    if (status !== "loading") {
      handleSessionChange();
    }
  }, [session, status, refreshUserData]);
  
  // Kullanıcı verilerinin güncelliğini korumak için periyodik kontrol
  useEffect(() => {
    // Oturum sadece aktif kullanıcılar için otomatik yenilensin
    if (!user || !user._id) {
      return;
    }
    
    // 15 dakikada bir kullanıcı verilerini yenile (Daha seyrek API çağrısı yapalım)
    const interval = setInterval(() => {
      refreshUserData();
    }, 15 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user, refreshUserData]);

  // Kullanıcının oturum durumuna göre API isteklerinin yönetimini kontrol eder
  const checkAuthBeforeApiCall = (url: string): boolean => {
    // Eğer kullanıcı giriş yapmadıysa ve yetki gerektiren bir istek yapılıyorsa
    if (!session && !loading) {
      const authRequiredEndpoints = [
        '/api/notifications',
        '/api/plans/',
        '/api/user/',
        '/api/users/'
      ];
      
      // Giriş gerektirmeyen istisna durumlar
      const publicEndpoints = [
        '/api/plans?public=true',
        '/api/auth/'
      ];
      
      // İstisna durumlar kontrolü
      if (publicEndpoints.some(endpoint => url.includes(endpoint))) {
        return true;
      }
      
      // Yetki gerektiren endpoint kontrolü
      if (authRequiredEndpoints.some(endpoint => url.includes(endpoint))) {
        // console.log('Kullanıcı giriş yapmadı, API isteği engelleniyor'); - Gereksiz log kaldırıldı
        return false;
      }
    }
    
    return true;
  };

  // Original fetch fonksiyonunu kaydet
  const originalFetch = global.fetch;

  // Fetch fonksiyonunu override et
  global.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = url.toString();
    
    // API isteği değilse normal işleme devam et
    if (!urlStr.includes('/api/')) {
      return originalFetch(url, init);
    }
    
    // Oturum kontrolü yap
    if (!checkAuthBeforeApiCall(urlStr)) {
      if (status === "authenticated" && session) {
        // Eğer NextAuth session var ama user verisi yoksa, kullanıcı verilerini yenile
        try {
          // console.log("Oturum var ama user verisi yok, yenileniyor..."); - Gereksiz log kaldırıldı
          await refreshUserData(true);
          // Tekrar dene
          return originalFetch(url, init);
        } catch (e) {
          // Yine de başarısız olursa, hata döndür
          console.error("Oturum bilgileri yenilenemedi:", e);
          return Promise.reject(new Error('Oturum bilgileri yenilenemiyor. Lütfen tekrar giriş yapın.'));
        }
      } else {
        // API isteğini engelle ve hata döndür
        // console.log("API isteği engellendi - kullanıcı giriş yapmamış"); - Gereksiz log kaldırıldı
        return Promise.reject(new Error('Oturum açmanız gerekiyor'));
      }
    }
    
    // İsteği yap
    return originalFetch(url, init);
  };

  // Context değeri
  const contextValue = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    checkAuth,
    refreshUserData,
    loginWithGoogle,
    resetPassword,
    requestPasswordReset
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}; 
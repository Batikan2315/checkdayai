"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
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
  refreshUserData: () => Promise<void>;
  loginWithGoogle: (email: string, password: string) => Promise<boolean>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message: string; code?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Önbellek anahtarları ve zaman sabitleri
const SESSION_CACHE_KEY = 'session_cache';
const USER_CACHE_KEY = 'user_cache';
const SESSION_CACHE_TTL = 5 * 60 * 1000; // 5 dakika (ms)
const API_REQUEST_THROTTLE = 2000; // 2 saniye (ms)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false); // İlk yükleme tamamlandı mı?
  const router = useRouter();
  
  // NextAuth session
  const { data: session, status } = useSession();

  // Önbellekten veri al
  const getFromCache = useCallback((key: string) => {
    if (typeof window === 'undefined') return null;
    
    try {
      const cachedData = localStorage.getItem(key);
      if (!cachedData) return null;
      
      const { data, expires } = JSON.parse(cachedData);
      if (Date.now() > expires) {
        localStorage.removeItem(key);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error(`Önbellek okuma hatası (${key}):`, error);
      return null;
    }
  }, []);

  // Önbelleğe veri kaydet
  const saveToCache = useCallback((key: string, data: any, ttl: number = SESSION_CACHE_TTL) => {
    if (typeof window === 'undefined') return;
    
    try {
      const cacheItem = {
        data,
        expires: Date.now() + ttl
      };
      localStorage.setItem(key, JSON.stringify(cacheItem));
    } catch (error) {
      console.error(`Önbellek yazma hatası (${key}):`, error);
    }
  }, []);

  // Kullanıcı bilgilerini yenile
  const refreshUserData = useCallback(async (force = false) => {
    try {
      // Son istekten bu yana 2 saniye geçmemişse ve force parametresi true değilse erken çık
      const now = Date.now();
      const lastRefreshTime = localStorage.getItem('lastRefreshTime');
      if (!force && lastRefreshTime && now - parseInt(lastRefreshTime) < API_REQUEST_THROTTLE) {
        console.log('Çok sık API isteği engellendi');
        
        // Önbellekteki kullanıcı verilerini kontrol et
        const cachedUser = getFromCache(USER_CACHE_KEY);
        if (cachedUser) {
          console.log('Önbellekten kullanıcı verileri kullanılıyor');
          // Eğer state değişecekse set edelim, aynı ise gerek yok
          if (JSON.stringify(user) !== JSON.stringify(cachedUser)) {
            setUser(cachedUser);
          }
          return cachedUser;
        }
        
        return user; // Mevcut kullanıcı verisini dön
      }
      
      // İstek zamanını kaydet
      localStorage.setItem('lastRefreshTime', now.toString());
      
      // Önce önbellekteki kullanıcı bilgilerine bak
      const cachedUser = getFromCache(USER_CACHE_KEY);
      if (cachedUser && !force) {
        console.log('Önbellekten kullanıcı verileri kullanılıyor');
        // Eğer state değişecekse set edelim, aynı ise gerek yok
        if (JSON.stringify(user) !== JSON.stringify(cachedUser)) {
          setUser(cachedUser);
        }
        return cachedUser;
      }
      
      // API'den güncel kullanıcı bilgilerini al
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Random-Cache-Bust': Math.random().toString() // Önbelleği atlatmak için rastgele değer
        }
      });
      
      // Artık response içeriğini kontrol ediyoruz
      const userData = await response.json();
      console.log('Güncel kullanıcı verileri:', userData);
      
      // Proxyden kaçınmak ve tüm resim URL'lerine timestamp eklemek için
      if (userData.authenticated && userData.profilePicture) {
        userData.profilePicture = `${userData.profilePicture}?t=${new Date().getTime()}`;
      }
      
      // Kullanıcı kimlik doğrulaması yapıldı mı?
      if (userData.authenticated) {
        // Eğer oturum açma yöntemlerinde çakışma yoksa
        if (userData.provider && userData.provider.includes(',')) {
          console.log('Kullanıcı birden fazla giriş yöntemi kullanabilir:', userData.provider);
        }
        
        // Kullanıcı verilerini önbelleğe al
        saveToCache(USER_CACHE_KEY, userData);
        
        // Kullanıcı giriş yapmış, verileri güncelle (değişiklik varsa)
        if (JSON.stringify(user) !== JSON.stringify(userData)) {
          setUser(userData);
        }
        return userData;
      } else {
        // Kullanıcı giriş yapmamış, null yap (değişiklik varsa)
        if (user !== null) {
          setUser(null);
        }
        if (userData.error) {
          setError(userData.error);
        }
        return null;
      }
    } catch (error: any) {
      console.error('Kullanıcı bilgileri yenileme hatası:', error);
      setError(error.message);
      // Değişiklik varsa state'i güncelle
      if (user !== null) {
        setUser(null);
      }
      return null;
    }
  }, [user, getFromCache, saveToCache]);

  // Auth context'i başlat
  const initAuth = async () => {
    try {
      setLoading(true);
      
      const sessionData = await getSession();
      
      if (!sessionData && typeof window !== "undefined" && localStorage.getItem("token")) {
        console.log("Session yok ama token var, temizleniyor");
        localStorage.removeItem("token");
        localStorage.removeItem("authInfo");
        setUser(null);
        setLoading(false);
        return;
      }
      
      if (sessionData) {
        console.log("Session bulundu:", sessionData);
        setUser({
          id: sessionData.user.id,
          email: sessionData.user.email || "",
          username: (sessionData.user as any).username || sessionData.user.name || "",
          firstName: (sessionData.user as any).firstName || "",
          lastName: (sessionData.user as any).lastName || "",
          profilePicture: (sessionData.user as any).profilePicture || sessionData.user.image || "",
          role: sessionData.user.role || "user",
          balance: (sessionData.user as any).balance || 0,
          provider: (sessionData.user as any).provider || ""
        });
        
        if ((sessionData.user as any).provider === "google") {
          console.log("Google ile giriş yapılmış, token verileri güncelleniyor");
          
          // Google kullanıcıları için token oluşturma
          if (typeof window !== "undefined") {
            localStorage.setItem("token", "google-auth");
            localStorage.setItem("authInfo", JSON.stringify({
              id: sessionData.user.id,
              provider: "google"
            }));
          }
        }
        
        setLoading(false);
        return;
      }
      
      // localStorage'dan token kontrolü
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) {
          try {
            // Token'ı kontrol et
            const response = await fetch("/api/auth/me", {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              }
            });
            
            if (response.ok) {
              const userData = await response.json();
              if (userData.authenticated) {
                console.log("localStorage'dan token ile kullanıcı doğrulandı:", userData);
                setUser(userData);
                saveToCache(USER_CACHE_KEY, userData);
              } else {
                console.log("Token geçerli değil, temizleniyor");
                localStorage.removeItem("token");
                localStorage.removeItem("authInfo");
                setUser(null);
              }
            } else {
              console.log("Token doğrulama hatası, temizleniyor");
              localStorage.removeItem("token");
              localStorage.removeItem("authInfo");
              setUser(null);
            }
          } catch (error) {
            console.error("Token doğrulama hatası:", error);
            localStorage.removeItem("token");
            localStorage.removeItem("authInfo");
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      
      setLoading(false);
      setIsInitialized(true);
    } catch (error) {
      console.error("AuthContext initleme hatası:", error);
      setLoading(false);
      setIsInitialized(true);
    }
  };

  useEffect(() => {
    // İlklendirme tamamlandıysa tekrar çalışma
    if (isInitialized) return;
    
    // Auth başlatma
    initAuth();
    
    // Session değişikliklerinde güncelleme yap
    const handleSessionChange = async () => {
      await initAuth();
    };
    
    // Event listener ekle
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleSessionChange);
    }
    
    // Cleanup
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleSessionChange);
      }
    };
  }, [isInitialized]);
  
  // Session değiştiğinde otomatik güncelle
  useEffect(() => {
    if (status === "authenticated" && session) {
      console.log("Session değişti, kullanıcı bilgileri güncelleniyor:", session);
      
      setUser({
        id: session.user.id,
        email: session.user.email || "",
        username: (session.user as any).username || session.user.name || "",
        firstName: (session.user as any).firstName || "",
        lastName: (session.user as any).lastName || "",
        profilePicture: (session.user as any).profilePicture || session.user.image || "",
        role: session.user.role || "user",
        balance: (session.user as any).balance || 0,
        provider: (session.user as any).provider || ""
      });
      
      // Google kullanıcıları için token oluştur
      if ((session.user as any).provider === "google") {
        if (typeof window !== "undefined") {
          localStorage.setItem("token", "google-auth");
          localStorage.setItem("authInfo", JSON.stringify({
            id: session.user.id,
            provider: "google"
          }));
        }
      }
    } else if (status === "unauthenticated") {
      console.log("Session sona erdi, kullanıcı çıkış yapıldı");
      // Token ve kullanıcı verilerini temizle
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("authInfo");
      }
      setUser(null);
    }
  }, [session, status]);

  // Session kontrolü için ayrı bir fonksiyon
  const checkSession = async () => {
    try {
      // İlk olarak session kontrolü yap
      const sessionData = await getSession();
      
      // Session'ı önbelleğe kaydet
      if (sessionData) {
        saveToCache(SESSION_CACHE_KEY, sessionData);
      }
      
      // Session yoksa ve localStorage'da token varsa temizle
      if (!sessionData && typeof window !== "undefined" && localStorage.getItem("token")) {
        console.log("Session yok ama token var, temizleniyor");
        localStorage.removeItem("token");
        localStorage.removeItem("authInfo");
        setUser(null);
        setLoading(false);
        return;
      }
      
      const userData = await refreshUserData();
      
      // Admin kullanıcı e-postası için özel kontrol
      // Bilinen admin kullanıcıları için rolü manuel olarak ayarla
      if (userData && userData.email === "batikan@checkday.org") {
        console.log("Admin e-postası tespit edildi, admin rolü atanıyor");
        
        const adminData = {
          ...userData,
          role: "admin"
        };
        
        // State'i sadece değişiklik varsa güncelle
        if (JSON.stringify(user) !== JSON.stringify(adminData)) {
          setUser(adminData);
        }
        
        // Güncellenmiş kullanıcı bilgilerini önbelleğe al
        saveToCache(USER_CACHE_KEY, adminData);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Session kontrol hatası:", error);
      setLoading(false);
    }
  };

  // Auth durumunu kontrol et (dışarıdan çağrılan method)
  const checkAuth = async () => {
    try {
      setLoading(true);
      
      // NextAuth session kontrolü
      if (status === "authenticated" && session?.user) {
        // Kullanıcı bilgilerini API'den al
        const userData = await refreshUserData();
        if (userData) {
          return true;
        }
      }
      
      // Tarayıcıda çalışıyorsa localStorage kontrolü yap (eski yöntem)
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (!token) {
          console.log("Token bulunamadı");
          setUser(null);
          setLoading(false);
          return false;
        }

        console.log("Token bulundu, kullanıcı bilgilerini yeniliyorum...");
        // Kullanıcı bilgilerini doğrudan API'den al
        const userData = await refreshUserData();
        
        if (userData) {
          return true;
        } else {
          console.error("Kullanıcı bilgileri alınamadı");
          localStorage.removeItem("token");
          setUser(null);
          return false;
        }
      }
      
      setLoading(false);
      return false;
    } catch (error) {
      console.error("Kimlik doğrulama hatası:", error);
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
      }
      setUser(null);
      setLoading(false);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    
    // Önbelleği temizle
    localStorage.removeItem(SESSION_CACHE_KEY);
    localStorage.removeItem(USER_CACHE_KEY);
    
    try {
      // Email/şifre ile giriş
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        try {
          // Mevcut kullanıcı bilgilerini al
          const userResponse = await fetch('/api/auth/me');
          
          if (!userResponse.ok) {
            console.error("Kullanıcı bilgileri alınamadı - Durum kodu:", userResponse.status);
            throw new Error("Kullanıcı bilgileri alınamadı. Durum: " + userResponse.status);
          }
          
          const userData = await userResponse.json();
          setUser(userData);
          localStorage.setItem('authInfo', JSON.stringify({ isLoggedIn: true }));
          toast.success("Giriş başarılı!");
          return true;
        } catch (userError) {
          console.error("Kullanıcı bilgileri alma hatası:", userError);
          toast.error("Giriş yapıldı ancak kullanıcı bilgileri alınamadı. Lütfen sayfayı yenileyin.");
          return false;
        }
      } else {
        // Hata kodlarına göre farklı mesajlar göster
        if (data.code === "EMAIL_NOT_VERIFIED") {
          toast.error("E-posta adresiniz henüz doğrulanmamış. Lütfen e-postanızı kontrol edin veya yeni bir doğrulama e-postası gönderin.");
        } else if (data.code === "GOOGLE_USER_PASSWORD_LOGIN") {
          toast.error("Bu e-posta Google hesabıyla ilişkilendirilmiş. Lütfen Google ile giriş yapın.");
        } else if (data.code === "INVALID_CREDENTIALS") {
          toast.error("Girdiğiniz şifre hatalı veya bu e-posta ile kayıtlı hesap bulunamadı.");
        } else {
          toast.error(data.message || "Giriş başarısız!");
        }
        
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error("Giriş sırasında bir hata oluştu!");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    username: string;
    firstName?: string;
    lastName?: string;
  }) => {
    try {
      setLoading(true);
      console.log("Kayıt yapılıyor...", userData.email);
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      console.log("Kayıt API yanıtı:", response.status, data);

      if (response.ok) {
        toast.success("Kayıt başarılı! Lütfen e-posta adresinizi doğrulayın ve giriş yapın.");
        router.push("/login");
        return true;
      } else {
        toast.error(data.message || "Kayıt başarısız!");
        return false;
      }
    } catch (error) {
      console.error("Kayıt hatası:", error);
      toast.error("Kayıt sırasında bir hata oluştu!");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Önbelleği temizle
    localStorage.removeItem(SESSION_CACHE_KEY);
    localStorage.removeItem(USER_CACHE_KEY);
    
    // NextAuth çıkışı
    signOut({ redirect: false }).catch(console.error);
    
    // Eski yöntem çıkışı
    localStorage.removeItem("token");
    localStorage.removeItem("authInfo");
    setUser(null);
    
    // Tarayıcıyı çerezleri temizlemek için sayfayı yenileme çözümü
    window.location.href = "/login";
  };

  const loginWithGoogle = async (email: string, password: string) => {
    // Implementation of loginWithGoogle
    // This function should be implemented based on your specific requirements
    throw new Error("Function not implemented");
  };

  const resetPassword = async (token: string, newPassword: string) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        return { success: true, message: data.message || "Şifreniz başarıyla güncellendi" };
      } else {
        return { 
          success: false, 
          message: data.message || "Şifre sıfırlama başarısız oldu",
          code: data.code 
        };
      }
    } catch (error: any) {
      console.error('Şifre sıfırlama hatası:', error);
      return { 
        success: false, 
        message: error.message || "Şifre sıfırlama sırasında bir hata oluştu" 
      };
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async (email: string) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        return { success: true, message: data.message || "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi" };
      } else {
        return { 
          success: false, 
          message: data.message || "Şifre sıfırlama isteği başarısız oldu",
          code: data.code 
        };
      }
    } catch (error: any) {
      console.error('Şifre sıfırlama isteği hatası:', error);
      return { 
        success: false, 
        message: error.message || "Şifre sıfırlama isteği sırasında bir hata oluştu" 
      };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading: loading || status === "loading",
    error,
    login,
    register,
    logout,
    checkAuth,
    refreshUserData,
    loginWithGoogle,
    resetPassword,
    requestPasswordReset,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}; 
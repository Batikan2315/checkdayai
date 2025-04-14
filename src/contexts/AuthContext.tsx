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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // NextAuth session
  const { data: session, status } = useSession();

  // Kullanıcı bilgilerini yenile
  const refreshUserData = useCallback(async () => {
    try {
      setError(null);
      
      // Son istekten bu yana 2 saniye geçmemişse erken çık
      const now = Date.now();
      const lastRefreshTime = localStorage.getItem('lastRefreshTime');
      if (lastRefreshTime && now - parseInt(lastRefreshTime) < 2000) {
        console.log('Çok sık API isteği engellendi');
        return user; // Mevcut kullanıcı verisini dön
      }
      
      // İstek zamanını kaydet
      localStorage.setItem('lastRefreshTime', now.toString());
      
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
        
        // Kullanıcı giriş yapmış, verileri güncelle
        setUser(userData);
        return userData;
      } else {
        // Kullanıcı giriş yapmamış, null yap
        setUser(null);
        if (userData.error) {
          setError(userData.error);
        }
        return null;
      }
    } catch (error: any) {
      console.error('Kullanıcı bilgileri yenileme hatası:', error);
      setError(error.message);
      setUser(null);
      return null;
    }
  }, [user]);

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      await refreshUserData();
      setLoading(false);
    };
    
    initAuth();
  }, [refreshUserData]);

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
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";

interface User {
  _id: string;
  email: string;
  role: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  googleProfilePicture?: string;
}

export const useAuth = () => {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const fetchUserData = async () => {
    try {
      if (!session?.user?.email) {
        setUser(null);
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/auth/me`);
      
      if (!response.ok) {
        throw new Error(`Kullanıcı bilgileri alınamadı: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.authenticated) {
        setUser(data);
        
        // Admin rolünü belirle
        const isUserAdmin = data.role === "admin";
        setIsAdmin(isUserAdmin);
        
        // Eğer admin ise fakat profilde gösterilmiyorsa kontrol et
        if (isUserAdmin) {
          const adminCheckResponse = await fetch('/api/auth/check-admin');
          const adminData = await adminCheckResponse.json();
          
          if (!adminData.isAdmin && adminData.dbRole === "admin") {
            toast.error("Admin yetkiniz var ancak oturumunuz yenilenmeli. Lütfen çıkış yapıp tekrar giriş yapın.");
          }
        }
      }
    } catch (err) {
      console.error("Kullanıcı bilgileri alınırken hata:", err);
      setError(err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    
    if (status === "authenticated") {
      fetchUserData();
    } else {
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
    }
  }, [status, session]);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin
  };
}; 
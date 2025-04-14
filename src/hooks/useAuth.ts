"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface User {
  _id: string;
  email: string;
  name: string;
  surname: string;
  role: string;
  profileImage?: string;
}

export const useAuth = () => {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
      setUser(data.user);
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
      setLoading(false);
    }
  }, [status, session]);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin"
  };
}; 
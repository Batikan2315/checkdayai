"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  // Session durumunu ve admin kontrolünü yönet
  useEffect(() => {
    async function checkAdminStatus() {
      try {
        // Oturum yoksa login sayfasına yönlendir
        if (status === "unauthenticated") {
          router.push('/login?callbackUrl=/admin');
          return;
        }
        
        // Oturum yükleniyor ise bekle
        if (status === "loading") {
          return;
        }
        
        // MongoDB'deki gerçek rol bilgisini al
        const response = await fetch('/api/auth/check-admin', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        
        if (!response.ok) {
          throw new Error("Admin kontrolü yapılamadı");
        }
        
        const data = await response.json();
        
        // Admin yetkisi yok ise ana sayfaya yönlendir
        if (!data.isAdmin) {
          router.push('/');
          return;
        }
        
        // Admin yetkisi varsa sayfayı göster
        setIsAdmin(true);
        setLoading(false);
      } catch (error) {
        // Hata durumunda, kullanıcıyı giriş sayfasına yönlendir
        router.push('/login?callbackUrl=/admin');
      } finally {
        setLoading(false);
      }
    }

    // Oturum durumuna göre admin kontrolü başlat
    checkAdminStatus();
  }, [status, router]);

  // Yükleniyor ise loading göster
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 dark:text-gray-400">Yükleniyor...</p>
      </div>
    );
  }

  // Admin değilse hiçbir şey gösterme (router.push ile yönlendirme yapıldı)
  if (!isAdmin) {
    return null;
  }

  // Admin ise children'ı render et
  return <>{children}</>;
} 
"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
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
  const pathname = usePathname();

  // Admin login sayfasındaysa doğrulama kontrolü yapma
  const isLoginPage = pathname === "/admin/login";
  
  console.log("Admin layout yüklendi", { 
    path: pathname, 
    isLoginPage, 
    sessionStatus: status, 
    hasSession: !!session
  });

  // Session durumunu ve admin kontrolünü yönet
  useEffect(() => {
    async function checkAdminStatus() {
      try {
        console.log("Admin kontrol başlıyor", { 
          isLoginPage, 
          status, 
          userEmail: session?.user?.email 
        });
        
        // Admin login sayfasındaysa kontrolleri atla
        if (isLoginPage) {
          setLoading(false);
          return;
        }
        
        // Oturum yoksa admin login sayfasına yönlendir
        if (status === "unauthenticated") {
          console.log("Oturum yok, login sayfasına yönlendiriliyor");
          router.push('/admin/login');
          return;
        }
        
        // Oturum yükleniyor ise bekle
        if (status === "loading") {
          console.log("Oturum yükleniyor, bekleniyor");
          return;
        }
        
        console.log("Admin API'si çağrılıyor", { 
          email: session?.user?.email,
          role: (session?.user as any)?.role 
        });
        
        // MongoDB'deki gerçek rol bilgisini al
        const response = await fetch('/api/auth/check-admin', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        
        console.log("Admin API yanıtı", { 
          status: response.status, 
          ok: response.ok 
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Admin API hatası:", errorData);
          throw new Error("Admin kontrolü yapılamadı: " + (errorData.error || "Bilinmeyen hata"));
        }
        
        const data = await response.json();
        console.log("Admin kontrolü sonucu:", data);
        
        // Admin yetkisi yok ise login sayfasına yönlendir
        if (!data.isAdmin) {
          console.log("Admin yetkisi yok, login sayfasına yönlendiriliyor");
          toast.error("Bu sayfaya erişmek için admin yetkisi gerekiyor");
          router.push('/admin/login');
          return;
        }
        
        // Admin yetkisi varsa sayfayı göster
        console.log("Admin yetkisi var, sayfa gösteriliyor");
        setIsAdmin(true);
        setLoading(false);
      } catch (error) {
        // Hata durumunda, kullanıcıyı admin giriş sayfasına yönlendir
        console.error("Admin kontrol hatası:", error);
        toast.error("Admin kontrolünde bir hata oluştu");
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    }

    // Oturum durumuna göre admin kontrolü başlat
    checkAdminStatus();
  }, [status, router, isLoginPage, session]);

  // Yükleniyor ise loading göster
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Admin login sayfasındaysa veya admin ise children'ı render et
  if (isLoginPage || isAdmin) {
    return <>{children}</>;
  }

  // Hiçbir durum karşılanmazsa hiçbir şey gösterme
  return null;
} 
"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ClientSocketHandler from "@/components/ClientSocketHandler";

export default function ClientComponent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Sayfa yüklendiğinde çalışacak
    if (!loading) {
      const isAuthRoute = pathname === '/profile' || pathname === '/profile/settings';
      
      // Eğer kimlik doğrulama gerektiren bir sayfada ve kullanıcı giriş yapmamışsa
      if (isAuthRoute && !user) {
        console.log('Oturum açılmamış, ana sayfaya yönlendiriliyor');
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);

  useEffect(() => {
    // Sayfa yüklendikten sonra sağ tıklama ve F12 tuşunu devre dışı bırak
    function blockContextMenu(e: any) {
      e.preventDefault();
    }
    
    function blockF12(e: any) {
      if (e.keyCode === 123) {
        e.preventDefault();
      }
    }
    
    // Etkinlikleri ekle
    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", blockF12);
    
    // İzleme kodu
    const trackPageView = () => {
      if (window.location.hostname === 'localhost') return;
      
      const url = window.location.href;
      console.log(`Page view: ${url}`);
      
      // İstatistik gönderme 
      try {
        // Yerel API yerine, tam URL kullanarak gönder
        fetch(`${window.location.origin}/api/analytics/pageview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, path: pathname })
        }).catch(err => {
          // Sessizce hatayı yoksay, kullanıcı deneyimini etkilemesin
          console.log("Analitik gönderimi başarısız oldu, devam ediliyor");
        });
      } catch (error) {
        console.error("Analitik verisi gönderilemedi", error);
      }
    };
    
    // Sayfa yüklendiğinde izle
    trackPageView();
    
    // Temizleme
    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockF12);
    };
  }, [pathname]);

  return <ClientSocketHandler />;
} 
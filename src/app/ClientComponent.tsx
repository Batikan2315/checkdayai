"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

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

  return null;
} 
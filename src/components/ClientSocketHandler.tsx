"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import dynamic from 'next/dynamic';

// Socket bileşenini tarayıcı tarafında dinamik olarak yükle
const DynamicSocketHandler = dynamic(
  () => import('./DynamicSocketHandler'),
  { 
    ssr: false, // Sunucu tarafında renderlanmamasını sağla
    loading: () => null 
  }
);

/**
 * Tüm uygulama için WebSocket bağlantısını yöneten bileşen
 * Bileşen, kullanıcının oturumu açıkken arkaplanda çalışır
 */
export default function ClientSocketHandler() {
  const { data: session, status } = useSession();
  const [isMounted, setIsMounted] = useState(false);
  
  // Bileşenin sadece istemci tarafında mount edilmesini sağla
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  if (!isMounted) {
    return null;
  }
  
  // Sadece oturum açıksa DynamicSocketHandler'ı göster
  if (status === 'authenticated' && session) {
    return <DynamicSocketHandler session={session} />;
  }
  
  return null;
} 
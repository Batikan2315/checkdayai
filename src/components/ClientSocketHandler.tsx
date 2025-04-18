"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import useSocket from '@/hooks/useSocket';
import useNotifications from '@/hooks/useNotifications';
import { toast } from 'react-hot-toast';

/**
 * Tüm uygulama için WebSocket bağlantısını yöneten bileşen
 * Bileşen, kullanıcının oturumu açıkken arkaplanda çalışır ve
 * socket bağlantısını ve bildirimleri yönetir.
 */
export default function ClientSocketHandler() {
  const { data: session, status } = useSession();
  const { 
    socket, 
    bağlantıDurumu, 
    bağlantıHatası, 
    yenidenBağlan, 
    başlat 
  } = useSocket(session);

  const { 
    bildirimleriGetir 
  } = useNotifications(socket, session);

  // Oturum durumu değiştiğinde socket bağlantısını yönet
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // Oturum açıksa socket bağlantısını başlat
      // Google ile giriş sonrası session bilgilerinin tam oluşmasını beklemek için geciktirelim
      const timer = setTimeout(() => {
        başlat();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [status, session, başlat]);

  // Bağlantı durumu değişikliklerini izle ve kullanıcıyı bilgilendir
  useEffect(() => {
    if (bağlantıDurumu === 'bağlandı') {
      // Bildirimleri getir
      bildirimleriGetir();
    } else if (bağlantıDurumu === 'hata' && bağlantıHatası) {
      // Hata durumunda kullanıcıya bilgi ver (sadece kritik hatalarda)
      if (!bağlantıHatası.includes('Yeniden bağlanılıyor')) {
        toast.error('Sunucu bağlantısında sorun var. Otomatik yeniden bağlanmayı deniyoruz.', {
          id: 'socket-error',
          duration: 4000,
        });
      }
    }
  }, [bağlantıDurumu, bağlantıHatası, bildirimleriGetir]);

  // Manuel yeniden bağlanma işlevi
  const manuelYenidenBağlan = () => {
    toast.loading('Sunucuya yeniden bağlanılıyor...', {
      id: 'reconnect-toast',
      duration: 3000,
    });
    yenidenBağlan();
  };

  // Bağlantı kopuksa ve kullanıcı girişi yapılmışsa yeniden bağlanma butonu göster
  if ((bağlantıDurumu === 'bağlantı kesildi' || bağlantıDurumu === 'hata') && 
      status === 'authenticated' && 
      session?.user) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={manuelYenidenBağlan}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Yeniden Bağlan</span>
        </button>
      </div>
    );
  }

  // Görünür bir şey render etme
  return null;
} 
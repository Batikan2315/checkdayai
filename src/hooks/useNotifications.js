"use client";

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';

export default function useNotifications() {
  const [bildirimler, setBildirimler] = useState([]);
  const [okunmamışSayısı, setOkunmamışSayısı] = useState(0);
  const [yükleniyor, setYükleniyor] = useState(false);
  const [hata, setHata] = useState(null);

  // Bildirimleri sunucudan alma
  const bildirimleriGetir = useCallback(async () => {
    // Tarayıcı tarafında olduğunu kontrol et
    if (typeof window === 'undefined') return;
    
    // Sadece oturum açık kullanıcılar için bildirimler alınır
    // Oturum kontrolü için localStorage token kontrolü yapalım
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('Bildirimler için oturum gerekli, istek yapılmıyor');
      return;
    }
    
    setYükleniyor(true);
    setHata(null);
    
    try {
      const response = await fetch('/api/notifications');
      
      if (!response.ok) {
        throw new Error(`Bildirimler alınamadı: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Veri kontrolü ve doğrulama
      if (Array.isArray(data)) {
        setBildirimler(data);
        const okunmamışlar = data.filter(bildirim => !bildirim.okundu).length;
        setOkunmamışSayısı(okunmamışlar);
      } else {
        console.log('Bildirim verisi dizi değil:', typeof data, data);
        // Boş dizi olarak kabul et, hata mesajı gösterme
        setBildirimler([]);
        setOkunmamışSayısı(0);
      }
    } catch (error) {
      console.error('Bildirimler alınamadı:', error);
      setHata(error.message);
      // Hata durumunda boş dizi kullan
      setBildirimler([]);
      setOkunmamışSayısı(0);
    } finally {
      setYükleniyor(false);
    }
  }, []);

  // Bildirimleri yenileyen fonksiyon - dışarıdan erişilebilir
  const refreshNotifications = useCallback(async () => {
    return bildirimleriGetir();
  }, [bildirimleriGetir]);

  // Bildirimi okundu olarak işaretleme
  const bildirimOkunduİşaretle = useCallback(async (bildirimId) => {
    if (!session?.user || !bildirimId) return;
    
    try {
      const response = await fetch(`/api/notifications/${bildirimId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ okundu: true }),
      });
      
      if (!response.ok) {
        throw new Error(`Bildirim güncellenemedi: ${response.status}`);
      }
      
      // Bildirimler listesini güncelle
      setBildirimler(öncekiBildirimler =>
        öncekiBildirimler.map(bildirim =>
          bildirim._id === bildirimId ? { ...bildirim, okundu: true } : bildirim
        )
      );
      
      // Okunmamış bildirim sayısını güncelle
      setOkunmamışSayısı(öncekiSayı => Math.max(0, öncekiSayı - 1));
    } catch (error) {
      console.error('Bildirim okundu işaretlenirken hata:', error);
      toast.error('Bildirim güncellenemedi');
    }
  }, [session]);

  // Tüm bildirimleri okundu olarak işaretleme
  const tümBildirimleriOkunduYap = useCallback(async () => {
    if (!session?.user || bildirimler.length === 0) return;
    
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Bildirimler güncellenemedi: ${response.status}`);
      }
      
      // Tüm bildirimleri okundu olarak işaretle
      setBildirimler(öncekiBildirimler =>
        öncekiBildirimler.map(bildirim => ({ ...bildirim, okundu: true }))
      );
      
      // Okunmamış sayısını sıfırla
      setOkunmamışSayısı(0);
    } catch (error) {
      console.error('Tüm bildirimler okundu yapılırken hata:', error);
      toast.error('Bildirimler güncellenemedi');
    }
  }, [session, bildirimler]);

  // Bildirimi silme
  const bildirimSil = useCallback(async (bildirimId) => {
    if (!session?.user || !bildirimId) return;
    
    try {
      const response = await fetch(`/api/notifications/${bildirimId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Bildirim silinemedi: ${response.status}`);
      }
      
      // Bildirim listesinden kaldır
      setBildirimler(öncekiBildirimler => 
        öncekiBildirimler.filter(bildirim => bildirim._id !== bildirimId)
      );
      
      // Okunmamış sayısını güncelle (eğer silinen bildirim okunmamışsa)
      const silinenBildirim = bildirimler.find(b => b._id === bildirimId);
      if (silinenBildirim && !silinenBildirim.okundu) {
        setOkunmamışSayısı(öncekiSayı => Math.max(0, öncekiSayı - 1));
      }
    } catch (error) {
      console.error('Bildirim silinirken hata:', error);
      toast.error('Bildirim silinemedi');
    }
  }, [session, bildirimler]);

  // Socket.IO üzerinden yeni bildirim dinleme
  useEffect(() => {
    if (!socket || !session?.user) return;
    
    // Sayfa yüklendiğinde bildirimleri al
    bildirimleriGetir();
    
    // Yeni bildirim geldiğinde
    const yeniBildirimHandler = (yeniBildirim) => {
      // Veri kontrolü yap
      if (!yeniBildirim || typeof yeniBildirim !== 'object' || !yeniBildirim._id) {
        console.log('Geçersiz bildirim formatı, işlem yapılmıyor:', yeniBildirim);
        return;
      }
      
      console.log('Yeni bildirim alındı:', yeniBildirim);
      
      // Bildirimi listeye ekle
      setBildirimler(öncekiBildirimler => {
        // Eğer bildirim zaten varsa tekrar ekleme
        const bildirimVarMı = öncekiBildirimler.some(b => b._id === yeniBildirim._id);
        if (bildirimVarMı) return öncekiBildirimler;
        
        // Yeni bildirimi başa ekle
        return [yeniBildirim, ...öncekiBildirimler];
      });
      
      // Okunmamış sayısını güncelle
      setOkunmamışSayısı(öncekiSayı => öncekiSayı + 1);
      
      // Bildirim göster
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} 
                        max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto 
                        flex ring-1 ring-black ring-opacity-5 p-2 border-l-4 border-blue-500`}>
          <div className="flex-1 w-0 p-2">
            <div className="flex items-start">
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {yeniBildirim.başlık || 'Yeni Bildirim'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {yeniBildirim.mesaj}
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-2 flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
            >
              Kapat
            </button>
          </div>
        </div>
      ), { duration: 5000 });
    };
    
    // Bildirim silindi olayını dinle
    const bildirimSilindiHandler = (silinen) => {
      if (!silinen || !silinen.bildirimId) return;
      
      // Bildirim listesinden kaldır
      setBildirimler(öncekiBildirimler => 
        öncekiBildirimler.filter(b => b._id !== silinen.bildirimId)
      );
      
      // Eğer okunmamış bir bildirim silindiyse, sayıyı güncelle
      const silinenBildirim = bildirimler.find(b => b._id === silinen.bildirimId);
      if (silinenBildirim && !silinenBildirim.okundu) {
        setOkunmamışSayısı(öncekiSayı => Math.max(0, öncekiSayı - 1));
      }
    };
    
    // Olay dinleyicilerini ekle
    socket.on('yeni-bildirim', yeniBildirimHandler);
    socket.on('bildirim-silindi', bildirimSilindiHandler);
    
    // Temizleme işlevi
    return () => {
      socket.off('yeni-bildirim', yeniBildirimHandler);
      socket.off('bildirim-silindi', bildirimSilindiHandler);
    };
  }, [socket, session, bildirimleriGetir, bildirimler]);
  
  // Bağlantı durumu değiştiğinde bildirimleri güncelle
  useEffect(() => {
    if (socket && socket.connected && session?.user) {
      bildirimleriGetir();
    }
  }, [socket, session, bildirimleriGetir]);

  return {
    bildirimler,
    okunmamışSayısı,
    yükleniyor,
    hata,
    bildirimleriGetir,
    bildirimOkunduİşaretle,
    tümBildirimleriOkunduYap,
    bildirimSil,
    refreshNotifications,
    
    // Tip filtreleme yardımcıları
    sistemBildirimleri: bildirimler.filter(b => b.tip === 'sistem'),
    planBildirimleri: bildirimler.filter(b => b.tip === 'plan'),
    mesajBildirimleri: bildirimler.filter(b => b.tip === 'mesaj'),
    arkadaşlıkBildirimleri: bildirimler.filter(b => b.tip === 'arkadaşlık'),
  };
} 
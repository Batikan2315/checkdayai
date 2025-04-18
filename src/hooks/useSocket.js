"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';

/**
 * Socket.IO bağlantısını yöneten özel kanca
 * @param {Object} session - Kullanıcı oturumu
 * @returns {Object} Socket ve bağlantı durumu
 */
const useSocket = (session) => {
  const [socket, setSocket] = useState(null);
  const [bağlantıDurumu, setBağlantıDurumu] = useState('bağlantı kesildi');
  const [bağlantıHatası, setBağlantıHatası] = useState(null);
  
  // Yeniden bağlanma mantığı için gereken değişkenler
  const denemeSayısı = useRef(0);
  const sonDenemeSaati = useRef(0);
  const bağlantıAktif = useRef(false);
  const zamanlayıcı = useRef(null);
  const başlatıldı = useRef(false);

  // Socket bağlantısını temizleyen yardımcı fonksiyon
  const socketTemizle = useCallback(() => {
    if (socket) {
      console.log('Socket bağlantısı temizleniyor...');
      socket.removeAllListeners();
      socket.disconnect();
      setSocket(null);
    }
  }, [socket]);

  // Manuel olarak bağlantıyı yeniden başlatma
  const yenidenBağlan = useCallback(() => {
    socketTemizle();
    denemeSayısı.current = 0; // Deneme sayısını sıfırla
    sonDenemeSaati.current = Date.now();
    
    // Zamanlayıcıyı temizle
    if (zamanlayıcı.current) {
      clearTimeout(zamanlayıcı.current);
      zamanlayıcı.current = null;
    }
    
    // Hemen bağlanmayı dene
    socketBağlantısıKur(session);
  }, [socketTemizle, session]);

  // Socket bağlantısını başlatan fonksiyon
  const başlat = useCallback(() => {
    if (!başlatıldı.current && session?.user) {
      başlatıldı.current = true;
      bağlantıAktif.current = true;
      yenidenBağlan();
    }
  }, [yenidenBağlan, session]);

  // Socket bağlantısı kurma fonksiyonu
  const socketBağlantısıKur = useCallback((session) => {
    if (!session?.user || !bağlantıAktif.current) {
      return;
    }

    // Bağlantı deneme sıklığını kontrol et
    const şimdi = Date.now();
    const geçenSüre = şimdi - sonDenemeSaati.current;
    
    // İlk deneme veya 5 saniyeden fazla zaman geçtiyse deneme sayısını artır
    if (denemeSayısı.current === 0 || geçenSüre > 5000) {
      denemeSayısı.current += 1;
      sonDenemeSaati.current = şimdi;
      
      console.log(`Socket.IO bağlantısı başlatılıyor... (${denemeSayısı.current}. deneme)`);
      
      // Çok fazla deneme olduysa biraz bekleyip tekrar dene
      if (denemeSayısı.current > 5) {
        const beklemeSüresi = Math.min(30000, denemeSayısı.current * 2000); // Max 30 saniye
        console.log(`Çok sık bağlantı denemesi, ${beklemeSüresi/1000} saniye bekleniyor...`);
        
        setBağlantıDurumu('bekliyor');
        setBağlantıHatası(`Yeniden bağlanılıyor... ${Math.ceil(beklemeSüresi/1000)} saniye sonra tekrar deneyeceğiz.`);
        
        if (zamanlayıcı.current) clearTimeout(zamanlayıcı.current);
        
        zamanlayıcı.current = setTimeout(() => {
          socketBağlantısıKur(session);
        }, beklemeSüresi);
        
        return;
      }
      
      setBağlantıDurumu('bağlanıyor');
      setBağlantıHatası(null);
      
      try {
        // Eski bağlantıyı temizle
        socketTemizle();
        
        // Yeni bağlantı oluştur
        const yeniSocket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || window.location.origin, {
          withCredentials: true,
          reconnection: false, // Manuel olarak yeniden bağlanma stratejisi kullanılacak
          timeout: 15000, // 15 saniye bağlantı zaman aşımı
          query: {
            userId: session?.user?.id || session?.user?._id || null
          },
          transports: ['polling'], // WebSocket hataları nedeniyle sadece polling kullanıyoruz
          path: '/api/socketio/',
          forceNew: true,
          autoConnect: true
        });
        
        // Bağlantı olaylarını dinle
        yeniSocket.on('connect', () => {
          console.log('Socket.IO bağlantısı başarılı!');
          setBağlantıDurumu('bağlandı');
          setBağlantıHatası(null);
          denemeSayısı.current = 0; // Başarılı bağlantıda sayacı sıfırla
        });
        
        yeniSocket.on('connect_error', (err) => {
          console.error('Socket bağlantı hatası:', err.message);
          setBağlantıDurumu('hata');
          setBağlantıHatası(`${err.message}`);
          
          // Bağlantı hatasında otomatik yeniden deneme
          if (zamanlayıcı.current) clearTimeout(zamanlayıcı.current);
          
          const yenidenDenemeSüresi = Math.min(30000, denemeSayısı.current * 2000);
          zamanlayıcı.current = setTimeout(() => {
            socketBağlantısıKur(session);
          }, yenidenDenemeSüresi);
        });
        
        yeniSocket.on('disconnect', (reason) => {
          console.log('Socket bağlantısı kesildi:', reason);
          setBağlantıDurumu('bağlantı kesildi');
          
          // Sunucu veya istemci tarafından kapatılmadıysa otomatik yeniden bağlan
          if (reason !== 'io client disconnect' && reason !== 'io server disconnect') {
            if (zamanlayıcı.current) clearTimeout(zamanlayıcı.current);
            
            zamanlayıcı.current = setTimeout(() => {
              socketBağlantısıKur(session);
            }, 3000); // 3 saniye sonra tekrar dene
          }
        });
        
        yeniSocket.on('error', (error) => {
          console.error('Socket hatası:', error);
          setBağlantıDurumu('hata');
          setBağlantıHatası(String(error));
        });
        
        // Transport değişirse kullanıcıyı bilgilendir (websocket'ten polling'e geçiş)
        yeniSocket.on('reconnect_attempt', () => {
          console.log('Socket yeniden bağlanma deneniyor...');
        });
        
        yeniSocket.io.on('packet', (packet) => {
          if (packet.type === 'error') {
            console.error('WebSocket hatası tespit edildi, polling moduna geçiliyor');
          }
        });
        
        yeniSocket.io.on('reconnect_error', (error) => {
          console.error('WebSocket yeniden bağlantı hatası:', error);
        });
        
        setSocket(yeniSocket);
      } catch (error) {
        console.error('Socket oluşturma hatası:', error);
        setBağlantıDurumu('hata');
        setBağlantıHatası(String(error));
        
        // Hata durumunda tekrar deneme
        if (zamanlayıcı.current) clearTimeout(zamanlayıcı.current);
        
        zamanlayıcı.current = setTimeout(() => {
          socketBağlantısıKur(session);
        }, 5000);
      }
    } else {
      console.log('Çok sık bağlantı denemesi, atlıyorum...');
    }
  }, [socketTemizle, session]);
  
  // Ağ bağlantısı değişimlerini izle
  useEffect(() => {
    const handleOnline = () => {
      console.log('Ağ bağlantısı tespit edildi');
      if (başlatıldı.current && bağlantıDurumu !== 'bağlandı') {
        yenidenBağlan();
      }
    };
    
    const handleOffline = () => {
      console.log('Ağ bağlantısı kesildi');
      setBağlantıDurumu('bağlantı kesildi');
      setBağlantıHatası('İnternet bağlantısı yok');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [yenidenBağlan, bağlantıDurumu]);
  
  // Sayfa görünürlüğünü izle
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Sayfa görünür oldu');
        if (başlatıldı.current && bağlantıDurumu !== 'bağlandı') {
          yenidenBağlan();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [yenidenBağlan, bağlantıDurumu]);
  
  // Oturum değiştiğinde socket bağlantısını güncelle
  useEffect(() => {
    if (session?.user) {
      // Kullanıcı giriş yaptığında ve bağlantı manuel olarak başlatıldığında bağlan
      if (başlatıldı.current) {
        bağlantıAktif.current = true;
        if (!socket) {
          socketBağlantısıKur(session);
        }
      }
    } else {
      // Kullanıcı çıkış yaptığında bağlantıyı kapat
      bağlantıAktif.current = false;
      socketTemizle();
      setBağlantıDurumu('bağlantı kesildi');
      setBağlantıHatası(null);
      başlatıldı.current = false;
    }
    
    // Temizleme
    return () => {
      if (zamanlayıcı.current) {
        clearTimeout(zamanlayıcı.current);
        zamanlayıcı.current = null;
      }
    };
  }, [session, socket, socketTemizle, socketBağlantısıKur]);
  
  // Bileşen kaldırıldığında temizlik yap
  useEffect(() => {
    return () => {
      socketTemizle();
      if (zamanlayıcı.current) {
        clearTimeout(zamanlayıcı.current);
        zamanlayıcı.current = null;
      }
    };
  }, [socketTemizle]);
  
  return {
    socket,
    bağlantıDurumu,
    bağlantıHatası,
    yenidenBağlan,
    başlat,
  };
};

export default useSocket; 
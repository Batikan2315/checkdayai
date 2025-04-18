"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';

/**
 * Socket.IO bağlantısını yöneten özel kanca
 * @param {Object} session - Kullanıcı oturumu
 * @returns {Object} Socket ve bağlantı durumu
 */
const useSocket = (session) => {
  // Sunucu tarafında çalışıyorsa boş bir sonuç dönüş
  if (typeof window === 'undefined') {
    return {
      socket: null,
      bağlantıDurumu: 'bağlantı kesildi',
      bağlantıHatası: null,
      yenidenBağlan: () => {},
      başlat: () => {}
    };
  }
  
  const [socket, setSocket] = useState(null);
  const [bağlantıDurumu, setBağlantıDurumu] = useState('bağlantı kesildi');
  const [bağlantıHatası, setBağlantıHatası] = useState(null);
  
  // Yeniden bağlanma mantığı için gereken değişkenler
  const denemeSayısı = useRef(0);
  const sonDenemeSaati = useRef(0);
  const bağlantıAktif = useRef(false);
  const zamanlayıcı = useRef(null);
  const başlatıldı = useRef(false);
  
  const socketRef = useRef(null);
  const ioRef = useRef(null);

  // Socket.io modülünü yükleme
  useEffect(() => {
    // Sadece tarayıcı tarafında çalıştığından emin ol
    if (typeof window !== 'undefined' && !ioRef.current) {
      // Dinamik import
      import('socket.io-client')
        .then(module => {
          ioRef.current = module.io;
          console.log('Socket.io modülü başarıyla yüklendi');
        })
        .catch(error => {
          console.error('Socket.io modülü yüklenemedi:', error);
        });
    }
  }, []);

  // Socket bağlantısını temizleyen yardımcı fonksiyon
  const socketTemizle = useCallback(() => {
    if (socketRef.current) {
      console.log('Socket bağlantısı temizleniyor...');
      try {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      } catch (e) {
        console.error('Socket temizleme hatası:', e);
      }
      socketRef.current = null;
      setSocket(null);
    }
  }, []);

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
    
    // ioRef.current varsa bağlanma işlemini başlat
    if (ioRef.current) {
      socketBağlantısıKur(session);
    } else {
      console.log('Socket.io modülü henüz yüklenmedi, bağlantı kurulamıyor');
    }
  }, [socketTemizle, session]);

  // Socket bağlantısını başlatan fonksiyon
  const başlat = useCallback(() => {
    if (!başlatıldı.current && session?.user) {
      başlatıldı.current = true;
      bağlantıAktif.current = true;
      // ioRef.current varsa bağlanma işlemini başlat
      if (ioRef.current) {
        yenidenBağlan();
      } else {
        console.log('Socket.io modülü henüz yüklenmedi, bağlantı kurulamıyor');
      }
    }
  }, [yenidenBağlan, session]);

  // Socket bağlantısı kurma fonksiyonu
  const socketBağlantısıKur = useCallback((session) => {
    // Socket.io modülü yüklü değilse çık
    if (!ioRef.current) {
      console.log('Socket.io modülü yüklenmedi, bağlantı kurulamıyor');
      return;
    }
    
    if (!session?.user || !bağlantıAktif.current) {
      // Kullanıcı giriş yapmamışsa sessizce çık, hata gösterme
      if (!session?.user) {
        console.log('Kullanıcı giriş yapmamış, socket bağlantısı kurulmayacak');
        return;
      }
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
        const yeniSocket = ioRef.current(process.env.NEXT_PUBLIC_WEBSOCKET_URL || window.location.origin, {
          withCredentials: true,
          reconnection: false, // Manuel olarak yeniden bağlanma stratejisi kullanılacak
          timeout: 15000, // 15 saniye bağlantı zaman aşımı
          query: {
            userId: session?.user?.id || session?.user?._id || null
          },
          transports: ['polling'], // WebSocket hataları nedeniyle sadece polling kullanıyoruz
          path: '/api/socketio',
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
          // Kullanıcı giriş yapmamışsa hatayı sessizce görmezden gel
          if (!session?.user) return;
          
          console.error('Socket bağlantı hatası:', err.message);
          setBağlantıDurumu('hata');
          setBağlantıHatası(`${err.message}`);
          
          // Bağlantı hatasında otomatik yeniden deneme
          if (zamanlayıcı.current) clearTimeout(zamanlayıcı.current);
          
          const yenidenDenemeSüresi = Math.min(30000, denemeSayısı.current * 2000);
          zamanlayıcı.current = setTimeout(() => {
            if (session?.user) {  // Yeniden deneme öncesi kullanıcı kontrolü
              socketBağlantısıKur(session);
            }
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
        
        // İki referansı da güncelle
        socketRef.current = yeniSocket;
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
  
  // ioRef değişince başlat
  useEffect(() => {
    if (ioRef.current && başlatıldı.current && session?.user) {
      console.log('Socket.io modülü hazır, bağlantı başlatılıyor');
      socketBağlantısıKur(session);
    }
  }, [ioRef.current, session, socketBağlantısıKur]);
  
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
      if (başlatıldı.current && ioRef.current) {
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
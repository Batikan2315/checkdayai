import { useEffect, useState } from 'react';
import io from 'socket.io-client';

let socket;
let bağlantıDenemeleri = 0;
const MAKSİMUM_DENEME = 3;
let sonDenemeZamanı = 0;

export default function useSocket() {
  const [bağlantıDurumu, setBağlantıDurumu] = useState(false);
  const [hataMesajı, setHataMesajı] = useState(null);
  const [bağlanıyor, setBağlanıyor] = useState(false);

  useEffect(() => {
    // Soket bağlantısını başlat
    function socketBağlantısıKur() {
      // Çok sık yeniden bağlanma denemelerini engelle
      const şimdi = Date.now();
      if (bağlanıyor || (şimdi - sonDenemeZamanı < 5000)) {
        console.log("Çok sık bağlantı denemesi, atlıyorum...");
        return;
      }

      // Maksimum deneme sayısını kontrol et
      if (bağlantıDenemeleri >= MAKSİMUM_DENEME) {
        console.log(`Maksimum deneme sayısına (${MAKSİMUM_DENEME}) ulaşıldı, yeni deneme yapılmayacak.`);
        return;
      }

      setBağlanıyor(true);
      sonDenemeZamanı = şimdi;
      bağlantıDenemeleri++;

      console.log(`Socket.IO bağlantısı başlatılıyor... (${bağlantıDenemeleri}. deneme)`);

      // Eğer soket yoksa oluştur
      if (!socket) {
        socket = io({
          path: '/api/socketio',
          reconnectionAttempts: 3,
          reconnectionDelay: 3000,
          timeout: 10000,
          transports: ['polling', 'websocket']
        });
      }

      // Bağlantı kapandıysa yeniden aç
      if (socket && socket.disconnected) {
        socket.connect();
      }
    }

    // İlk bağlantıyı kur
    socketBağlantısıKur();

    // Bağlantı olaylarını dinle
    function bağlantıKuruldu() {
      console.log('Socket bağlantısı başarıyla kuruldu');
      setBağlantıDurumu(true);
      setHataMesajı(null);
      setBağlanıyor(false);
      bağlantıDenemeleri = 0; // Başarılı bağlantıda sayacı sıfırla
    }

    function bağlantıKesildi() {
      console.log('Socket bağlantısı kesildi');
      setBağlantıDurumu(false);
      setBağlanıyor(false);
    }

    function bağlantıHatası(hata) {
      console.log('Socket bağlantı hatası:', hata.message);
      setHataMesajı(hata.message);
      setBağlantıDurumu(false);
      setBağlanıyor(false);

      // WebSocket hatası durumunda polling moduna geç
      if (hata.message === 'websocket error') {
        console.log('WebSocket hatası tespit edildi, polling moduna geçiliyor');
        if (socket) {
          socket.io.opts.transports = ['polling'];
        }
      }
    }

    // Olayları dinle
    if (socket) {
      socket.on('connect', bağlantıKuruldu);
      socket.on('disconnect', bağlantıKesildi);
      socket.on('connect_error', bağlantıHatası);
    }

    // Temizleme
    return () => {
      if (socket) {
        socket.off('connect', bağlantıKuruldu);
        socket.off('disconnect', bağlantıKesildi);
        socket.off('connect_error', bağlantıHatası);
      }
    };
  }, []);

  // Bağlantı temizleme fonksiyonu
  const bağlantıyıKapat = () => {
    if (socket) {
      console.log('Socket bağlantısı temizleniyor...');
      socket.disconnect();
      setBağlantıDurumu(false);
    }
  };

  // Bağlantıyı yeniden deneme fonksiyonu
  const yenidenBağlan = () => {
    if (socket) {
      bağlantıDenemeleri = 0; // Sayacı sıfırla
      console.log('Yeniden bağlanılıyor...');
      socket.connect();
    }
  };

  return { 
    socket, 
    bağlantıDurumu, 
    hataMesajı, 
    bağlanıyor, 
    bağlantıyıKapat, 
    yenidenBağlan 
  };
} 
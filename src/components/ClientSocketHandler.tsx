"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import useSocket from "@/hooks/useSocket";

export default function ClientSocketHandler() {
  const { data: session } = useSession();
  const { socket, bağlantıDurumu, yenidenBağlan, bağlantıyıKapat } = useSocket();
  
  useEffect(() => {
    // Kullanıcı giriş yapmışsa socket bağlantısını başlat
    if (session?.user?.id) {
      console.log("Kullanıcı mevcut, Socket.IO başlatılıyor...");
      yenidenBağlan();
    } else {
      console.log("Kullanıcı yok, Socket.IO temizleniyor...");
      bağlantıyıKapat();
    }
  }, [session, yenidenBağlan, bağlantıyıKapat]);

  // Socket durumunu kontrol et
  useEffect(() => {
    if (bağlantıDurumu && session?.user?.id) {
      console.log("Socket bağlantısı kuruldu. Kullanıcı:", session.user.id);
    }
  }, [bağlantıDurumu, session]);

  // Görsel bir bileşen döndürme (opsiyonel)
  return null;
} 
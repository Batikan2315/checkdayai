"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import PageContainer from "@/components/layout/PageContainer";
import { Card, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { FaCalendarAlt, FaUserFriends, FaRobot, FaClock, FaMapMarkerAlt, FaSearch, FaArrowRight, FaApple, FaGooglePlay, FaGoogle } from "react-icons/fa";
import PlanCard from "@/components/ui/PlanCard";
import { toast } from "react-hot-toast";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { BsArrowRight } from "react-icons/bs";
import { signIn } from "next-auth/react";

// API İstekleri için önbellek anahtarları ve geçerlilik süreleri
const PLANS_CACHE_KEY = 'homepage_plans_cache';
const PLANS_CACHE_TTL = 30 * 60 * 1000; // 30 dakika (ms)

// Popup bekletme süresi değişkeni
const POPUP_TIMEOUT = 30 * 60 * 1000; // 30 dakika (ms)

export default function Home() {
  const [countdown, setCountdown] = useState<{
    title: string;
    date: string;
    active: boolean;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const [showLoginPopup, setShowLoginPopup] = useState(false);

  // Önbellekten veri alma işlevi
  const getFromCache = useCallback((key: string) => {
    if (typeof window === 'undefined') return null;
    
    try {
      const cachedData = localStorage.getItem(key);
      if (!cachedData) return null;
      
      const { data, expires } = JSON.parse(cachedData);
      if (Date.now() > expires) {
        localStorage.removeItem(key);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error(`Önbellek okuma hatası (${key}):`, error);
      return null;
    }
  }, []);

  // Önbelleğe veri kaydetme işlevi
  const saveToCache = useCallback((key: string, data: any, ttl: number = PLANS_CACHE_TTL) => {
    if (typeof window === 'undefined') return;
    
    try {
      const cacheItem = {
        data,
        expires: Date.now() + ttl
      };
      localStorage.setItem(key, JSON.stringify(cacheItem));
    } catch (error) {
      console.error(`Önbellek yazma hatası (${key}):`, error);
    }
  }, []);

  // Geri sayım bilgilerini getir
  useEffect(() => {
    const fetchCountdown = async () => {
      try {
        const response = await fetch('/api/admin/countdown');
        const data = await response.json();
        
        console.log("Geri sayım verileri:", data); // Debug için
        
        if (data && data.active && data.date) {
          setCountdown(data);
        }
      } catch (error) {
        console.error("Geri sayım verisi getirme hatası:", error);
      }
    };

    fetchCountdown();
  }, []);

  // Geri sayım hesaplama
  useEffect(() => {
    if (!countdown || !countdown.active || !countdown.date) return;

    const calculateTimeLeft = () => {
      const difference = new Date(countdown.date).getTime() - new Date().getTime();
      
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // Plan verileri al
  const fetchRandomPlans = useCallback(async () => {
    try {
      setLoading(true);
      
      // Önbellek kontrolü
      const cachedPlans = getFromCache(PLANS_CACHE_KEY);
      if (cachedPlans) {
        console.log('Önbellekten plan verileri kullanılıyor');
        setPlans(cachedPlans);
        setLoading(false);
        return;
      }
      
      // Session kontrolü - kullanıcı giriş yapmamışsa gereksiz API isteği yapma
      if (!user) {
        console.log('Kullanıcı giriş yapmadı, API isteği engelleniyor');
        setPlans([]);
        setLoading(false);
        if (localStorage.getItem('token')) {
          localStorage.removeItem('token');
          localStorage.removeItem('authInfo');
        }
        return;
      }
      
      const response = await fetch('/api/plans?limit=10&published=true', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Random-Cache-Bust': Math.random().toString()
        }
      });
      
      const data = await response.json();
      console.log('API yanıtı:', data);
      
      if (response.ok && data?.plans?.length > 0) {
        // API yanıtını önbelleğe kaydet
        saveToCache(PLANS_CACHE_KEY, data.plans);
        
        // Planları karıştır ve rastgele 3 tanesini al
        const shuffledPlans = [...data.plans].sort(() => 0.5 - Math.random());
        const randomPlans = shuffledPlans.slice(0, 3);
        setPlans(randomPlans);
      } else {
        console.log('Planlar için boş veya beklenmeyen API yanıtı:', data);
        setPlans([]);
      }
    } catch (error: any) {
      console.error('Planlar alınırken hata:', error);
      setError(error.message);
      toast.error("Planlar yüklenirken bir hata oluştu");
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [getFromCache, saveToCache, user]);

  useEffect(() => {
    const initHomepage = async () => {
      // Son istek zamanını kontrol et
      if (typeof window !== 'undefined') {
        const lastFetchTime = localStorage.getItem('lastHomepageFetch');
        const currentTime = Date.now();
        
        // Son istekten beri 3 dakika (180 saniye) geçmediyse tekrar istek atma
        if (lastFetchTime && currentTime - parseInt(lastFetchTime) < 180000) {
          console.log('Son istekten beri 3 dakikadan az zaman geçti, istek engelleniyor');
          
          // Önbellekten veri kullan
          const cachedPlans = getFromCache(PLANS_CACHE_KEY);
          if (cachedPlans) {
            setPlans(cachedPlans);
            setLoading(false);
            return;
          }
        }
        
        // Session kontrolü - kullanıcı giriş yapmamışsa gereksiz API isteği yapma
        if (!user) {
          console.log('Kullanıcı giriş yapmadı, API isteği engelleniyor');
          setPlans([]);
          setLoading(false);
          if (localStorage.getItem('token')) {
            localStorage.removeItem('token');
            localStorage.removeItem('authInfo');
          }
          return;
        }
        
        // Gereksiz API çağrılarını engellemek için yükleme sonrası session kontrolü
        const hasLoadedBefore = sessionStorage.getItem('homepage_loaded');
        
        // İlk yükleme
        if (!hasLoadedBefore) {
          sessionStorage.setItem('homepage_loaded', 'true');
          await fetchRandomPlans();
          localStorage.setItem('lastHomepageFetch', currentTime.toString());
        } else {
          // Önbellekten plan verilerini kontrol et
          const cachedPlans = getFromCache(PLANS_CACHE_KEY);
          if (cachedPlans) {
            setPlans(cachedPlans);
            setLoading(false);
          } else {
            await fetchRandomPlans();
            localStorage.setItem('lastHomepageFetch', currentTime.toString());
          }
        }
      } else {
        await fetchRandomPlans();
      }
    };
    
    initHomepage();
  }, [fetchRandomPlans, getFromCache]);

  // Kullanıcı giriş yapmamışsa pop-up'ı göster, ama localStorage'da "postponed" varsa gösterme
  useEffect(() => {
    if (!user) {
      // Erteleme durumunu kontrol et
      const loginPopupPostponed = localStorage.getItem('loginPopupPostponed');
      if (loginPopupPostponed) {
        const postponedTime = parseInt(loginPopupPostponed);
        // Erteleme süresi dolmuş mu kontrol et
        if (Date.now() < postponedTime) {
          return; // Erteleme süresi dolmamış, popup'ı gösterme
        } else {
          // Erteleme süresi dolmuş, localStorage'dan kaldır
          localStorage.removeItem('loginPopupPostponed');
        }
      }
      
      // Pop-up'ı 2 saniye sonra göster (kullanıcı deneyimi için biraz gecikme)
      const timer = setTimeout(() => {
        setShowLoginPopup(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [user]);
  
  // Google ile giriş yap
  const handleGoogleLogin = async () => {
    try {
      await signIn("google", {
        callbackUrl: window.location.pathname || "/"
      });
    } catch (error) {
      console.error("Google girişi hatası:", error);
      toast.error("Google ile giriş yapılırken bir hata oluştu");
    }
  };

  // Popup'ı sonraya ertele
  const postponeLoginPopup = () => {
    // Popup'ı kapat
    setShowLoginPopup(false);
    // 30 dakika sonrasını kaydet (zamana 30 dakika ekle)
    localStorage.setItem('loginPopupPostponed', (Date.now() + POPUP_TIMEOUT).toString());
  };

  return (
    <PageContainer>
      {/* Google Giriş Pop-up'ı değiştir - tam ekran yerine küçük bildirim stili */}
      {showLoginPopup && !user && (
        <div className="fixed top-20 right-4 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 z-50 border border-gray-200 dark:border-gray-700 animate-fadeIn">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-bold">CheckDay'e Hoş Geldiniz</h3>
            <button 
              onClick={() => setShowLoginPopup(false)} 
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              &times;
            </button>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Giriş yaparak tüm özelliklere erişin
          </p>
          
          <Button
            type="button"
            variant="primary"
            fullWidth
            onClick={handleGoogleLogin}
            className="flex items-center justify-center text-sm mb-2"
            size="sm"
          >
            <FaGoogle className="mr-2" />
            Google ile Giriş Yap
          </Button>
          
          <button 
            className="text-xs text-gray-500 dark:text-gray-400 py-1 hover:underline w-full text-center"
            onClick={postponeLoginPopup}
          >
            Daha sonra hatırlat
          </button>
        </div>
      )}

      <div className="space-y-12">
        {/* Geri Sayım veya Küçük Hero Bölümü */}
        {countdown?.active ? (
          <section className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-8 text-white text-center my-8 shadow-lg border border-purple-500/20 overflow-hidden relative">
            {/* Arka plan efektleri */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10">
              <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-white"></div>
              <div className="absolute bottom-10 right-10 w-40 h-40 rounded-full bg-white"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 rounded-full bg-white"></div>
            </div>
            
            <div className="relative z-10">
              <h1 className="text-3xl md:text-5xl font-bold mb-6">{countdown.title}</h1>
              <div className="flex flex-col items-center">
                <div className="flex flex-wrap justify-center gap-4">
                  <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl min-w-[90px] shadow-inner">
                    <div className="text-4xl md:text-5xl font-bold">{timeLeft.days}</div>
                    <div className="text-sm uppercase tracking-wider mt-1">Gün</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl min-w-[90px] shadow-inner">
                    <div className="text-4xl md:text-5xl font-bold">{timeLeft.hours}</div>
                    <div className="text-sm uppercase tracking-wider mt-1">Saat</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl min-w-[90px] shadow-inner">
                    <div className="text-4xl md:text-5xl font-bold">{timeLeft.minutes}</div>
                    <div className="text-sm uppercase tracking-wider mt-1">Dakika</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl min-w-[90px] shadow-inner">
                    <div className="text-4xl md:text-5xl font-bold">{timeLeft.seconds}</div>
                    <div className="text-sm uppercase tracking-wider mt-1">Saniye</div>
                  </div>
                </div>
                
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <Link href="/plan/create">
                    <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50">
                      <FaCalendarAlt className="mr-2" /> Plan Oluştur
                    </Button>
                  </Link>
                  <Link href="/plans">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                      <FaSearch className="mr-2" /> Planları Keşfet
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="text-center py-10 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl text-white">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Planlarını Keşfet</h1>
            <p className="text-lg mb-6 opacity-90 max-w-2xl mx-auto">
              CheckDay ile hayatını planla, planlara katıl veya kendi planlarını oluştur.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
              <Link href="/plan/create">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                    <FaCalendarAlt className="mr-2" /> Plan Oluştur
                  </Button>
                </Link>
                <Link href="/plans">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                    <FaSearch className="mr-2" /> Planları Keşfet
              </Button>
            </Link>
              </div>
            </section>
        )}

        {/* Özellikler Bölümü */}
        <section className="py-16">
          <h2 className="text-3xl font-bold text-center mb-12">CheckDay ile Hayatına Düzen Getir</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transform transition-transform hover:scale-105">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <FaCalendarAlt className="text-2xl" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center">Akıllı Plan Oluşturma</h3>
              <p className="text-gray-600 dark:text-gray-300 text-center">
                Birkaç tıklama ile planlarını oluştur, hatırlatmalar al ve günlük rutinini düzenle.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transform transition-transform hover:scale-105">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <FaUserFriends className="text-2xl" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center">Sosyal Bağlantılar</h3>
              <p className="text-gray-600 dark:text-gray-300 text-center">
                Arkadaşlarını planlarına davet et, aynı ilgi alanlarına sahip kişilerle bir araya gel.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transform transition-transform hover:scale-105">
              <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <FaMapMarkerAlt className="text-2xl" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center">Konuma Göre Keşfet</h3>
              <p className="text-gray-600 dark:text-gray-300 text-center">
                Bulunduğun bölgedeki planları keşfet, yakınındaki planlar hakkında bildirimler al.
              </p>
            </div>
          </div>
        </section>
        
        {/* İstatistikler Bölümü */}
        <section className="py-14 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl text-white">
          <h2 className="text-3xl font-bold text-center mb-10">CheckDay ile Daha Fazlasını Keşfet</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4">
              <div className="text-4xl font-bold mb-2">1000+</div>
              <div className="text-lg opacity-90">Aktif Kullanıcı</div>
            </div>
            <div className="p-4">
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-lg opacity-90">Oluşturulan Plan</div>
            </div>
            <div className="p-4">
              <div className="text-4xl font-bold mb-2">300+</div>
              <div className="text-lg opacity-90">Başarılı Plan</div>
            </div>
            <div className="p-4">
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-lg opacity-90">Şehir</div>
            </div>
          </div>
          <div className="mt-10 text-center">
            <Link href="/plans">
              <Button size="lg" className="bg-white text-indigo-600 hover:bg-blue-50">
                <FaSearch className="mr-2" /> Planları Keşfet
              </Button>
            </Link>
          </div>
        </section>
        
        {/* Rastgele Planlar Bölümü */}
        <section className="py-10">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Keşfedilecek Planlar</h2>
            <Link href="/plans">
              <Button variant="ghost" className="text-blue-600">
                Tümünü Gör
              </Button>
            </Link>
          </div>
          
          {loading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((skeleton) => (
                <div key={skeleton} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-0 rounded-lg shadow-sm overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-300 dark:bg-gray-700 w-full"></div>
                  <div className="p-4">
                    <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-2/3"></div>
                    <div className="mt-4 flex justify-between items-center">
                      <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
                      <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : plans && plans.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <PlanCard
                  key={plan._id}
                  id={plan._id}
                  title={plan.title || "İsimsiz Plan"}
                  description={plan.description || "Açıklama yok"}
                  imageUrl={plan.image}
                  date={new Date(plan.startDate || Date.now())}
                  location={plan.location || "Konum belirtilmemiş"}
                  creator={plan.creator}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xl">Henüz plan bulunamadı. İlk planı oluşturmak ister misiniz?</p>
              <Link href="/plan/create" className="mt-4 inline-block">
                <Button>Plan Oluştur</Button>
              </Link>
            </div>
          )}
        </section>

        {/* CTA Bölümü */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-10 text-white text-center my-12">
          <h2 className="text-3xl font-bold mb-4">Hayatını Planlamaya Bugün Başla</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            CheckDay ile hayatının kontrolünü ele al, daha düzenli ve sosyal bir yaşam için hemen üye ol!
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-4 items-center">
            <Link href="/auth/register">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                Hemen Üye Ol
              </Button>
            </Link>
            <p className="md:ml-4 text-white opacity-90">1 dakikada üyeliğini tamamla ve hemen planlamaya başla!</p>
          </div>
        </section>

        {/* Nasıl Çalışır Bölümü */}
        <section className="py-12">
          <h2 className="text-3xl font-bold text-center mb-10">CheckDay Nasıl Çalışır?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">1</div>
              <h3 className="text-xl font-semibold mb-2">Üye Ol</h3>
              <p className="text-gray-600">
                Saniyeler içinde üyeliğini oluştur ve hemen planlamaya başla.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">2</div>
              <h3 className="text-xl font-semibold mb-2">Planını Oluştur</h3>
              <p className="text-gray-600">
                Planları kolayca oluştur ve yönet.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">3</div>
              <h3 className="text-xl font-semibold mb-2">Paylaş ve Katıl</h3>
              <p className="text-gray-600">
                Planlarını arkadaşlarınla paylaş veya açık planlara katıl.
              </p>
            </div>
          </div>
        </section>

        {/* Kullanıcı Yorumları */}
        <section className="py-10">
          <h2 className="text-3xl font-bold text-center mb-10">Kullanıcılarımız Ne Diyor?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-0 shadow-md">
              <CardBody className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 mr-4"></div>
                  <div>
                    <h4 className="font-semibold">Ahmet Y.</h4>
                    <div className="flex text-yellow-400">
                      <span>★★★★★</span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-600">
                  "CheckDay sayesinde arkadaşlarımla buluşmalarımı daha kolay planlıyorum. Uygulama çok kullanışlı!"
                </p>
              </CardBody>
            </Card>
            
            <Card className="border-0 shadow-md">
              <CardBody className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 mr-4"></div>
                  <div>
                    <h4 className="font-semibold">Zeynep K.</h4>
                    <div className="flex text-yellow-400">
                      <span>★★★★★</span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-600">
                  "Planları keşfetmek artık çok daha kolay. CheckDay'i herkese tavsiye ediyorum!"
                </p>
              </CardBody>
            </Card>
            
            <Card className="border-0 shadow-md">
              <CardBody className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 mr-4"></div>
                  <div>
                    <h4 className="font-semibold">Mehmet A.</h4>
                    <div className="flex text-yellow-400">
                      <span>★★★★★</span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-600">
                  "Haftalık planlarımı düzenlemek için harika bir uygulama. Artık daha organize bir hayatım var."
                </p>
                </CardBody>
              </Card>
          </div>
        </section>
        
        {/* İndirme Bölümü */}
        <section className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-10 my-12">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-6 md:mb-0">
              <h2 className="text-3xl font-bold mb-4">CheckDay'i Her Yerde Kullanın</h2>
              <p className="text-lg mb-6">
                Mobil uygulamamızı indirin, planlarınızı her zaman yanınızda taşıyın. Bildirimlerle hiçbir planı kaçırmayın.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="bg-black text-white hover:bg-gray-800">
                  <FaApple className="mr-2" /> App Store
                </Button>
                <Button size="lg" className="bg-green-600 text-white hover:bg-green-700">
                  <FaGooglePlay className="mr-2" /> Google Play
                </Button>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="w-64 h-96 bg-gray-300 rounded-3xl shadow-lg"></div>
            </div>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}

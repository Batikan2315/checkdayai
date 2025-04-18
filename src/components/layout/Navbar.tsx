"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FaCalendarAlt, FaPlusCircle, FaBookmark, FaRobot, FaUserCircle, FaBell, FaTimes, FaCheck, FaListAlt, FaClipboardList } from "react-icons/fa";
import { twMerge } from "tailwind-merge";
import { useSession } from "next-auth/react";
import useNotifications from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import Image from "next/image";

const Navbar: React.FC = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    deleteAllNotifications,
    filterByType,
    activeType,
    fetchNotifications
  } = useNotifications();

  // Stil sınıfları
  const activeClass = "flex items-center text-primary font-medium";
  const inactiveClass = "flex items-center text-muted-foreground hover:text-primary";
  
  // Profil aktif kontrolü
  const profileActive = pathname?.includes("/profile");

  const toggleNotifications = () => {
    setShowNotifications(prev => !prev);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleNotificationClick = async (id: string, link?: string) => {
    await markAsRead(id);
    if (link) {
      window.location.href = link;
    }
    setShowNotifications(false);
  };

  // Bildirim tipine göre ikon seçici
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'system':
        return <FaRobot className="text-blue-500" />;
      case 'invitation':
        return <FaCalendarAlt className="text-green-500" />;
      case 'message':
        return <FaBookmark className="text-purple-500" />;
      case 'like':
        return <FaCheck className="text-red-500" />;
      case 'join':
        return <FaUserCircle className="text-yellow-500" />;
      case 'reminder':
        return <FaCalendarAlt className="text-orange-500" />;
      default:
        return <FaBell className="text-gray-500" />;
    }
  };

  // Tüm bildirimleri sil
  const handleDeleteAll = async () => {
    const confirm = window.confirm("Tüm bildirimleri silmek istediğinize emin misiniz?");
    if (confirm) {
      await deleteAllNotifications();
    }
  };

  // Belirli tipteki bildirimleri sil
  const handleDeleteByType = async (type: string) => {
    const confirm = window.confirm(`${type} türündeki tüm bildirimleri silmek istediğinize emin misiniz?`);
    if (confirm) {
      await deleteAllNotifications(type);
    }
  };

  // Bildirim filtresi
  const notificationTypes = [
    { key: 'system', label: 'Sistem' },
    { key: 'invitation', label: 'Davet' },
    { key: 'message', label: 'Mesaj' },
    { key: 'like', label: 'Beğeni' },
    { key: 'join', label: 'Katılım' },
    { key: 'reminder', label: 'Hatırlatıcı' }
  ];

  // Mobil menü öğeleri - ana düzen
  const mobileMenuItems = [
    {
      name: "Planlar",
      href: "/plans",
      icon: <FaClipboardList className="w-5 h-5" />,
    },
    {
      name: "Takvim",
      href: "/calendar",
      icon: <FaCalendarAlt className="w-5 h-5" />,
    },
    {
      name: "Plan Oluştur",
      href: "/plan/create",
      icon: <FaPlusCircle className="w-5 h-5" />,
    },
    {
      name: "AI Check",
      href: "/ai-check",
      icon: <FaRobot className="w-5 h-5" />,
    }
  ];

  // Desktop menü öğeleri
  const menuItems = [
    {
      name: "Planlar",
      href: "/plans",
      icon: <FaClipboardList className="w-6 h-6" />,
    },
    {
      name: "Takvim",
      href: "/calendar",
      icon: <FaCalendarAlt className="w-6 h-6" />,
    },
    {
      name: "Plan Oluştur",
      href: "/plan/create",
      icon: <FaPlusCircle className="w-6 h-6" />,
    },
    {
      name: "AI Check",
      href: "/ai-check",
      icon: <FaRobot className="w-6 h-6" />,
      highlight: true,
    },
  ];

  // Profil resmi için yardımcı fonksiyon
  const getProfileImage = () => {
    if (!session?.user) return null;
    
    // Profil resmi kontrolü
    if (session.user.image) return session.user.image;
    
    // Eğer custom user verisi varsa
    if (session.user.profilePicture) return session.user.profilePicture;
    
    // Varsayılan avatar
    return "/images/avatars/default.png";
  };

  useEffect(() => {
    // Bildirimleri çek ve okunmamış sayısını ayarla
    const fetchData = async () => {
      try {
        // API çağrısı bildirimleri almak için
        // const response = await fetch('/api/notifications');
        // const data = await response.json();
        // setNotifications(data);
        // const unreadCount = data.filter((n: any) => !n.read).length;
        
        // Örnek olarak sabit bir değer
        const mockUnreadCount = 2;
        // Eğer hooks'tan geliyorsa oradan kullan, yoksa state'i güncelle
        if (typeof unreadCount === 'undefined') {
          console.log('Unread count is not available from hook, using mock data');
        }
      } catch (error) {
        console.error("Bildirimler alınamadı:", error);
      }
    };

    if (session) {
      fetchData();
    }
  }, [session, unreadCount]);

  return (
    <>
      <div className="top-nav fixed top-0 z-10 w-full border-b bg-white dark:bg-gray-900 shadow-sm">
        <div className="container flex justify-between items-center py-2 px-4">
          <div className="flex items-center">
            <Link href="/" className="flex items-center pl-0 md:pl-2">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-transparent bg-clip-text">Checkday</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-6 items-center">
            <div className="flex bg-gray-50 dark:bg-gray-800 rounded-full p-1 shadow-sm">
              <Link
                href="/plans"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  pathname?.includes("/plans") 
                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center">
                  <FaClipboardList className="h-4 w-4 mr-2" />
                  <span>Planlar</span>
                </div>
              </Link>
              <Link
                href="/calendar"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  pathname?.includes("/calendar") 
                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center">
                  <FaCalendarAlt className="h-4 w-4 mr-2" />
                  <span>Takvim</span>
                </div>
              </Link>
              <Link
                href="/plan/create"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  pathname?.includes("/plan/create") 
                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center">
                  <FaPlusCircle className="h-4 w-4 mr-2" />
                  <span>Oluştur</span>
                </div>
              </Link>
            </div>

            <Link
              href="/ai-check"
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                pathname?.includes("/ai-check") 
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white" 
                  : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-gradient-to-r hover:from-blue-500 hover:to-indigo-600 hover:text-white"
              } transition-colors flex items-center shadow-sm`}
            >
              <FaRobot className="h-4 w-4 mr-2" />
              <span>AI Check</span>
            </Link>

            {/* Bildirim ve Profil Alanı */}
            <div className="flex items-center space-x-2">
              {session && (
                <div className="relative">
                  <button
                    className="relative p-2 rounded-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={toggleNotifications}
                  >
                    <FaBell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    {unreadCount > 0 && (
                      <div className="absolute top-0 right-0 rounded-full bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </div>
                    )}
                  </button>
                </div>
              )}

              {session ? (
                <Link href="/profile">
                  <div className="flex items-center cursor-pointer">
                    <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                      <Image
                        src={getProfileImage() as string}
                        alt="Profil"
                        fill
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/images/avatars/default.png"; // Hata durumunda varsayılan resim
                        }}
                      />
                    </div>
                  </div>
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-full text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Giriş Yap
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center space-x-1">
            {session && (
              <div className="relative">
                <button
                  className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={toggleNotifications}
                >
                  <FaBell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  {unreadCount > 0 && (
                    <div className="absolute top-0 right-0 rounded-full bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </div>
                  )}
                </button>
              </div>
            )}

            {session ? (
              <Link href="/profile">
                <div className="flex items-center cursor-pointer">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                    <Image
                      src={getProfileImage() as string}
                      alt="Profil"
                      fill
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/images/avatars/default.png"; // Hata durumunda varsayılan resim
                      }}
                    />
                  </div>
                </div>
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
              >
                Giriş
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobil Alt Navigasyon */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="flex justify-around items-center py-2">
          {mobileMenuItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className={`flex flex-col items-center px-3 py-2 rounded-lg ${
                pathname?.includes(item.href)
                  ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <div className={`${pathname?.includes(item.href) ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"} mb-1`}>
                {item.icon}
              </div>
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Bildirim Menüsü */}
      {showNotifications && (
        <div className="fixed inset-0 z-20 flex justify-end md:justify-center items-start pt-16 md:pt-20 bg-black bg-opacity-50">
          <div className="bg-white border rounded-lg shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">Bildirimler</h3>
                <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-gray-100 rounded-full">
                  <span className="sr-only">Kapat</span>
                  <FaTimes className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>
            
            {/* Filtre bölümü */}
            <div className="p-2 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => filterByType(null)}
                  className={`text-xs px-2 py-1 rounded ${
                    !activeType 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  Tümü
                </button>
                {notificationTypes.map(type => (
                  <button
                    key={type.key}
                    onClick={() => filterByType(type.key)}
                    className={`text-xs px-2 py-1 rounded ${
                      activeType === type.key 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                <button
                  onClick={handleDeleteAll}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Tümünü Sil
                </button>
                {activeType ? (
                  <button
                    onClick={() => handleDeleteByType(activeType)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Filtrelenenleri Sil
                  </button>
                ) : (
                  <button
                    onClick={() => fetchNotifications({ force: true })}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Yenile
                  </button>
                )}
              </div>
            </div>
            
            <div className="p-4">
              {loading ? (
                <div className="text-center py-6 text-gray-500">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  Yükleniyor...
                </div>
              ) : notifications.length > 0 ? (
                notifications.map((notification: any) => (
                  <div 
                    key={notification._id}
                    className="py-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 rounded-md p-2"
                    onClick={() => handleNotificationClick(notification._id, notification.link)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: tr
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  Bildiriminiz bulunmuyor
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar; 
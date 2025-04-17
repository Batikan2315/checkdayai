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
  const profileActive = pathname?.includes(`/${session?.user?.username}`) || pathname?.includes("/profile");

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

  // Mevcut FaBell butonunu işlevsel hale getirme
  const renderNotificationButton = () => (
    <div className="relative">
      <button 
        className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 focus:outline-none"
        onClick={toggleNotifications}
        aria-label="Bildirimleri göster"
      >
        <FaBell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Bildirimler</h3>
            <div className="flex space-x-2">
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Tümünü Okundu İşaretle
                </button>
              )}
              <button 
                onClick={() => setShowNotifications(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <FaTimes />
              </button>
            </div>
          </div>
          
          {/* Filtre bölümü ekle */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => filterByType(null)}
                className={`text-xs px-2 py-1 rounded ${
                  !activeType 
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
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
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
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
          
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                Yükleniyor...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                Bildiriminiz bulunmuyor
              </div>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification._id}
                  className={`p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                    !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification._id, notification.link)}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex justify-between items-start">
                        <p className={`text-sm font-medium ${
                          !notification.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'
                        }`}>
                          {notification.title}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification._id);
                          }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                          <FaTimes size={12} />
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: tr
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Profil resmi için yardımcı fonksiyon
  const getProfileImage = () => {
    if (!session?.user) return null;
    
    // Profil resmi kontrolü
    if (session.user.image) return session.user.image;
    
    // Eğer custom user verisi varsa
    if (session.user.profilePicture) return session.user.profilePicture;
    
    // Google profil resmi yoktur, custom tip tanımında olmadığı için kaldırıyoruz
    
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
      <div className="top-nav fixed top-0 z-10 w-full border-b bg-white shadow-sm">
        <div className="container flex justify-between items-center p-2 px-4">
          <div className="flex items-center">
            <Link href="/" className="flex items-center pl-0 md:pl-2">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-transparent bg-clip-text">Checkday</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-6 items-center p-2">
            <Link
              href="/plans"
              className={`${
                pathname?.includes("/plans") ? activeClass : inactiveClass
              } hover:text-blue-600 transition-colors`}
            >
              <FaClipboardList className="h-5 w-5 mr-1" />
              <span>Planlar</span>
            </Link>
            <Link
              href="/calendar"
              className={`${
                pathname?.includes("/calendar") ? activeClass : inactiveClass
              } hover:text-blue-600 transition-colors`}
            >
              <FaCalendarAlt className="h-5 w-5 mr-1" />
              <span>Takvim</span>
            </Link>
            <Link
              href="/plan/create"
              className={`${
                pathname?.includes("/plan/create") ? activeClass : inactiveClass
              } hover:text-blue-600 transition-colors`}
            >
              <FaPlusCircle className="h-5 w-5 mr-1" />
              <span>Plan Oluştur</span>
            </Link>
            <Link
              href="/ai-check"
              className={`${
                pathname?.includes("/ai-check") ? activeClass : inactiveClass
              } hover:text-blue-600 transition-colors`}
            >
              <FaRobot className="h-5 w-5 mr-1" />
              <span>AI Check</span>
            </Link>
            
            {/* Notifications Button */}
            <button 
              onClick={toggleNotifications} 
              className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FaBell className="h-5 w-5 text-gray-700" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-[10px] text-white font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </button>
            
            {/* Profile Link - Only show image */}
            <Link
              href={`/${session?.user?.username || "profile"}`}
              className="flex flex-col items-center ml-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <div className="h-8 w-8 rounded-full overflow-hidden border border-gray-200">
                <img 
                  src={session?.user?.profilePicture || session?.user?.image || "/images/avatars/default.png"}
                  alt="Profil"
                  className="h-full w-full object-cover"
                />
              </div>
            </Link>
          </div>
          
          {/* Mobile Logo and Notification Button */}
          <div className="flex md:hidden items-center justify-between w-full">
            <Link href="/" className="pl-2 flex items-center">
              <span className="text-lg font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-transparent bg-clip-text">Checkday</span>
            </Link>
            
            <button 
              onClick={toggleNotifications} 
              className="relative mr-2 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FaBell className="h-5 w-5 text-gray-700" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-[10px] text-white font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Notifications Panel */}
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
                        <p className={`text-sm font-medium ${!notification.isRead ? "text-gray-900" : "text-gray-600"}`}>
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification._id);
                        }}
                        className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full"
                      >
                        <FaTimes size={12} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-6 text-gray-500">Henüz bildiriminiz yok</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom mobile navigation */}
      <div className="bottom-nav md:hidden fixed bottom-0 z-10 w-full border-t bg-white shadow-lg">
        <div className="flex justify-around items-center p-2">
          <Link
            href="/plans"
            className={`flex flex-col items-center p-1 ${
              pathname?.includes("/plans") ? "text-blue-600" : "text-gray-500"
            }`}
          >
            <FaClipboardList className="h-5 w-5" />
            <span className="text-xs mt-1">Planlar</span>
          </Link>
          <Link
            href="/calendar"
            className={`flex flex-col items-center p-1 ${
              pathname?.includes("/calendar") ? "text-blue-600" : "text-gray-500"
            }`}
          >
            <FaCalendarAlt className="h-5 w-5" />
            <span className="text-xs mt-1">Takvim</span>
          </Link>
          <Link
            href="/plan/create"
            className={`flex flex-col items-center p-1 ${
              pathname?.includes("/plan/create") ? "text-blue-600" : "text-gray-500"
            }`}
          >
            <FaPlusCircle className="h-5 w-5" />
            <span className="text-xs mt-1">Oluştur</span>
          </Link>
          <Link
            href="/ai-check"
            className={`flex flex-col items-center p-1 ${
              pathname?.includes("/ai-check") ? "text-blue-600" : "text-gray-500"
            }`}
          >
            <FaRobot className="h-5 w-5" />
            <span className="text-xs mt-1">AI Check</span>
          </Link>
          <Link
            href={`/${session?.user?.username || "profile"}`}
            className={`flex flex-col items-center p-1 ${
              profileActive ? "text-blue-600" : "text-gray-500"
            }`}
          >
            <div className="h-5 w-5 rounded-full overflow-hidden border border-gray-200">
              <img 
                src={session?.user?.profilePicture || session?.user?.image || "/images/avatars/default.png"}
                alt="Profil"
                className="h-full w-full object-cover"
              />
            </div>
            <span className="text-xs mt-1">Profil</span>
          </Link>
        </div>
      </div>
    </>
  );
};

export default Navbar; 
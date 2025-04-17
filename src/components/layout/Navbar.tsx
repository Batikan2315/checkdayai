"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaCalendarAlt, FaPlusCircle, FaBookmark, FaRobot, FaUserCircle, FaBell, FaTimes, FaCheck } from "react-icons/fa";
import { twMerge } from "tailwind-merge";
import { useSession } from "next-auth/react";
import useNotifications from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
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

  // Yeni menü öğeleri sırası: Planlar, Takvim, Plan Oluştur, AI Check, Profil
  const menuItems = [
    {
      name: "Planlar",
      href: "/plans",
      icon: <FaBookmark className="w-6 h-6" />,
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
    {
      name: "Profil",
      href: session ? "/profile" : "/login",
      icon: <FaUserCircle className="w-6 h-6" />,
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-auto bg-white dark:bg-gray-900 shadow-lg z-50">
      <div className="container mx-auto p-2">
        {/* Masaüstü görünümü */}
        <div className="hidden md:flex justify-between items-center">
          <Link
            href="/"
            className="text-xl font-bold text-blue-600 dark:text-blue-400 logo"
          >
            checkday
          </Link>
          <div className="flex items-center space-x-6">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={twMerge(
                  "flex flex-col items-center text-gray-500 dark:text-gray-400 hover:text-blue-600 font-medium",
                  pathname === item.href &&
                    "text-blue-600 dark:text-blue-400",
                  item.highlight &&
                    "text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                )}
              >
                {item.icon}
                <span className="text-sm">{item.name}</span>
              </Link>
            ))}
            {session && renderNotificationButton()}
            {session?.user && (
              <Link href="/profile" className="ml-2">
                <img
                  src={getProfileImage() || "/images/avatars/default.png"}
                  alt="Profil"
                  className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                />
              </Link>
            )}
          </div>
        </div>

        {/* Mobil görünümü */}
        <div className="flex flex-col md:hidden">
          {/* Mobil üst çubuk - logo ve bildirim */}
          <div className="flex justify-between items-center pb-2 mb-2 border-b border-gray-200 dark:border-gray-700">
            <Link href="/" className="text-lg font-bold text-blue-600 dark:text-blue-400">
              checkday
            </Link>
            {session && (
              <div className="flex items-center">
                {renderNotificationButton()}
              </div>
            )}
          </div>
          
          {/* Mobil alt çubuk - menü öğeleri */}
          <div className="flex justify-around items-center">
            {menuItems.map((item, index) => {
              // Profil için özel koşul: Kullanıcı giriş yapmışsa
              if (item.name === "Profil" && session?.user) {
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={twMerge(
                      "flex flex-col items-center text-gray-500 dark:text-gray-400 hover:text-blue-600 font-medium py-1",
                      pathname === item.href && "text-blue-600 dark:text-blue-400"
                    )}
                  >
                    <img
                      src={getProfileImage() || "/images/avatars/default.png"}
                      alt="Profil"
                      className="w-6 h-6 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                    />
                    <span className="text-xs mt-1">{item.name}</span>
                  </Link>
                );
              }
              
              // Diğer menü öğeleri için normal görünüm
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={twMerge(
                    "flex flex-col items-center text-gray-500 dark:text-gray-400 hover:text-blue-600 font-medium py-1",
                    pathname === item.href && "text-blue-600 dark:text-blue-400",
                    item.highlight &&
                      "text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                  )}
                >
                  {item.icon}
                  <span className="text-xs mt-1">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Bildirim paneli */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex justify-end md:justify-center items-start pt-16 md:pt-20 bg-black bg-opacity-50">
          {/* Bildirim paneli içeriği */}
        </div>
      )}
    </nav>
  );
};

export default Navbar; 
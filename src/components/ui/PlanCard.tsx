"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { FaCalendarAlt, FaMapMarkerAlt, FaHeart, FaRegHeart, FaBookmark, FaRegBookmark, FaUsers, FaImage, FaUser } from "react-icons/fa";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

import { likePlan, savePlan } from "@/services/planService";

interface CreatorInfo {
  _id?: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  image?: string;
  googleProfilePicture?: string;
  name?: string;
  email?: string;
}

interface PlanCardProps {
  id: string;
  title: string;
  description: string;
  date: Date;
  location: string;
  imageUrl?: string;
  creator?: CreatorInfo;
  isOnline?: boolean;
  isFree?: boolean;
  price?: number;
  maxParticipants?: number;
  participantCount?: number;
  likes?: number;
  saves?: number;
  onLike?: (id: string) => void;
  onSave?: (id: string) => void;
  onClick?: () => void;
  onJoin?: (id: string) => void;
  isJoined?: boolean;
  showActions?: boolean;
  plan: any;
  refreshPlans?: () => void;
}

const PlanCard = ({
  id,
  title,
  description,
  date,
  location,
  imageUrl,
  creator,
  isOnline = false,
  isFree = true,
  price = 0,
  maxParticipants,
  participantCount = 0,
  likes = 0,
  saves = 0,
  onLike,
  onSave,
  onClick,
  onJoin,
  isJoined = false,
  showActions = true,
  plan,
  refreshPlans,
}: PlanCardProps) => {
  // Görüntü hatası durumunu izleme
  const [imgError, setImgError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [joining, setJoining] = useState(false);
  const [userLiked, setUserLiked] = useState(false);
  const [userSaved, setUserSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);
  const [saveCount, setSaveCount] = useState(saves);
  const [liking, setLiking] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Creator bilgileri için değerler
  const creatorName = useMemo(() => {
    if (!creator) return "Kullanıcı";
    
    if (creator.firstName && creator.lastName) {
      return `${creator.firstName} ${creator.lastName}`;
    }
    
    if (creator.name) {
      return creator.name;
    }
    
    if (creator.firstName) {
      return creator.firstName;
    }
    
    if (creator.email && creator.email.includes('@')) {
      // E-posta adresinden kullanıcı adı oluştur - @ öncesini al
      return creator.email.split('@')[0];
    }
    
    if (creator.username) {
      return creator.username;
    }
    
    return "Kullanıcı";
  }, [creator]);
  
  const creatorUsername = useMemo(() => {
    if (!creator || !creator.username) return "";
    return `@${creator.username}`;
  }, [creator]);
  
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const isOwner = userId && creator && (
    creator._id === userId || 
    (typeof creator === 'object' && creator._id && userId === creator._id.toString()) ||
    (typeof creator === 'string' && userId === creator)
  );
  const router = useRouter();
  
  // API isteklerini optimize ediyoruz
  const checkUserInteractions = useCallback(async () => {
    try {
      const response = await fetch(`/api/plans/${id}`);
      if (response.ok) {
        const plan = await response.json();
        
        // Google ID ile beğeni kontrolü - string karşılaştırma
        const userLiked = plan.likes?.some((likeId: any) => {
          // String ID'ler
          if (likeId === userId) return true;
          // ObjectId'ler
          if (typeof likeId === 'object' && likeId?._id) {
            return likeId._id === userId;
          }
          // toString kullanılabiliyorsa
          if (likeId && likeId.toString && likeId.toString() === userId) {
            return true;
          }
          return false;
        });
        
        // Google ID ile kaydetme kontrolü - string karşılaştırma
        const userSaved = plan.saves?.some((saveId: any) => {
          // String ID'ler
          if (saveId === userId) return true;
          // ObjectId'ler
          if (typeof saveId === 'object' && saveId?._id) {
            return saveId._id === userId;
          }
          // toString kullanılabiliyorsa
          if (saveId && saveId.toString && saveId.toString() === userId) {
            return true;
          }
          return false;
        });
        
        setUserLiked(userLiked);
        setUserSaved(userSaved);
        setLikeCount(plan.likes?.length || 0);
        setSaveCount(plan.saves?.length || 0);
      }
    } catch (error) {
      // Sessiz hata yönetimi - API hatasını kullanıcıya bildirmiyoruz
    }
  }, [id, userId]);
  
  // Kullanıcının beğeni ve kaydetme durumunu kontrol et
  useEffect(() => {
    if (userId) {
      checkUserInteractions();
    }
  }, [userId, checkUserInteractions]);
  
  // Plan görüntüsü yüklenirken hata olursa
  const handleImageError = () => {
    setImgError(true);
  };

  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setAvatarError(true);
    e.currentTarget.src = "/images/avatars/default.png";
    
    // 5 saniye sonra tekrar yüklemeyi dene
    setTimeout(() => {
      setAvatarError(false);
    }, 5000);
  };

  const handleClickDetails = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) onClick();
    else router.push(`/plan/${id}`);
  };

  // Katılma fonksiyonu
  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!userId) {
      toast.error("Katılmak için giriş yapmalısınız");
      return;
    }
    
    if (isJoined) {
      // Zaten katıldıysa, doğrudan plan odasına git
      router.push(`/plan/${id}`);
      return;
    }
    
    try {
      setJoining(true);
      
      if (onJoin) {
        onJoin(id);
        router.push(`/plan/${id}`);
      } else {
        // Varsayılan olarak API çağrısı yap
        const response = await fetch(`/api/plans/${id}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId
          }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Plana katılırken bir hata oluştu');
        }
        
        toast.success('Plana başarıyla katıldınız!');
        
        // Katıldıktan sonra plan odasına yönlendir
        router.push(`/plan/${id}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Plana katılırken bir hata oluştu');
    } finally {
      setJoining(false);
    }
  };

  // Beğenme işlevi
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) {
      toast.error("Beğenmek için giriş yapmalısınız");
      return;
    }
    
    try {
      setLiking(true);
      
      // Optimistik UI güncelleme
      setUserLiked(!userLiked);
      setLikeCount(prev => userLiked ? prev - 1 : prev + 1);
      
      await likePlan(id);
      
      if (onLike) onLike(id);
      
    } catch (error: any) {
      toast.error(error.message || "Beğeni işlemi başarısız oldu");
    } finally {
      setLiking(false);
    }
  };
  
  // Kaydetme işlevi
  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) {
      toast.error("Kaydetmek için giriş yapmalısınız");
      return;
    }
    
    try {
      setSaving(true);
      
      // Optimistik UI güncelleme
      setUserSaved(!userSaved);
      setSaveCount(prev => userSaved ? prev - 1 : prev + 1);
      
      await savePlan(id);
      
      if (onSave) onSave(id);
      
    } catch (error: any) {
      toast.error(error.message || "Kaydetme işlemi başarısız oldu");
    } finally {
      setSaving(false);
    }
  };

  // Profil resmi için güvenli kontrol
  const getCreatorImage = (creator: CreatorInfo | null | undefined) => {
    if (!creator) return "/images/avatars/default.png";
    
    // NextAuth image özelliği
    if (creator.image) return creator.image;
    
    // Profil resmi varsa
    if (creator.profilePicture) return creator.profilePicture;
    
    // Google profil resmi
    if (creator.googleProfilePicture) return creator.googleProfilePicture;
    
    // Gravatar veya varsayılan
    if (creator.email) {
      // Gravatar URL'sini oluştur
      const emailHash = creator.email.trim().toLowerCase();
      return `https://www.gravatar.com/avatar/${emailHash}?d=mp&s=200`;
    }
    
    return "/images/avatars/default.png";
  };

  // Avatar URL'sini al ve hata durumlarını yönet
  const getAvatarUrl = () => {
    if (avatarError) return "/images/avatars/default.png";
    return getCreatorImage(creator);
  };

  // Özel tarih formatı
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "d MMMM", { locale: tr });
    } catch (error) {
      return "Tarih bilgisi yok";
    }
  };

  // Saat formatı
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "HH:mm", { locale: tr });
    } catch (error) {
      return "--:--";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg">
      <Link href={`/plan/${id}`}>
        <div className="relative h-40 w-full">
          {(!imageUrl || imgError) ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
              <span className="text-gray-400 dark:text-gray-500 text-lg">Görsel yok</span>
            </div>
          ) : (
            <Image
              src={imageUrl}
              alt={title}
              layout="fill"
              objectFit="cover"
              onError={handleImageError}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-center mb-3">
          {/* Plan Oluşturan Bilgisi */}
          {creator && (
            <div className="flex items-center mr-auto">
              <div className="relative w-8 h-8 overflow-hidden rounded-full mr-2">
                <Image
                  src={getAvatarUrl()}
                  alt={creatorName}
                  layout="fill"
                  objectFit="cover"
                  className="rounded-full"
                  onError={handleAvatarError}
                />
              </div>
              <Link href={`/${creator.username}`} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                {creatorName}
              </Link>
            </div>
          )}
          
          <div className="flex space-x-2">
            <button 
              onClick={handleLike} 
              className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-500"
            >
              {userLiked ? (
                <FaHeart className="text-red-500" />
              ) : (
                <FaRegHeart />
              )}
              <span className="text-xs">{likeCount > 0 ? likeCount : ''}</span>
            </button>
            
            <button
              onClick={handleSave}
              className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-500"
            >
              {userSaved ? (
                <FaBookmark className="text-blue-500" />
              ) : (
                <FaRegBookmark />
              )}
            </button>
          </div>
        </div>

        <Link href={`/plan/${id}`}>
          <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {title}
          </h3>
        </Link>

        <div className="flex flex-wrap gap-2 mb-3">
          <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
            <FaCalendarAlt className="mr-1 text-xs" />
            <span>{formatDate(date.toISOString())} · {formatTime(date.toISOString())}</span>
          </div>
          
          {location && (
            <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
              <FaMapMarkerAlt className="mr-1 text-xs" />
              <span>{isOnline ? "Online Plan" : location}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center">
            <FaUsers className="text-gray-500 dark:text-gray-400 mr-1 text-sm" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {participantCount}/{maxParticipants} katılımcı
            </span>
          </div>
          
          <Link
            href={`/plan/${id}`}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Detaylar
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PlanCard; 
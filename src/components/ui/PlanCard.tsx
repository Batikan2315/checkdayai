"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { FaCalendarAlt, FaMapMarkerAlt, FaHeart, FaRegHeart, FaBookmark, FaRegBookmark, FaUsers, FaImage } from "react-icons/fa";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
    
    if (creator.firstName) {
      return creator.firstName;
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
      
      const response = await fetch(`/api/plans/${id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action: userLiked ? 'unlike' : 'like'
        }),
      });
      
      if (!response.ok) {
        // Hata durumunda geri al
        setUserLiked(!userLiked);
        setLikeCount(prev => userLiked ? prev + 1 : prev - 1);
        const error = await response.json();
        throw new Error(error.error || "İşlem sırasında bir hata oluştu");
      }
      
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
      
      const response = await fetch(`/api/plans/${id}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action: userSaved ? 'unsave' : 'save'
        }),
      });
      
      if (!response.ok) {
        // Hata durumunda geri al
        setUserSaved(!userSaved);
        setSaveCount(prev => userSaved ? prev + 1 : prev - 1);
        const error = await response.json();
        throw new Error(error.error || "İşlem sırasında bir hata oluştu");
      }
      
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

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer">
      <div onClick={handleClickDetails} className="relative">
        {/* Plan Resmi */}
        <div className="relative h-48 w-full overflow-hidden bg-gray-100">
          {imageUrl && !imgError ? (
            <Image 
              src={imageUrl}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
              className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
              onError={handleImageError}
            />
          ) : (
            <div className="flex items-center justify-center h-full w-full bg-gradient-to-r from-blue-50 to-indigo-50">
              <FaImage className="h-16 w-16 text-gray-300" aria-hidden="true" />
            </div>
          )}
          
          {/* Kategoriler ve Fiyat - Resim üzerinde */}
          <div className="absolute bottom-0 right-0 left-0 flex justify-between items-center p-2 bg-gradient-to-t from-gray-900/70 to-transparent">
            <div className="flex gap-1">
              {isOnline && (
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
                  Online
                </span>
              )}
              {maxParticipants && (
                <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-0.5 rounded flex items-center">
                  <FaUsers className="mr-1 text-xs" aria-hidden="true" />
                  <span>{participantCount}/{maxParticipants}</span>
                </span>
              )}
            </div>
            <div>
              {isFree ? (
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                  Ücretsiz
                </span>
              ) : (
                <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded">
                  {formatCurrency(price)}
                </span>
              )}
            </div>
          </div>
        </div>
      
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div 
              className="flex items-center gap-2" 
              onClick={(e) => {
                e.stopPropagation();
                if (creator?.username) {
                  router.push(`/@${creator.username}`);
                }
              }}
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-300">
                <Image
                  src={getAvatarUrl()}
                  alt={creatorName}
                  fill
                  sizes="32px"
                  className="object-cover"
                  onError={handleAvatarError}
                />
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900">{creatorName}</p>
                {creatorUsername && (
                  <span 
                    className="text-xs text-gray-500 hover:text-blue-500 hover:underline cursor-pointer" 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (creator?.username) {
                        router.push(`/@${creator.username}`);
                      }
                    }}
                  >
                    {creatorUsername}
                  </span>
                )}
              </div>
            </div>
            {isOwner && (
              <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                Lider
              </span>
            )}
          </div>

          <h3 className="font-bold text-xl mb-2 text-gray-900 line-clamp-2">{title}</h3>
          <p className="text-gray-700 mb-4 text-sm line-clamp-2">{description}</p>

          <div className="flex items-center justify-between text-gray-500 text-sm">
            <div className="flex items-center gap-1">
              <FaCalendarAlt className="text-blue-500" aria-hidden="true" />
              <span>{formatDate(date.toISOString())}</span>
            </div>
            <div className="flex items-center gap-1">
              <FaMapMarkerAlt className="text-green-500" aria-hidden="true" />
              <span className="truncate max-w-[120px]">{isOnline ? "Online Plan" : location}</span>
            </div>
          </div>
        </div>
      </div>
      
      {showActions && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleLike}
                disabled={liking}
                className="flex items-center text-gray-500 hover:text-red-500 transition-colors"
                aria-label={userLiked ? "Beğeniyi kaldır" : "Beğen"}
                aria-pressed={userLiked}
              >
                {userLiked ? <FaHeart className="text-red-500" aria-hidden="true" /> : <FaRegHeart aria-hidden="true" />}
                <span className="ml-1 text-xs">{likeCount > 0 ? likeCount : ''}</span>
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center text-gray-500 hover:text-blue-500 transition-colors"
                aria-label={userSaved ? "Kaydetmeyi kaldır" : "Kaydet"}
                aria-pressed={userSaved}
              >
                {userSaved ? <FaBookmark className="text-blue-500" aria-hidden="true" /> : <FaRegBookmark aria-hidden="true" />}
                <span className="ml-1 text-xs">{saveCount > 0 ? saveCount : ''}</span>
              </button>
            </div>
            <button
              onClick={handleJoin}
              disabled={joining}
              className={`py-1 px-3 rounded-full text-sm font-medium transition-colors ${
                isJoined || isOwner 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
              aria-label={isJoined || isOwner ? "Plana Git" : "Katıl"}
            >
              {joining ? 'Katılıyor...' : isJoined || isOwner ? 'Plana Git' : 'Katıl'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanCard; 
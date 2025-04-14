import React, { useState, useEffect, useMemo } from "react";
import { Card, CardBody, CardHeader } from "./Card";
import Button from "./Button";
import { FaCalendarAlt, FaMapMarkerAlt, FaHeart, FaRegHeart, FaBookmark, FaRegBookmark, FaShare, FaUsers, FaImage, FaUser } from "react-icons/fa";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface CreatorInfo {
  _id?: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
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
  onShare?: (id: string) => void;
  onClick?: () => void;
  onJoin?: (id: string) => void;
  isJoined?: boolean;
}

export default function PlanCard({
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
  onShare,
  onClick,
  onJoin,
  isJoined = false,
}: PlanCardProps) {
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
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Creator bilgilerini güvenli bir şekilde işle
  const creatorName = useMemo(() => {
    if (!creator) return 'Anonim';
    
    if (creator.firstName && creator.lastName) {
      return `${creator.firstName} ${creator.lastName}`;
    }
    
    if (creator.username) {
      return `@${creator.username}`;
    }
    
    return 'Anonim Kullanıcı';
  }, [creator]);
  
  const creatorUsername = useMemo(() => {
    if (!creator || !creator.username) return '';
    return `@${creator.username}`;
  }, [creator]);
  
  const creatorAvatar = useMemo(() => {
    if (!creator) return "/images/avatars/default.png";
    
    // Profil resmi varsa ve hata yoksa kullan
    if (creator.profilePicture && !avatarError) {
      return `${creator.profilePicture}?t=${new Date().getTime()}`;
    }
    
    return "/images/avatars/default.png";
  }, [creator, avatarError]);
  
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const isOwner = userId && creator && (
    creator._id === userId || 
    (typeof creator === 'object' && creator._id && userId === creator._id) ||
    (typeof creator === 'string' && userId === creator)
  );
  const router = useRouter();
  
  // Kullanıcının beğeni ve kaydetme durumunu kontrol et
  useEffect(() => {
    if (userId) {
      checkUserInteractions();
    }
  }, [userId, id]);
  
  const checkUserInteractions = async () => {
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
      console.error("Plan etkileşimlerini kontrol ederken hata:", error);
    }
  };
  
  // Plan görüntüsü yüklenirken hata olursa
  const handleImageError = () => {
    console.error("Plan resmi yüklenemedi, plan ID:", id);
    setImgError(true);
    console.log("Plan resmi yüklenemedi, varsayılan resim gösteriliyor");
  };

  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error("Profil resmi yüklenemedi, creator ID:", creator?._id);
    setAvatarError(true);
    console.log("Avatar yüklenemedi, varsayılan avatar gösteriliyor");
    e.currentTarget.src = "/images/avatars/default.png";
  };

  const handleClickDetails = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) onClick();
    else router.push(`/plan/${id}`);
  };

  // Varsayılan katılma fonksiyonu
  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!userId) {
      toast.error("Katılmak için giriş yapmalısınız");
      return;
    }
    
    if (isJoined) return;
    
    try {
      setJoining(true);
      
      if (onJoin) {
        onJoin(id);
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
        
        // Sayfayı yenile veya durum güncelle
        window.location.reload();
      }
    } catch (error: any) {
      toast.error(error.message || 'Plana katılırken bir hata oluştu');
      console.error('Katılma hatası:', error);
    } finally {
      setJoining(false);
    }
  };

  // Plan Odasına gitme işlevi
  const handleGoToRoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/plan/${id}`);
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

  return (
    <div className="cursor-pointer h-full">
      <Card className="overflow-hidden h-full flex flex-col hover:shadow-lg transition-shadow duration-300">
        <div onClick={handleClickDetails} className="flex flex-col h-full">
          <CardHeader className="p-0">
            {/* Creator bilgisi - Instagram benzeri başlık */}
            <div className="px-3 py-2 flex items-center border-b border-gray-100">
              <div className="w-8 h-8 rounded-full overflow-hidden mr-2 bg-gray-200 flex-shrink-0">
                <img 
                  src={creatorAvatar}
                  alt={creator?.username || 'Kullanıcı'}
                  className="w-full h-full object-cover"
                  onError={handleAvatarError}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (creator?.username) {
                      router.push(`/@${creator.username}`);
                    }
                  }}
                  style={{ cursor: creator?.username ? 'pointer' : 'default' }}
                />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-sm text-gray-900 dark:text-white">
                  {creatorName}
                </span>
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
              {isOwner && (
                <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">
                  Lider
                </span>
              )}
            </div>
            
            {/* Plan görüntüsü - Optimize boyut */}
            <div 
              className="relative h-40 w-full overflow-hidden cursor-pointer" 
              onClick={handleClickDetails}
            >
              {imageUrl && !imgError ? (
                <img
                  src={imageUrl}
                  alt={title}
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  onError={handleImageError}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-200">
                  <FaImage className="h-10 w-10 text-gray-400" />
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardBody className="p-4 flex-grow flex flex-col">
            {/* Plan bilgileri */}
            <div onClick={handleClickDetails} className="cursor-pointer mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">{title}</h3>
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">{description}</p>
              
              <div className="space-y-1 text-xs text-gray-500">
                <div className="flex items-center">
                  <FaCalendarAlt className="mr-1 h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{formatDate(date)}</span>
                </div>
                
                <div className="flex items-center">
                  <FaMapMarkerAlt className="mr-1 h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{isOnline ? "Online Plan" : location}</span>
                </div>
                
                <div className="flex items-center">
                  <FaUsers className="mr-1 h-3 w-3 flex-shrink-0" />
                  <span>{participantCount || 0} katılımcı {maxParticipants && maxParticipants > 0 ? `/ ${maxParticipants}` : ''}</span>
                </div>
              </div>
            </div>
            
            {/* Fiyat bilgisi ve katılma butonu */}
            <div className="flex justify-between items-center mb-2">
              <div>
                {isFree ? (
                  <span className="text-xs text-green-600 font-medium">Ücretsiz</span>
                ) : (
                  <span className="text-xs text-primary font-medium">{formatCurrency(price)}</span>
                )}
              </div>
              
              {/* Katıl/Katıldınız veya Plan Odası butonu */}
              <div className="mt-auto pt-4">
                {isOwner ? (
                  <Button 
                    variant="primary" 
                    className="w-full" 
                    onClick={handleGoToRoom}
                  >
                    Plan Odası
                  </Button>
                ) : (
                  <Button 
                    variant="primary" 
                    className="w-full" 
                    onClick={handleJoin} 
                    disabled={isJoined || joining}
                  >
                    {isJoined ? "Katıldınız" : joining ? "İşlem yapılıyor..." : "Katıl"}
                  </Button>
                )}
              </div>
            </div>
            
            {/* Instagram benzeri buton düzeni */}
            <div className="border-t pt-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={handleLike}
                    disabled={liking}
                    className={`${userLiked ? 'text-red-500' : 'text-gray-500'} hover:text-red-500 flex items-center`}
                    aria-label="Beğen"
                  >
                    {userLiked ? (
                      <FaHeart className="h-5 w-5 mr-1" />
                    ) : (
                      <FaRegHeart className="h-5 w-5 mr-1" />
                    )}
                    <span className="text-xs">{likeCount}</span>
                  </button>
                  
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className={`${userSaved ? 'text-blue-500' : 'text-gray-500'} hover:text-blue-500`}
                    aria-label="Kaydet"
                  >
                    {userSaved ? (
                      <FaBookmark className="h-5 w-5" />
                    ) : (
                      <FaRegBookmark className="h-5 w-5" />
                    )}
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      // URL'yi panoya kopyala
                      const shareUrl = `${window.location.origin}/plan/${id}`;
                      navigator.clipboard.writeText(shareUrl)
                        .then(() => toast.success('Paylaşım bağlantısı kopyalandı'))
                        .catch(() => toast.error('Bağlantı kopyalanırken hata oluştu'));
                    }}
                    className="text-gray-500 hover:text-blue-500"
                    aria-label="Paylaş"
                  >
                    <FaShare className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </CardBody>
        </div>
      </Card>
    </div>
  );
} 
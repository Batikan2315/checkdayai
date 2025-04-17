"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Button from "@/components/ui/Button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/Card";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import { 
  FaPencilAlt, 
  FaUsers, 
  FaComment, 
  FaTrash, 
  FaInfoCircle, 
  FaCalendarAlt, 
  FaClock, 
  FaHourglassHalf, 
  FaMapMarkerAlt, 
  FaLink, 
  FaExclamationTriangle,
  FaHeart,
  FaRegHeart,
  FaBookmark,
  FaRegBookmark,
  FaShare,
  FaEdit,
  FaTimes,
  FaImage
} from "react-icons/fa";
import { BsCalendar } from "react-icons/bs";
import { PlanActions } from "@/components/PlanActions";

// Varsayılan profil resmi için güvenli yol
const DEFAULT_AVATAR = "/images/avatars/default.png";

export default function PlanDetail() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { data: session } = useSession();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [liking, setLiking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showContent, setShowContent] = useState(false);
  
  // Kullanıcı kimliği
  const userId = session?.user?.id || null;

  useEffect(() => {
    // API'den plan detaylarını getir
    const fetchPlan = async () => {
      try {
        // Session kontrolü - gereksiz API çağrılarını önle
        if (typeof window !== 'undefined') {
          const lastFetchTime = localStorage.getItem(`planDetail_${id}_lastFetch`);
          const currentTime = Date.now();
          
          // Son istekten beri 30 saniye geçmediyse ve önbellekte veri varsa tekrar istek atma
          if (lastFetchTime && currentTime - parseInt(lastFetchTime) < 30000) {
            const cachedPlan = localStorage.getItem(`planDetail_${id}`);
            if (cachedPlan) {
              try {
                const parsedPlan = JSON.parse(cachedPlan);
                console.log('Önbellekten plan detayları kullanılıyor');
                setPlan(parsedPlan);
                
                // Kullanıcının beğeni ve kaydetme durumunu kontrol et
                if (userId) {
                  setLiked(parsedPlan.likes?.includes(userId));
                  setSaved(parsedPlan.saves?.includes(userId));
                }
                
                setLoading(false);
                return;
              } catch (e) {
                console.error('Önbellekten plan işlenirken hata:', e);
                // Önbelleği temizle ve devam et
                localStorage.removeItem(`planDetail_${id}`);
              }
            }
          }
        }
        
        const response = await fetch(`/api/plans/${id}`);
        
        if (!response.ok) {
          throw new Error('Plan detayları getirilemedi');
        }
        
        const data = await response.json();
        console.log("Plan detayları:", data);
        
        // Önbelleğe kaydet
        if (typeof window !== 'undefined') {
          localStorage.setItem(`planDetail_${id}`, JSON.stringify(data));
          localStorage.setItem(`planDetail_${id}_lastFetch`, Date.now().toString());
        }
        
        setPlan(data);
        
        // Kullanıcının beğeni ve kaydetme durumunu kontrol et
        if (userId) {
          setLiked(data.likes?.includes(userId));
          setSaved(data.saves?.includes(userId));
        }
        
        // Kullanıcı katılım durumunu kontrol et
        if (session?.user?.id) {
          const isJoined = data.participants?.some(
            (p: any) => 
              p?._id?.toString() === session.user.id || 
              p?.toString() === session.user.id
          );
          setShowContent(isJoined);
          
          // Plan oluşturucusu veya katılımcıysa içeriği göster
          if (isJoined || data.creator?._id === session.user.id) {
            setShowContent(true);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Plan yüklenirken hata:", error);
        setLoading(false);
      }
    };

    fetchPlan();
  }, [id, userId, session?.user?.id, router]);

  const handleJoin = async () => {
    if (!userId) {
      toast.error('Katılmak için giriş yapmalısınız');
      return;
    }
    
    try {
      setJoining(true);
      
      // API'ye katılma isteği gönder
      const response = await fetch(`/api/plans/${id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Plana katılırken bir hata oluştu');
      }
      
      toast.success('Plana başarıyla katıldınız!');
      
      // Planı güncelle
      const updatedPlan = await fetch(`/api/plans/${id}`).then(res => res.json());
      setPlan(updatedPlan);
      
    } catch (error: any) {
      toast.error(error.message || 'Plana katılırken bir hata oluştu');
      console.error('Katılma hatası:', error);
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!userId) {
      toast.error('Ayrılmak için giriş yapmalısınız');
      return;
    }
    
    if (!confirm('Plandan ayrılmak istediğinize emin misiniz?')) {
      return;
    }
    
    try {
      setLeaving(true);
      
      // API'ye ayrılma isteği gönder
      const response = await fetch(`/api/plans/${id}/participate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          action: 'leave'
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Plandan ayrılırken bir hata oluştu');
      }
      
      toast.success('Plandan ayrıldınız');
      
      // Planı güncelle
      const updatedPlan = await fetch(`/api/plans/${id}`).then(res => res.json());
      setPlan(updatedPlan);
      
    } catch (error: any) {
      toast.error(error.message || 'Plandan ayrılırken bir hata oluştu');
      console.error('Ayrılma hatası:', error);
    } finally {
      setLeaving(false);
    }
  };

  const handleLike = async () => {
    if (!userId) {
      toast.error('Beğenmek için giriş yapmalısınız');
      return;
    }
    
    try {
      setLiking(true);
      
      // API'ye beğenme isteği gönder
      const response = await fetch(`/api/plans/${id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          action: liked ? 'unlike' : 'like'
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'İşlem sırasında bir hata oluştu');
      }
      
      const updatedPlan = await fetch(`/api/plans/${id}`).then(res => res.json());
      setPlan(updatedPlan);
      setLiked(!liked);
      
    } catch (error: any) {
      toast.error(error.message || 'İşlem sırasında bir hata oluştu');
      console.error('Beğenme hatası:', error);
    } finally {
      setLiking(false);
    }
  };

  const handleSave = async () => {
    if (!userId) {
      toast.error('Kaydetmek için giriş yapmalısınız');
      return;
    }
    
    try {
      setSaving(true);
      
      // API'ye kaydetme isteği gönder
      const response = await fetch(`/api/plans/${id}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          action: saved ? 'unsave' : 'save'
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'İşlem sırasında bir hata oluştu');
      }
      
      const updatedPlan = await fetch(`/api/plans/${id}`).then(res => res.json());
      setPlan(updatedPlan);
      setSaved(!saved);
      
    } catch (error: any) {
      toast.error(error.message || 'İşlem sırasında bir hata oluştu');
      console.error('Kaydetme hatası:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleShare = () => {
    // Paylaşım URL'sini oluştur
    const shareUrl = window.location.href;
    
    // Tarayıcı paylaşım API'sini kontrol et
    if (navigator.share) {
      navigator.share({
        title: plan?.title || 'CheckDay Planı',
        text: plan?.description?.substring(0, 100) + '...' || 'CheckDay planına göz at!',
        url: shareUrl,
      })
      .then(() => console.log('Başarıyla paylaşıldı'))
      .catch((error) => console.error('Paylaşım hatası:', error));
    } else {
      // Fallback: URL'yi panoya kopyala
      navigator.clipboard.writeText(shareUrl)
        .then(() => toast.success('Plan bağlantısı panoya kopyalandı'))
        .catch(() => toast.error('Bağlantı kopyalanamadı'));
    }
  };

  const handleAddToCalendar = () => {
    // TODO: Google/Apple Calendar entegrasyonu
    alert('Takvim entegrasyonu yakında eklenecek!');
  };

  const handleEditPlan = () => {
    router.push(`/plan/${id}/edit`);
  };
  
  const handleDeletePlan = async () => {
    if (!confirm('Bu planı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/plans/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Plan silinirken bir hata oluştu');
      }
      
      toast.success('Plan başarıyla silindi');
      router.push('/plans');
      
    } catch (error: any) {
      toast.error(error.message || 'Plan silinirken bir hata oluştu');
      console.error('Plan silme hatası:', error);
    }
  };

  const handleAddLeader = () => {
    // TODO: Lider ekleme modalı
    alert('Lider ekleme özelliği yakında eklenecek!');
  };

  // Kullanıcının bu plana katılmış olup olmadığını kontrol et
  const isUserJoined = useMemo(() => {
    if (!plan || !userId) return false;
    
    // Eğer kullanıcı plana katılmışsa veya planın yaratıcısıysa
    const isCreator = plan.creator ? (plan.creator?._id === userId || plan.creator === userId) : false;
    const isParticipant = plan.participants ? plan.participants.some((p: any) => 
      (p?.id === userId || p === userId || (typeof p === 'object' && p?._id === userId))
    ) : false;
    
    return isCreator || isParticipant;
  }, [plan, userId]);
  
  // Kullanıcının plan lideri olup olmadığını kontrol et
  const isLeader = userId && plan?.leaders ? plan.leaders.some((leader: any) => {
    if (!leader) return false;
    if (typeof leader === 'object') {
      return leader._id === userId;
    }
    return leader === userId;
  }) : false;
  
  // Kullanıcının düzenleme yetkisi var mı (oluşturucu veya lider)
  const canEdit = isUserJoined || isLeader;
  
  // Plan saatinin geçip geçmediğini kontrol et
  const isPlanPast = plan && plan.endDate ? new Date(plan.endDate) < new Date() : false;
  
  // Kullanıcının plana katılıp katılmadığını veya planın sahibi olup olmadığını kontrol et
  const showJoinButton = !isUserJoined && !canEdit && !isPlanPast;
  const showLeaveButton = isUserJoined && !canEdit && !isPlanPast;
  
  // Liderler bilgilerini gösterme
  const renderLeadersInfo = useMemo(() => {
    if (!plan || !plan.leaders || !Array.isArray(plan.leaders) || plan.leaders.length === 0) return null;
    
    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Liderler</h2>
          {canEdit && (
            <button 
              onClick={handleAddLeader}
              className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600"
              aria-label="Lider Ekle"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {plan.leaders.map((leader: any, index: number) => {
            let leaderName = 'Anonim';
            let leaderAvatar = '/images/avatars/default.png';
            let leaderUsername = '';
            
            if (typeof leader === 'object') {
              if (leader.firstName && leader.lastName) {
                leaderName = `${leader.firstName} ${leader.lastName}`;
              } else if (leader.username) {
                leaderName = `@${leader.username}`;
              }
              
              leaderUsername = leader.username || '';
              
              if (leader.profilePicture) {
                leaderAvatar = leader.profilePicture;
              }
            }
            
            return (
              <div key={index} className="flex items-center">
                <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                  <img 
                    src={leaderAvatar} 
                    alt={leaderName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/avatars/default.png';
                    }}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm">{leaderName}</span>
                  {leaderUsername && (
                    <a 
                      href={`/@${leaderUsername}`} 
                      className="text-xs text-blue-500 hover:underline"
                    >
                      @{leaderUsername}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [plan, canEdit]);

  // Süre hesaplama fonksiyonu
  const calculateDuration = (start: Date | string | null | undefined, end: Date | string | null | undefined) => {
    if (!start || !end) return "Belirtilmemiş";
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // Geçerli tarihler mi kontrol et
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return "Belirtilmemiş";
    }
    
    const diffInMs = endDate.getTime() - startDate.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return `${Math.round(diffInHours)} saat`;
    } else {
      const diffInDays = diffInHours / 24;
      return `${Math.round(diffInDays)} gün`;
    }
  };

  // Bitiş tarihine kalan gün sayısını hesapla
  const calculateCountdown = (endDate: string | Date) => {
    if (!endDate) return 0;
    
    const now = new Date();
    const end = new Date(endDate);
    
    // Geçersiz tarih kontrolü
    if (isNaN(end.getTime())) return 0;
    
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Kullanıcı plan detaylarını görüntülemek istiyor
  useEffect(() => {
    if (!loading && plan && !isUserJoined && !isLeader) {
      // Kullanıcı plana katılmamışsa katılması için bir uyarı göster
      toast.custom((t) => (
        <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5">
          <div className="flex-1 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <FaExclamationTriangle className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Bu plana henüz katılmadınız
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Plan detaylarını tam olarak görüntülemek için katılmanız önerilir.
                </p>
              </div>
            </div>
          </div>
          <div className="border-l border-gray-200 dark:border-gray-700">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
            >
              Tamam
            </button>
          </div>
        </div>
      ));
    }
  }, [loading, plan, isUserJoined, isLeader]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <FaInfoCircle className="text-red-500 text-5xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Plan Bulunamadı</h1>
          <p className="text-gray-600 mb-6">Aradığınız plan silinmiş olabilir veya erişim izniniz olmayabilir.</p>
          <Button onClick={() => router.push('/plans')}>
            Tüm Planları Görüntüle
          </Button>
        </div>
      </div>
    );
  }
  
  // Kullanıcı plana katılmamışsa ve planın oluşturucusu değilse
  if (!showContent && session?.user?.id) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card>
          <CardBody className="text-center py-10">
            <h2 className="text-xl font-semibold mb-4">Bu planın detaylarını görmek için katılmanız gerekiyor</h2>
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              Bu plan sadece katılımcılar tarafından görüntülenebilir. Detayları görmek için plana katılın.
            </p>
            <div className="max-w-xs mx-auto">
              <PlanActions plan={plan} />
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }
  
  // Kullanıcı giriş yapmamışsa
  if (!session && !loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card>
          <CardBody className="text-center py-10">
            <h2 className="text-xl font-semibold mb-4">Bu planın detaylarını görmek için giriş yapmanız gerekiyor</h2>
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              Bu plan sadece giriş yapmış kullanıcılar tarafından görüntülenebilir.
            </p>
            <div className="max-w-xs mx-auto">
              <Button variant="primary" onClick={() => router.push('/giris')}>
                Giriş Yap
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }
  
  // Güvenli bir şekilde verilere eriş
  const planTitle = plan.title || 'İsimsiz Plan';
  const planDate = plan.startDate ? formatDate(new Date(plan.startDate)) : 'Tarih belirtilmemiş';
  const planEndDate = plan.endDate ? formatDate(new Date(plan.endDate)) : 'Tarih belirtilmemiş';
  const planTime = plan.time || 'Saat belirtilmemiş';
  const planLocation = plan.location || 'Konum belirtilmemiş';
  const planDescription = plan.description || 'Açıklama yok';
  const planCreator = plan.creator?.name || plan.creatorName || 'Bilinmeyen kullanıcı';
  const planMaxParticipants = plan.maxParticipants || 'Sınırsız';
  const planParticipants = plan.participants || [];
  const planImage = plan.image || '/images/default-plan.jpg';
  const planCategory = plan.category || 'Genel';

  const isParticipant = plan.participants?.some((participant: any) => 
    participant?._id === userId || participant === userId || 
    (typeof participant === 'object' && participant?._id === userId)
  );
  
  const isCreator = plan.creator?._id === userId || plan.creator === userId;
  
  const canEditPlan = isCreator || plan.leaders?.includes(userId);
  const hasJoined = isParticipant || isCreator;
  
  // Plan tarihleri
  const startDate = plan.startDate ? new Date(plan.startDate) : null;
  const endDate = plan.endDate ? new Date(plan.endDate) : null;
  
  // Bitiş tarihi geçmiş mi kontrol et
  const isExpired = endDate ? new Date() > endDate : false;

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Plan Başlığı ve Durum Bilgisi */}
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{planTitle}</h1>
          <div className="flex space-x-2">
            {isPlanPast && (
              <span className="bg-gray-200 text-gray-800 text-sm font-medium px-3 py-1 rounded-full">
                Tamamlandı
              </span>
            )}
            {isUserJoined && !isLeader && (
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                Katılımcı
              </span>
            )}
            {isLeader && (
              <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                Plan Lideri
              </span>
            )}
          </div>
        </div>

        {/* Plan resmi */}
        <div className="relative mb-6 overflow-hidden rounded-lg">
          {plan.imageUrl ? (
            <Image
              src={plan.imageUrl}
              alt={plan.title}
              width={800}
              height={400}
              className="h-[300px] w-full object-cover"
            />
          ) : (
            <div className="flex h-[300px] w-full items-center justify-center bg-gray-200 dark:bg-gray-800">
              <FaInfoCircle className="h-16 w-16 text-gray-400" />
            </div>
          )}
        </div>

        {/* İşlem Butonları */}
        <div className="mb-6 flex flex-wrap gap-2">
          {canEdit && (
            <Button variant="outline" onClick={handleEditPlan}>
              <FaPencilAlt className="mr-2" /> Düzenle
            </Button>
          )}

          {canEdit && (
            <Button variant="outline" onClick={handleDeletePlan}>
              <FaTrash className="mr-2" /> Sil
            </Button>
          )}

          {/* PlanActions bileşenini kullan */}
          {plan && <PlanActions plan={plan} />}

          <Button variant="outline" onClick={handleShare}>
            <FaInfoCircle className="mr-2" /> Paylaş
          </Button>

          <Button
            variant="outline"
            onClick={handleLike}
            className={`${liked ? "text-red-500" : ""}`}
          >
            {liked ? <FaHeart className="mr-2" /> : <FaRegHeart className="mr-2" />}
            {plan.likes?.length || 0}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleSave}
            className={`${saved ? "text-yellow-500" : ""}`}
          >
            {saved ? <FaBookmark className="mr-2" /> : <FaRegBookmark className="mr-2" />}
            {plan.saves?.length || 0}
          </Button>

          {/* Plan Odası Butonu - Sadece katılımcılar ve liderler görebilir */}
          {(isUserJoined || isLeader) && (
            <Button 
              variant="outline" 
              onClick={() => router.push(`/plan/${id}/room`)}
            >
              <FaComment className="mr-2" /> Plan Odası
            </Button>
          )}
        </div>

        {/* Sekme navigasyonunu kaldırıp direkt plan bilgilerini gösteriyoruz */}
        <div>
          <div className="mb-8 space-y-4">
            <h1 className="text-3xl font-bold">{plan.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center">
                <FaCalendarAlt className="mr-1 h-4 w-4" />
                <span>
                  {new Date(plan.startDate).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              
              {plan?.endDate && (
                <div className="flex items-center">
                  <FaClock className="mr-1 h-4 w-4" />
                  <span>
                    {calculateCountdown(plan.endDate) > 0 
                      ? `${calculateCountdown(plan.endDate)} gün kaldı` 
                      : 'Süre doldu'}
                  </span>
                </div>
              )}
              
              {plan.location && (
                <div className="flex items-center">
                  <FaMapMarkerAlt className="mr-1 h-4 w-4" />
                  <span>{plan.location}</span>
                </div>
              )}
              
              {plan.creator && typeof plan.creator !== 'string' && (
                <div className="flex items-center">
                  <FaUsers className="mr-1 h-4 w-4" />
                  <span>Oluşturan: {plan.creator.name}</span>
                </div>
              )}
              
              {plan.maxParticipants && (
                <div className="flex items-center">
                  <FaUsers className="mr-1 h-4 w-4" />
                  <span>
                    {plan.participants?.length || 0}/{plan.maxParticipants} Katılımcı
                  </span>
                </div>
              )}
            </div>
            
            <div className="prose dark:prose-invert max-w-none">
              <p>{plan.description}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-lg">Plan Bilgileri</h3>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="flex">
                  <FaCalendarAlt className="text-gray-500 mr-2 mt-1" />
                  <div>
                    <div className="font-medium">Tarih</div>
                    <div>{planDate}</div>
                  </div>
                </div>
                
                <div className="flex">
                  <FaClock className="text-gray-500 mr-2 mt-1" />
                  <div>
                    <div className="font-medium">Saat</div>
                    <div>{planTime}</div>
                  </div>
                </div>
                
                <div className="flex">
                  <FaHourglassHalf className="text-gray-500 mr-2 mt-1" />
                  <div>
                    <div className="font-medium">Süre</div>
                    <div>{calculateDuration(plan.startDate, plan.endDate)}</div>
                  </div>
                </div>
                
                <div className="flex">
                  <FaMapMarkerAlt className="text-gray-500 mr-2 mt-1" />
                  <div>
                    <div className="font-medium">Konum</div>
                    <div>{plan.isOnline ? "Online Plan" : planLocation}</div>
                  </div>
                </div>
                
                {plan.isOnline && plan.onlineLink && (
                  <div className="flex">
                    <FaLink className="text-gray-500 mr-2 mt-1" />
                    <div>
                      <div className="font-medium">Bağlantı</div>
                      <a 
                        href={plan.onlineLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {plan.onlineLink}
                      </a>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
            
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-lg">Organizatör</h3>
              </CardHeader>
              <CardBody>
                {plan?.creator && (
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                      <img 
                        src={plan.creator.profilePicture || DEFAULT_AVATAR} 
                        alt={plan.creator.name || 'Organizatör'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                        }}
                      />
                    </div>
                    <div>
                      <div className="font-medium">
                        {plan.creator.firstName && plan.creator.lastName 
                          ? `${plan.creator.firstName} ${plan.creator.lastName}`
                          : plan.creator.username || 'Anonim'}
                      </div>
                      {plan.creator.username && (
                        <a 
                          href={`/${plan.creator.username}`} 
                          className="text-sm text-blue-500 hover:underline"
                        >
                          @{plan.creator.username}
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {!plan?.creator && (
                  <div className="text-gray-500">Organizatör bilgisi bulunamadı</div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
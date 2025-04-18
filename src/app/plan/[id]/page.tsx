"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { FaUsers, FaCalendarAlt, FaMapMarkerAlt, FaHeart, FaRegHeart, FaBookmark, FaRegBookmark, FaShare, FaUser } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import Link from "next/link";
import PageContainer from "@/components/layout/PageContainer";
import { getPlan, joinPlan, likePlan, savePlan } from "@/services/planService";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

// Yardımcı fonksiyonlar
const sendNotification = async (data: any) => {
  console.log("Bildirim gönderildi:", data);
  return true;
};

const shareContent = (data: { title: string, text: string, url: string }) => {
  if (navigator.share) {
    navigator.share(data);
  } else {
    // Fallback: URL'i panoya kopyala
    navigator.clipboard.writeText(data.url);
    toast.success("Link panoya kopyalandı!");
  }
};

// UI bileşenleri
const Loading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

const NotFound = () => (
  <div className="flex flex-col items-center justify-center min-h-screen">
    <h1 className="text-2xl font-bold mb-4">Plan Bulunamadı</h1>
    <p className="text-gray-600 mb-6">Aradığınız plan silinmiş veya mevcut değil.</p>
    <Link 
      href="/plans" 
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      Planlara Dön
    </Link>
  </div>
);

export default function PlanPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session } = useSession();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  
  // Veriyi yükleme
  useEffect(() => {
    const loadPlan = async () => {
      try {
        setLoading(true);
        const data = await getPlan(id);
        setPlan(data);
        
        if (session?.user?.id && data) {
          // Kullanıcı planda mı?
          setIsParticipant(data?.participants?.some((p: any) => p._id === session?.user?.id));
          
          // Kullanıcı oluşturucu mu?
          setIsCreator(data.creator?._id === session?.user?.id);
          
          // Planı beğenmiş mi?
          setHasLiked(data.likes?.some((like: any) => like.userId === session?.user?.id));
          
          // Planı kaydetmiş mi?
          setHasSaved(data.saves?.some((save: any) => save.userId === session?.user?.id));
        }
        
        setLoading(false);
      } catch (e) {
        console.error("Plan yüklenirken hata:", e);
        setError(e);
        setLoading(false);
      }
    };
    
    if (id) {
      loadPlan();
    }
  }, [id, session]);
  
  // Tarih formatı
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "d MMMM yyyy", { locale: tr });
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
  
  // Kullanıcı katılabilir mi?
  const canJoin = !isParticipant && !isCreator && plan?.status === "active";
  
  // Katılım durumu mesajı
  const joinStatusMessage = isCreator 
    ? "Bu planın oluşturucusunuz" 
    : isParticipant 
      ? "Bu plana katıldınız" 
      : "";
  
  // Plan etkileşim işlemleri
  const handleJoinPlan = async () => {
    if (!session?.user?.id) {
      toast.error("Bu işlem için giriş yapmalısınız");
      return;
    }
    
    try {
      await joinPlan(id);
      setIsParticipant(true);
      toast.success("Plana başarıyla katıldınız!");
      
      // Bildirim gönderme (opsiyonel)
      try {
        await sendNotification({
          recipientId: plan.creator._id,
          type: "join_plan",
          content: `${session.user.name || session.user.username} planınıza katıldı`,
          link: `/plan/${plan._id}`,
          initiatorId: session.user.id
        });
      } catch (e) {
        console.error("Bildirim gönderilirken hata:", e);
      }
    } catch (e) {
      console.error("Plana katılırken hata:", e);
      toast.error("Plana katılırken bir hata oluştu");
    }
  };
  
  const handleLikePlan = async () => {
    if (!session?.user?.id) {
      toast.error("Bu işlem için giriş yapmalısınız");
      return;
    }
    
    try {
      await likePlan(id);
      setHasLiked(!hasLiked);
      setPlan(prev => ({
        ...prev,
        likes: hasLiked 
          ? prev.likes.filter((like: any) => like.userId !== session?.user?.id)
          : [...prev.likes, { userId: session?.user?.id }]
      }));
      toast.success(hasLiked ? "Beğeni kaldırıldı" : "Plan beğenildi");
    } catch (e) {
      console.error("Plan beğenilirken hata:", e);
      toast.error("İşlem sırasında bir hata oluştu");
    }
  };
  
  const handleSavePlan = async () => {
    if (!session?.user?.id) {
      toast.error("Bu işlem için giriş yapmalısınız");
      return;
    }
    
    try {
      await savePlan(id);
      setHasSaved(!hasSaved);
      setPlan(prev => ({
        ...prev,
        saves: hasSaved 
          ? prev.saves.filter((save: any) => save.userId !== session?.user?.id)
          : [...prev.saves, { userId: session?.user?.id }]
      }));
      toast.success(hasSaved ? "Plan kaydedildi" : "Plan kayıtlardan kaldırıldı");
    } catch (e) {
      console.error("Plan kaydedilirken hata:", e);
      toast.error("İşlem sırasında bir hata oluştu");
    }
  };
  
  const handleShare = () => {
    shareContent({
      title: plan.title,
      text: plan.description,
      url: window.location.href
    });
  };
  
  // Seçenek butonları render
  const renderActionButtons = () => (
    <div className="flex flex-wrap gap-3 my-4">
      {!isCreator && canJoin && (
        <button 
          onClick={handleJoinPlan}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2"
          disabled={loading}
        >
          <FaUsers /> Katıl
        </button>
      )}
      
      <button 
        onClick={handleLikePlan}
        className={`px-4 py-2 ${hasLiked ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} rounded-md focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2`}
        disabled={loading}
      >
        {hasLiked ? <FaHeart className="text-red-500" /> : <FaRegHeart />}
        {hasLiked ? 'Beğenildi' : 'Beğen'} 
        {plan?.likes?.length > 0 && <span className="text-xs">({plan.likes.length})</span>}
      </button>
      
      <button 
        onClick={handleSavePlan}
        className={`px-4 py-2 ${hasSaved ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} rounded-md focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2`}
        disabled={loading}
      >
        {hasSaved ? <FaBookmark className="text-blue-500" /> : <FaRegBookmark />}
        {hasSaved ? 'Kaydedildi' : 'Kaydet'}
      </button>
      
      <button 
        onClick={handleShare}
        className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2"
        disabled={loading}
      >
        <FaShare /> Paylaş
      </button>
    </div>
  );
  
  if (loading) {
    return <Loading />;
  }
  
  if (!plan || error) {
    return <NotFound />;
  }
  
  return (
    <PageContainer title={plan.title}>
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        {/* Görsel */}
        {plan.image && (
          <div className="relative h-60 md:h-80 w-full">
            <Image
              src={plan.image}
              alt={plan.title}
              fill
              className="object-cover"
            />
          </div>
        )}
        
        <div className="p-6">
          {/* Plan Oluşturucu Bilgisi */}
          <div className="flex items-center mb-4">
            <div className="relative w-10 h-10 rounded-full overflow-hidden mr-3 border border-gray-200">
              {plan.creator?.image ? (
                <Image
                  src={plan.creator.image}
                  alt={plan.creator.name || "Kullanıcı"}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-gray-200 dark:bg-gray-700 text-gray-500">
                  <FaUser className="w-5 h-5" />
                </div>
              )}
            </div>
            <div>
              <Link href={`/${plan.creator?.username}`} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                {plan.creator?.name || plan.creator?.username}
              </Link>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Plan Oluşturucu
              </p>
            </div>
          </div>
          
          {/* Plan Bilgileri */}
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{plan.title}</h1>
            
            <div className="flex flex-wrap gap-4 text-gray-600 dark:text-gray-300 text-sm">
              <div className="flex items-center">
                <FaCalendarAlt className="mr-2 text-blue-500" />
                <span>
                  {formatDate(plan.startDate)} · {formatTime(plan.startDate)}
                  {plan.endDate && ` - ${formatDate(plan.endDate)} · ${formatTime(plan.endDate)}`}
                </span>
              </div>
              
              {plan.location && (
                <div className="flex items-center">
                  <FaMapMarkerAlt className="mr-2 text-red-500" />
                  <span>{plan.location}</span>
                </div>
              )}
            </div>
            
            {joinStatusMessage && (
              <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-3 rounded-md text-sm">
                {joinStatusMessage}
              </div>
            )}
            
            {/* Aksiyonlar */}
            {session && renderActionButtons()}
            
            {/* Açıklama */}
            <div className="mt-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Açıklama</h2>
              <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">{plan.description}</p>
            </div>
            
            {/* Katılımcılar */}
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Katılımcılar ({(plan.participants?.length || 0) + (isCreator ? 1 : 0)})</h2>
              <div className="flex flex-wrap gap-2">
                {/* Oluşturucu */}
                {plan.creator && (
                  <Link href={`/${plan.creator.username}`} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden">
                      {plan.creator.image ? (
                        <Image
                          src={plan.creator.image}
                          alt={plan.creator.name || "Oluşturucu"}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full bg-gray-200 dark:bg-gray-700 text-gray-500">
                          <FaUser className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{plan.creator.name || plan.creator.username}</p>
                      <span className="text-xs text-blue-600 dark:text-blue-400">Oluşturucu</span>
                    </div>
                  </Link>
                )}
                
                {/* Diğer Katılımcılar */}
                {plan.participants?.map((participant: any) => (
                  <Link href={`/${participant.username}`} key={participant._id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden">
                      {participant.image ? (
                        <Image
                          src={participant.image}
                          alt={participant.name || "Katılımcı"}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full bg-gray-200 dark:bg-gray-700 text-gray-500">
                          <FaUser className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium">{participant.name || participant.username}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
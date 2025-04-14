"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Button from "@/components/ui/Button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/Card";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import { FaPencilAlt, FaUsers, FaComment, FaTrash } from "react-icons/fa";

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
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Kullanıcı kimliği
  const userId = session?.user?.id || null;

  useEffect(() => {
    // API'den plan detaylarını getir
    const fetchPlan = async () => {
      try {
        const response = await fetch(`/api/plans/${id}`);
        
        if (!response.ok) {
          throw new Error('Plan detayları getirilemedi');
        }
        
        const data = await response.json();
        console.log("Plan detayları:", data);
        setPlan(data);
        
        // Kullanıcının beğeni ve kaydetme durumunu kontrol et
        if (userId) {
          setLiked(data.likes?.includes(userId));
          setSaved(data.saves?.includes(userId));
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Plan yüklenirken hata:", error);
        setLoading(false);
      }
    };

    fetchPlan();
  }, [id, userId]);

  useEffect(() => {
    // Plan mesajlarını getir
    const fetchMessages = async () => {
      try {
        setLoadingMessages(true);
        const response = await fetch(`/api/plans/${id}/messages`);
        
        if (!response.ok) {
          // İlk kez erişiliyorsa mesaj henüz olmayabilir, bu yüzden hata gösterme
          setMessages([]);
          setLoadingMessages(false);
          return;
        }
        
        const data = await response.json();
        setMessages(data.messages || []);
        setLoadingMessages(false);
      } catch (error) {
        console.error("Mesajlar yüklenirken hata:", error);
        setLoadingMessages(false);
      }
    };

    if (id) {
      fetchMessages();
    }
  }, [id]);

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
      
      setLiked(!liked);
      toast.success(liked ? 'Beğeni kaldırıldı' : 'Plan beğenildi');
      
      // Planı güncelle
      const updatedPlan = await fetch(`/api/plans/${id}`).then(res => res.json());
      setPlan(updatedPlan);
      
    } catch (error: any) {
      toast.error(error.message || 'İşlem sırasında bir hata oluştu');
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
      
      setSaved(!saved);
      toast.success(saved ? 'Kaydedilenlerden kaldırıldı' : 'Plan kaydedildi');
      
      // Planı güncelle
      const updatedPlan = await fetch(`/api/plans/${id}`).then(res => res.json());
      setPlan(updatedPlan);
      
    } catch (error: any) {
      toast.error(error.message || 'İşlem sırasında bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = () => {
    // Paylaşım URL'i oluştur
    const shareUrl = `${window.location.origin}/plan/${id}`;
    
    // URL'i panoya kopyala
    navigator.clipboard.writeText(shareUrl)
      .then(() => toast.success('Paylaşım bağlantısı kopyalandı'))
      .catch(() => toast.error('Bağlantı kopyalanırken hata oluştu'));
  };

  const handleAddToCalendar = () => {
    // Takvime ekleme işlevi
    toast.success('Etkinlik takviminize eklendi');
  };

  const handleSendMessage = async () => {
    if (!userId) {
      toast.error('Mesaj göndermek için giriş yapmalısınız');
      return;
    }
    
    if (!newMessage.trim()) {
      toast.error('Boş mesaj gönderemezsiniz');
      return;
    }
    
    try {
      setSendingMessage(true);
      
      const response = await fetch(`/api/plans/${id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          content: newMessage.trim()
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Mesaj gönderilirken bir hata oluştu');
      }
      
      // Mesajları yenile
      const updatedMessages = await fetch(`/api/plans/${id}/messages`).then(res => res.json());
      setMessages(updatedMessages.messages || []);
      
      setNewMessage(''); // Mesaj alanını temizle
      toast.success('Mesaj gönderildi');
      
    } catch (error: any) {
      toast.error(error.message || 'Mesaj gönderilirken bir hata oluştu');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleEditPlan = () => {
    router.push(`/plan/${id}/duzenle`);
  };

  const handleDeletePlan = async () => {
    if (!userId || !isCreator) {
      toast.error('Bu işlem için yetkiniz yok');
      return;
    }
    
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
      router.push('/planlar'); // Ana sayfaya yönlendir
      
    } catch (error: any) {
      toast.error(error.message || 'Plan silinirken bir hata oluştu');
    }
  };

  const handleAddLeader = () => {
    toast.success("Lider ekleme özelliği yakında eklenecek");
  };

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
  }, [plan]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Plan bulunamadı</p>
      </div>
    );
  }

  // Kullanıcının plana zaten katılıp katılmadığını kontrol et
  const hasJoined = userId && plan.participants?.some((p: any) => 
    p._id === userId || p === userId
  );
  
  // Kullanıcının plan sahibi olup olmadığını kontrol et
  const isCreator = userId && (
    plan.creator?._id === userId || 
    plan.creator === userId || 
    plan.oauth_creator_id === userId
  );
  
  // Kullanıcının plan lideri olup olmadığını kontrol et
  const isLeader = userId && plan.leaders?.some((leader: any) => {
    if (typeof leader === 'object') {
      return leader._id === userId;
    }
    return leader === userId;
  });
  
  // Kullanıcının düzenleme yetkisi var mı (oluşturucu veya lider)
  const canEdit = isCreator || isLeader;
  
  // Plan saatinin geçip geçmediğini kontrol et
  const isPlanPast = new Date(plan.endDate) < new Date();
  
  // Kullanıcının plana katılıp katılmadığını veya planın sahibi olup olmadığını kontrol et
  const showJoinButton = !isCreator && !hasJoined && !isPlanPast;
  const showLeaveButton = hasJoined && !isCreator && !isPlanPast;
  
  return (
    <div className="container mx-auto py-8">
      <Card className="overflow-hidden">
        <CardHeader className="p-0 relative h-80">
          <Image
            src={plan.imageUrl || "/images/plans/default.jpg"}
            alt={plan.title}
            fill
            className="object-cover"
          />
        </CardHeader>
        
        <CardBody className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">{plan.title}</h1>
              <p className="text-gray-500 mb-4">
                {formatDate(plan.startDate)} - {formatDate(plan.endDate)}
              </p>
              <p className="mb-4">{plan.location || (plan.isOnline ? 'Online' : 'Konum belirtilmemiş')}</p>
            </div>
            
            <div className="text-right">
              <p className="text-xl font-bold text-blue-600">
                {plan.isFree ? 'Ücretsiz' : formatCurrency(plan.price)}
              </p>
              <p className="text-sm text-gray-500">
                {plan.maxParticipants > 0 
                  ? `${plan.participants?.length || 0}/${plan.maxParticipants} katılımcı` 
                  : `${plan.participants?.length || 0} katılımcı`}
              </p>
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Açıklama</h2>
            <p className="text-gray-700">{plan.description}</p>
          </div>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Katılımcılar</h2>
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="font-medium">Katılımcı sayısı:</span>
                <span>{plan.participants?.length || 0} / {plan.maxParticipants > 0 ? plan.maxParticipants : 'Sınırsız'}</span>
              </div>
              {plan.maxParticipants > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${((plan.participants?.length || 0) / plan.maxParticipants) * 100}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
          
          {renderLeadersInfo}
          
          {/* Plan yönetim butonları - kaldırıldı */}
          
        </CardBody>
        
        {/* Instagram benzeri buton düzeni */}
        <CardFooter className="flex flex-col border-t">
          <div className="flex justify-between items-center w-full py-3">
            <div className="flex space-x-5">
              <button 
                onClick={handleLike}
                disabled={liking}
                className={`flex items-center ${liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
                aria-label="Beğen"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill={liked ? "currentColor" : "none"}
                  stroke="currentColor" 
                  className="w-6 h-6" 
                  strokeWidth={liked ? "0" : "1.5"}
                >
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
              </button>
              
              <button 
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center ${saved ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'}`}
                aria-label="Kaydet"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill={saved ? "currentColor" : "none"} 
                  stroke="currentColor" 
                  className="w-6 h-6"
                  strokeWidth={saved ? "0" : "1.5"}
                >
                  <path d="M6.69 8.95c0-.24.2-.44.44-.44h9.74c.24 0 .44.2.44.44v9.4c0 .38-.43.6-.75.38l-4.36-2.9a.44.44 0 00-.5 0l-4.36 2.9c-.32.22-.75 0-.75-.38v-9.4z" strokeLinejoin="round" />
                  <path fillRule="evenodd" d="M6.34 2.25a.75.75 0 01.75-.75h9.82a.75.75 0 01.75.75v10.36a.75.75 0 01-.75.75h-9.82a.75.75 0 01-.75-.75V2.25zm1.5.75v8.86h8.32V3h-8.32z" clipRule="evenodd" />
                </svg>
              </button>
              
              <button 
                onClick={handleShare}
                className="text-gray-500 hover:text-blue-500 flex items-center"
                aria-label="Paylaş"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935-2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
              </button>
            </div>
            
            {canEdit ? (
              <div className="flex space-x-3">
                <Button 
                  onClick={handleEditPlan}
                  variant="outline"
                  className="flex items-center"
                  size="sm"
                >
                  <FaPencilAlt className="mr-2" /> Düzenle
                </Button>
                
                <Button 
                  onClick={handleDeletePlan}
                  variant="danger"
                  className="flex items-center"
                  size="sm"
                >
                  <FaTrash className="mr-2" /> Sil
                </Button>
              </div>
            ) : showLeaveButton ? (
              <Button 
                onClick={handleLeave} 
                disabled={leaving || isPlanPast}
                loading={leaving}
                size="md"
                variant="outline"
                className="text-red-500 border-red-500 hover:bg-red-50"
              >
                {isPlanPast ? 'Plan Sona Erdi' : 'Plandan Ayrıl'}
              </Button>
            ) : (
              <Button 
                onClick={handleJoin} 
                disabled={joining || isPlanPast}
                loading={joining}
                size="md"
                variant="primary"
              >
                {isPlanPast ? 'Plan Sona Erdi' : 'Katıl'}
              </Button>
            )}
          </div>
          
          {/* Beğeni ve katılımcı sayısı */}
          <div className="w-full text-sm text-gray-600 pt-2">
            <p className="font-semibold">{plan.likes?.length || 0} beğeni</p>
          </div>
        </CardFooter>
      </Card>

      {/* Plan Mesajlar Alanı */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center">
            <FaComment className="mr-2" />
            <h2 className="text-xl font-bold">Plan Odası</h2>
          </div>
        </CardHeader>
        <CardBody>
          {isPlanPast ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Bu plan sona erdi. Artık mesaj gönderemezsiniz.</p>
            </div>
          ) : !hasJoined && !canEdit ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600 mb-3">Plan odasını ve mesajları görebilmek için plana katılmalısınız.</p>
              {showJoinButton && (
                <Button 
                  onClick={handleJoin} 
                  disabled={joining}
                  loading={joining}
                  size="md"
                  className="mt-2"
                >
                  Plana Katıl
                </Button>
              )}
            </div>
          ) : (
            <>
              {loadingMessages ? (
                <div className="flex justify-center py-10">
                  <p>Mesajlar yükleniyor...</p>
                </div>
              ) : messages.length > 0 ? (
                <div className="space-y-4 max-h-80 overflow-y-auto p-2">
                  {messages.map((message) => (
                    <div key={message._id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden">
                        <Image 
                          src={message.user?.profilePicture || "/images/avatars/default.png"} 
                          alt={message.user?.username || 'Kullanıcı'} 
                          width={32} 
                          height={32} 
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">
                          {message.user?.username || 'Anonim'}
                          <span className="font-normal text-gray-500 text-xs ml-2">
                            {new Date(message.createdAt).toLocaleString('tr-TR')}
                          </span>
                        </p>
                        <p className="text-gray-800">{message.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">Henüz mesaj yok. İlk mesajı siz gönderin!</p>
                </div>
              )}

              {(hasJoined || canEdit) && !isPlanPast && (
                <div className="mt-4">
                  <div className="flex space-x-2">
                    <textarea
                      className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Mesajınızı yazın..."
                      rows={2}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    ></textarea>
                    <Button
                      onClick={handleSendMessage}
                      disabled={sendingMessage || !newMessage.trim()}
                      loading={sendingMessage}
                    >
                      Gönder
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
} 
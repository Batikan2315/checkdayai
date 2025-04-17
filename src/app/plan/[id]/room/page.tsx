"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { FaExclamationTriangle, FaArrowLeft } from "react-icons/fa";
import Link from "next/link";
import Input from "@/components/ui/Input";
import { format } from "date-fns";
import { tr } from 'date-fns/locale';

// Interface tanımları
interface IMessage {
  _id: string;
  content: string;
  createdAt: string;
  user?: {
    _id: string;
    name?: string;
    image?: string;
  };
}

interface IPlan {
  _id: string;
  title: string;
  creator?: {
    _id: string;
    name?: string;
    image?: string;
  };
  participants?: Array<{_id: string}>;
  leaders?: Array<{_id: string}>;
}

export default function PlanRoom() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isValid, setIsValid] = useState(true);
  const [plan, setPlan] = useState<IPlan | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Oturum kontrolü güncellendi
        if (status === 'loading') {
          // Oturum durumu yükleniyor, bekleyin
          return;
        }
        
        if (status === 'unauthenticated') {
          setIsValid(false);
          setError('Bu sayfaya erişmek için oturum açmanız gerekiyor.');
          setLoading(false);
          return;
        }
        
        // Plan bilgilerini al
        const res = await fetch(`/api/plans/${id}`);
        
        if (!res.ok) {
          if (res.status === 404) {
            setIsValid(false);
            setError('Plan bulunamadı.');
          } else {
            throw new Error('Plan bilgileri alınırken bir hata oluştu.');
          }
          setLoading(false);
          return;
        }
        
        const data = await res.json();
        setPlan(data);
        
        // Kullanıcının plana erişim hakkı var mı kontrol et
        const userId = session?.user?.id;
        const isCreator = data.creator?._id === userId;
        const isParticipant = data.participants?.some((p: any) => p._id === userId);
        const isLeader = data.leaders?.some((l: any) => l._id === userId);
        
        if (!isCreator && !isParticipant && !isLeader) {
          setIsValid(false);
          setError('Bu plan odasına erişim izniniz yok. Katılımcı veya lider olmanız gerekiyor.');
        } else {
          // Mesajları getir
          const messagesRes = await fetch(`/api/plans/${id}/messages`);
          if (messagesRes.ok) {
            const messagesData = await messagesRes.json();
            setMessages(messagesData);
          }
        }
      } catch (err) {
        console.error('Error checking access:', err);
        setError('Bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        setIsValid(false);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      checkAccess();
    }
  }, [id, status, session]);

  const handleSendMessage = async () => {
    if (!session?.user?.id) {
      toast.error('Mesaj göndermek için giriş yapmalısınız');
      return;
    }
    
    if (!newMessage.trim()) {
      toast.error('Boş mesaj gönderemezsiniz');
      return;
    }
    
    try {
      setSendingMessage(true);
      
      // API'ye mesaj isteği gönder
      const response = await fetch(`/api/plans/${id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session?.user?.id,
          content: newMessage
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Mesaj gönderilirken bir hata oluştu');
      }
      
      // Mesajı sıfırla ve mesajları yeniden getir
      setNewMessage("");
      fetchMessages();
      
    } catch (error: any) {
      toast.error(error.message || 'Mesaj gönderilirken bir hata oluştu');
      console.error('Mesaj gönderme hatası:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleJoin = async () => {
    if (!session?.user?.id) {
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
          userId: session?.user?.id
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Plana katılırken bir hata oluştu');
      }
      
      toast.success('Plana başarıyla katıldınız!');
      // Erişim kontrolünü güncelle
      setHasAccess(true);
      // Plan bilgilerini yeniden yükle
      const updatedPlan = await fetch(`/api/plans/${id}`).then(res => res.json());
      setPlan(updatedPlan);
      // Mesajları yükle
      fetchMessages();
      
    } catch (error: any) {
      toast.error(error.message || 'Plana katılırken bir hata oluştu');
      console.error('Katılma hatası:', error);
    } finally {
      setJoining(false);
    }
  };

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

  if (loading || loadingAccess) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Erişim kontrolü
  if (!session?.user?.id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Link href={`/plan/${id}`} className="flex items-center text-blue-500 hover:underline">
            <FaArrowLeft className="mr-2" /> Plana Dön
          </Link>
        </div>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FaExclamationTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Plan odasına erişmek için giriş yapmalısınız.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Link href={`/plan/${id}`} className="flex items-center text-blue-500 hover:underline">
            <FaArrowLeft className="mr-2" /> Plana Dön
          </Link>
        </div>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FaExclamationTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                {error}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <div className="mb-4">
        <Link href={`/plan/${id}`} className="flex items-center text-blue-500 hover:underline">
          <FaArrowLeft className="mr-2" /> Plana Dön
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">{plan?.title || 'Plan Odası'}</h1>
        <p className="text-gray-600 mb-6">Plan katılımcıları ile iletişim kurabileceğiniz özel bir alan.</p>
        
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <FaExclamationTriangle className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Bu alandaki mesajlar sadece plana katılmış kişiler tarafından görülebilir.
              </p>
            </div>
          </div>
        </div>
        
        {loadingMessages ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : messages && messages.length > 0 ? (
          <div className="space-y-4 mb-6 max-h-96 overflow-y-auto p-2 border border-gray-200 rounded-lg">
            {messages.map((message: any) => (
              <div 
                key={message._id} 
                className={`flex ${message.user?._id === session?.user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[70%] p-3 rounded-lg ${
                    message.user?._id === session?.user?.id 
                      ? 'bg-blue-100 text-blue-900' 
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-center mb-1">
                    <div className="w-6 h-6 rounded-full overflow-hidden mr-2">
                      <img 
                        src={message.user?.profilePicture || '/images/avatars/default.png'} 
                        alt={message.user?.name || 'Kullanıcı'} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/avatars/default.png';
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold">
                      {message.user?.name || 'Anonim Kullanıcı'}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      {new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg mb-6">
            <p>Henüz mesaj yok. İlk mesajı siz gönderin!</p>
          </div>
        )}
        
        <div className="flex">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Mesajınızı yazın..."
            className="flex-grow p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendingMessage}
            className="rounded-l-none"
          >
            {sendingMessage ? 'Gönderiliyor...' : 'Gönder'}
          </Button>
        </div>
      </div>
    </div>
  );
} 
"use client";

import React, { useState, useEffect, useRef, FormEvent, useCallback } from "react";
import { useParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { FaExclamationTriangle, FaArrowLeft, FaPaperPlane, FaCalendarAlt } from "react-icons/fa";
import Link from "next/link";
import Image from "next/image";

// Interface tanımları
interface IMessage {
  _id: string;
  content: string;
  createdAt: string;
  user?: {
    _id: string;
    name?: string;
    image?: string;
    profilePicture?: string;
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
  startDate?: string;
}

export default function PlanRoom() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session, status } = useSession();
  const [isValid, setIsValid] = useState(true);
  const [plan, setPlan] = useState<IPlan | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mesajların en altına otomatik kaydırma
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mesajları getiren fonksiyon
  const fetchMessages = useCallback(async () => {
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
  }, [id]);

  // Erişim kontrolü
  useEffect(() => {
    const checkAccess = async () => {
      if (!session?.user) {
        setLoadingAccess(false);
        setHasAccess(false);
        return;
      }

      try {
        const planResponse = await fetch(`/api/plans/${id}`);
        if (!planResponse.ok) {
          throw new Error("Plan bulunamadı");
        }

        const planData = await planResponse.json();
        setPlan(planData);

        // Kullanıcının katılımcı veya Creator olup olmadığını kontrol et
        const isUserCreator = planData.creator?._id === session.user.id;
        const isUserParticipant = planData.participants?.some(
          (participant: any) => participant._id === session.user.id || participant.userId === session.user.id
        );

        if (isUserCreator) {
          // Creator her zaman erişime sahiptir
          setHasAccess(true);
          fetchMessages();
        } else if (isUserParticipant) {
          // Katılımcı da erişime sahiptir
          setHasAccess(true);
          fetchMessages();
        } else {
          // Ne creator ne de katılımcı değilse erişim yok
          setHasAccess(false);
          setError("Bu plan odasına erişmek için plana katılmanız gerekmektedir.");
        }
        
        setLoadingAccess(false);
      } catch (error) {
        console.error(error);
        setError("Plan bilgisi yüklenirken hata oluştu");
        setLoadingAccess(false);
        setHasAccess(false);
      }
    };
    
    if (id) {
      checkAccess();
    }
  }, [id, status, session, fetchMessages]);

  // Mesaj gönderme
  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();

    // Mesaj göndermek için katılımcı veya creator olmalısınız
    if (!hasAccess) {
      toast.error("Mesaj göndermek için plana katılmanız gerekmektedir.");
      return;
    }

    if (!newMessage.trim()) return;

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

  // Plana katılma
  const handleJoin = useCallback(async () => {
    if (!session?.user?.id) {
      toast.error('Katılmak için giriş yapmalısınız');
      return;
    }
    
    try {
      setLoading(true);
      
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
      setLoading(false);
    }
  }, [session, id, fetchMessages]);

  if (loadingAccess) {
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
            <FaArrowLeft className="mr-2" aria-hidden="true" /> 
            <span>Plana Dön</span>
          </Link>
        </div>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4" role="alert">
          <div className="flex">
            <div className="flex-shrink-0">
              <FaExclamationTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Plan odasına erişmek için giriş yapmalısınız.
              </p>
            </div>
          </div>
        </div>
        <div className="text-center mt-4">
          <Button
            onClick={() => window.location.href = "/login"}
          >
            Giriş Yap
          </Button>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Link href={`/plan/${id}`} className="flex items-center text-blue-500 hover:underline">
            <FaArrowLeft className="mr-2" aria-hidden="true" /> 
            <span>Plana Dön</span>
          </Link>
        </div>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4" role="alert">
          <div className="flex">
            <div className="flex-shrink-0">
              <FaExclamationTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                {error}
              </p>
            </div>
          </div>
        </div>
        {!hasAccess && (
          <div className="text-center mt-4">
            <Button
              onClick={handleJoin}
              disabled={loading}
            >
              {loading ? "Katılınıyor..." : "Plana Katıl"}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <div className="mb-4">
        <Link href={`/plan/${id}`} className="flex items-center text-blue-500 hover:underline">
          <FaArrowLeft className="mr-2" aria-hidden="true" /> 
          <span>Plana Dön</span>
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">{plan?.title || 'Plan Odası'}</h1>
        <div className="flex items-center text-gray-600 mb-4">
          <FaCalendarAlt className="mr-2" />
          {plan?.startDate && (
            <span>
              {new Date(plan.startDate).toLocaleDateString('tr-TR', {
                day: 'numeric', 
                month: 'long', 
                year: 'numeric'
              })} • {new Date(plan.startDate).toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          )}
        </div>
        <p className="text-gray-600 mb-6">Plan katılımcıları ile iletişim kurabileceğiniz özel bir alan.</p>
        
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6" role="alert">
          <div className="flex">
            <div className="flex-shrink-0">
              <FaExclamationTriangle className="h-5 w-5 text-blue-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Bu alandaki mesajlar sadece plana katılmış kişiler tarafından görülebilir.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg">
          <div 
            className="space-y-4 p-4 max-h-96 overflow-y-auto"
            aria-live="polite"
            aria-label="Mesaj alanı"
          >
            {loadingMessages ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : messages && messages.length > 0 ? (
              messages.map((message) => (
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
                      <div className="relative w-6 h-6 rounded-full overflow-hidden mr-2">
                        <Image 
                          src={message.user?.profilePicture || message.user?.image || '/images/avatars/default.png'} 
                          alt={message.user?.name || 'Kullanıcı'}
                          width={24}
                          height={24}
                          className="object-cover"
                          onError={() => '/images/avatars/default.png'}
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
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Henüz mesaj yok. İlk mesajı siz gönderin!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        <form onSubmit={handleSendMessage} className="flex">
          <label htmlFor="message-input" className="sr-only">Mesajınızı yazın</label>
          <input
            id="message-input"
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Mesajınızı yazın..."
            className="flex-grow p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sendingMessage}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <Button
            type="submit"
            disabled={!newMessage.trim() || sendingMessage}
            className="rounded-l-none"
            aria-label="Mesaj gönder"
          >
            {sendingMessage ? (
              <>
                <span className="animate-spin mr-2 inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                <span>Gönderiliyor</span>
              </>
            ) : (
              <>
                <FaPaperPlane className="mr-2" aria-hidden="true" />
                <span>Gönder</span>
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
} 
"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardBody, CardFooter } from './Card';
import Button from './Button';
import Avatar from './UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { toast } from 'react-hot-toast';
import { FaPaperPlane, FaImage, FaFile, FaSmile, FaSpinner } from 'react-icons/fa';
import { BsEmojiSmile } from 'react-icons/bs';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface PlanDetailProps {
  planId: string;
  isPlanExpired: boolean;
  isUserJoined: boolean;
}

interface Message {
  _id: string;
  planId: string;
  sender: {
    _id: string;
    name: string;
    image?: string;
  };
  content: string;
  attachment?: {
    type: 'image' | 'file';
    url: string;
    name?: string;
  };
  createdAt: string;
  isRead: boolean;
}

export default function PlanRoomChat({ planId, isPlanExpired, isUserJoined }: PlanDetailProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  
  // Mesajları getir
  useEffect(() => {
    const fetchMessages = async () => {
      if (!planId || !isUserJoined) return;
      
      try {
        setLoadingMessages(true);
        const response = await fetch(`/api/plans/${planId}/messages`);
        
        if (!response.ok) {
          // Mesaj henüz yoksa boş dizi göster (bu bir hata değil)
          if (response.status === 404) {
            setMessages([]);
            setLoadingMessages(false);
            return;
          }
          
          throw new Error('Mesajlar getirilemedi');
        }
        
        const data = await response.json();
        setMessages(data.messages || []);
      } catch (error) {
        console.error('Mesajlar yüklenirken hata:', error);
        toast.error('Mesajlar yüklenemedi. Lütfen sayfayı yenileyiniz.');
      } finally {
        setLoadingMessages(false);
      }
    };
    
    fetchMessages();
    
    // Socket.io ile yeni mesaj dinle
    if (socket && isConnected) {
      // Plan odasına katıl
      socket.emit('join_plan_room', { planId });
      
      // Yeni mesaj olayını dinle
      socket.on(`new_message_${planId}`, (newMessage: Message) => {
        setMessages(prev => [...prev, newMessage]);
        // Yeni mesaj geldiğinde sona kaydır
        scrollToBottom();
      });
      
      // Mesaj okundu olayını dinle
      socket.on(`message_read_${planId}`, (data: { messageId: string; userId: string }) => {
        setMessages(prev => 
          prev.map(msg => 
            msg._id === data.messageId ? { ...msg, isRead: true } : msg
          )
        );
      });
      
      // Temizleme fonksiyonu
      return () => {
        socket.off(`new_message_${planId}`);
        socket.off(`message_read_${planId}`);
        socket.emit('leave_plan_room', { planId });
      };
    }
  }, [planId, socket, isConnected, isUserJoined]);
  
  // Yeni mesaj geldiğinde otomatik kaydırma
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Sayfanın en altına kaydır
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Dosya seçme işlevi
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };
  
  // Dosya değişikliği işlevi
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Dosya boyutu kontrolü (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu 5MB\'dan küçük olmalıdır');
      return;
    }
    
    setAttachment(file);
    
    // Görüntü ön izlemesi
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachmentPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview(null);
    }
  };
  
  // Eklentiyi kaldır
  const removeAttachment = () => {
    setAttachment(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Emoji ekleme işlevi
  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };
  
  // Mesaj gönderme işlevi
  const sendMessage = async () => {
    if ((!message.trim() && !attachment) || !user || !planId || isPlanExpired) return;
    
    try {
      setSending(true);
      
      // Önce eklenti varsa yükle
      let attachmentData = null;
      if (attachment) {
        const formData = new FormData();
        formData.append('file', attachment);
        formData.append('upload_preset', 'checkday_uploads');
        
        const uploadResponse = await fetch(
          'https://api.cloudinary.com/v1_1/checkday/image/upload',
          {
            method: 'POST',
            body: formData
          }
        );
        
        if (!uploadResponse.ok) {
          throw new Error('Dosya yüklenemedi');
        }
        
        const uploadData = await uploadResponse.json();
        attachmentData = {
          type: attachment.type.startsWith('image/') ? 'image' : 'file',
          url: uploadData.secure_url,
          name: attachment.name
        };
      }
      
      // Mesajı gönder
      const messageData = {
        planId,
        senderId: user._id,
        content: message.trim(),
        attachment: attachmentData
      };
      
      const response = await fetch(`/api/plans/${planId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });
      
      if (!response.ok) {
        throw new Error('Mesaj gönderilemedi');
      }
      
      // Mesaj gönderildikten sonra formu temizle
      setMessage('');
      setAttachment(null);
      setAttachmentPreview(null);
      
      // Socket bağlantısı yoksa mesajları yeniden yükle
      if (!socket || !isConnected) {
        const messagesResponse = await fetch(`/api/plans/${planId}/messages`);
        const messagesData = await messagesResponse.json();
        setMessages(messagesData.messages || []);
      }
      
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      toast.error('Mesaj gönderilemedi. Lütfen tekrar deneyiniz.');
    } finally {
      setSending(false);
    }
  };
  
  // Enter tuşu ile mesaj gönderme
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  // Yükleniyor durumu
  if (loadingMessages) {
    return (
      <div className="flex justify-center items-center py-12">
        <FaSpinner className="animate-spin text-primary text-2xl" />
        <span className="ml-2 text-gray-600">Mesajlar yükleniyor...</span>
      </div>
    );
  }
  
  // Kullanıcı katılmamışsa uyarı göster
  if (!isUserJoined) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              Bu plan odasına erişmek için önce plana katılmalısınız.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Plan sona ermişse bilgi göster
  if (isPlanExpired) {
    return (
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-md text-center">
        <div className="text-gray-600">
          <p className="mb-2">Bu plan sona erdi.</p>
          <p className="text-sm">Artık yeni mesaj gönderemezsiniz, ancak geçmiş mesajları görüntüleyebilirsiniz.</p>
        </div>
        
        <div className="mt-6 max-h-96 overflow-y-auto p-4 bg-white rounded-lg border border-gray-200">
          {messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((msg) => (
                <MessageItem 
                  key={msg._id} 
                  message={msg} 
                  currentUserId={user?._id as string} 
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <p className="text-center text-gray-500 py-6">Bu planda henüz mesaj yok.</p>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <Card className="mb-6">
      <CardHeader className="border-b">
        <h3 className="text-lg font-semibold">Plan Odası</h3>
      </CardHeader>
      
      <CardBody className="p-0">
        {/* Mesaj listesi */}
        <div className="h-[400px] overflow-y-auto p-4 bg-gray-50">
          {messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((msg) => (
                <MessageItem 
                  key={msg._id} 
                  message={msg} 
                  currentUserId={user?._id as string} 
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg className="w-16 h-16 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
              <p>Henüz mesaj yok. İlk mesajı gönderen siz olun!</p>
            </div>
          )}
        </div>
      </CardBody>
      
      <CardFooter className="p-3 border-t">
        {/* Eklenti önizleme */}
        {attachmentPreview && (
          <div className="relative mb-2 inline-block">
            <img 
              src={attachmentPreview} 
              alt="Attachment preview" 
              className="h-20 w-20 object-cover rounded-md border border-gray-300" 
            />
            <button 
              onClick={removeAttachment}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
            >
              &times;
            </button>
          </div>
        )}
        
        {/* Mesaj formu */}
        <div className="flex items-center space-x-2 w-full">
          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mesajınızı yazın..."
              className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              disabled={sending}
            />
            
            {/* Emoji seçici */}
            <div className="absolute bottom-2 right-2">
              <button 
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-gray-500 hover:text-gray-700"
              >
                <BsEmojiSmile />
              </button>
              
              {showEmojiPicker && (
                <div className="absolute bottom-8 right-0 bg-white rounded-lg shadow-lg border p-2 grid grid-cols-8 gap-1">
                  {['😊', '😂', '😍', '👍', '❤️', '🎉', '👏', '🙏', '😎', '🤔', '😢', '😭', '🥳', '🤩', '😴', '🤗'].map(emoji => (
                    <button 
                      key={emoji} 
                      onClick={() => handleEmojiSelect(emoji)}
                      className="text-2xl hover:bg-gray-100 p-1 rounded"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Dosya seçme butonu */}
          <button
            type="button"
            onClick={handleFileSelect}
            className="p-2 text-gray-500 hover:text-blue-500 hover:bg-gray-100 rounded-full"
            disabled={sending}
          >
            <FaImage />
          </button>
          
          <input 
            type="file"
            onChange={handleFileChange}
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
            ref={fileInputRef}
          />
          
          {/* Gönderme butonu */}
          <Button
            onClick={sendMessage}
            disabled={(!message.trim() && !attachment) || sending}
            className="flex items-center"
          >
            {sending ? (
              <FaSpinner className="animate-spin mr-1" />
            ) : (
              <FaPaperPlane className="mr-1" />
            )}
            Gönder
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

// Mesaj bileşeni
function MessageItem({ message, currentUserId }: { message: Message; currentUserId: string }) {
  const isOwnMessage = message.sender._id === currentUserId;
  
  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] ${isOwnMessage ? 'bg-blue-500 text-white' : 'bg-white'} rounded-lg p-3 shadow-sm`}>
        {!isOwnMessage && (
          <div className="flex items-center mb-1">
            <Avatar 
              src={message.sender.image || '/images/avatars/default.png'} 
              size="xs" 
              username={message.sender.name} 
            />
            <span className="ml-2 font-medium text-xs">{message.sender.name}</span>
          </div>
        )}
        
        {/* Mesaj içeriği */}
        <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
        
        {/* Eklenti varsa */}
        {message.attachment && (
          <div className="mt-2">
            {message.attachment.type === 'image' ? (
              <a href={message.attachment.url} target="_blank" rel="noopener noreferrer">
                <img 
                  src={message.attachment.url} 
                  alt="Attachment" 
                  className="max-h-40 rounded-md cursor-pointer hover:opacity-90" 
                />
              </a>
            ) : (
              <a 
                href={message.attachment.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-xs bg-gray-100 text-gray-800 p-2 rounded-md hover:bg-gray-200"
              >
                <FaFile className="mr-2" />
                <span>{message.attachment.name || 'Dosya'}</span>
              </a>
            )}
          </div>
        )}
        
        {/* Zaman bilgisi ve okundu durumu */}
        <div className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'} flex items-center justify-end`}>
          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: tr })}
          
          {isOwnMessage && (
            <span className="ml-1">
              {message.isRead ? (
                <svg className="w-3 h-3 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              ) : (
                <svg className="w-3 h-3 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01"></path>
                </svg>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
} 
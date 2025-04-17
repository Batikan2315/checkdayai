"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import Button from '@/components/ui/Button';

interface PlanActionsProps {
  plan: {
    _id: string;
    participants?: any[];
    creator?: any;
  };
}

export const PlanActions = ({ plan }: PlanActionsProps) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  // Kullanıcının katılım durumunu ve oluşturucu olup olmadığını kontrol et
  useEffect(() => {
    if (!session?.user?.id || !plan) return;

    const userId = session.user.id;
    
    // Kullanıcı katılımcı mı kontrol et
    const isUserParticipant = plan.participants?.some((p: any) => 
      p?._id?.toString() === userId || 
      p?.toString() === userId
    );
    
    // Kullanıcı oluşturucu mu kontrol et
    const creatorId = plan.creator?._id || plan.creator;
    const isUserCreator = 
      creatorId === userId || 
      (typeof creatorId === 'object' && creatorId?._id && creatorId._id.toString() === userId) ||
      (creatorId && creatorId.toString && creatorId.toString() === userId);
    
    setIsJoined(!!isUserParticipant);
    setIsCreator(!!isUserCreator);
    
  }, [plan, session?.user?.id]);

  // Plana katılma fonksiyonu
  const handleJoin = async () => {
    if (!session?.user) {
      toast.error("Bu işlemi yapmak için giriş yapmalısınız.");
      router.push("/login");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/plans/${plan._id}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Plana katılırken bir hata oluştu");
      }

      toast.success("Plana başarıyla katıldınız!");
      setIsJoined(true);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Plana katılırken bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  // Plandan ayrılma fonksiyonu
  const handleLeave = async () => {
    if (!session?.user) {
      toast.error("Bu işlemi yapmak için giriş yapmalısınız.");
      return;
    }

    if (!confirm("Bu plandan ayrılmak istediğinizden emin misiniz?")) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/plans/${plan._id}/join`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Plandan ayrılırken bir hata oluştu");
      }

      toast.success("Plandan ayrıldınız");
      setIsJoined(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Plandan ayrılırken bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Plan odasına git
  const handleGoToRoom = () => {
    router.push(`/plan/${plan._id}`);
  };

  if (!session?.user) {
    return (
      <Button
        onClick={() => router.push("/login")}
        variant="primary"
      >
        Giriş Yap
      </Button>
    );
  }
  
  // Kullanıcı planın oluşturucusu ise Plan Odası butonu göster
  if (isCreator) {
    return (
      <Button
        onClick={handleGoToRoom}
        variant="primary"
        className="w-full"
      >
        Plan Odası
      </Button>
    );
  }

  return isJoined ? (
    <Button 
      onClick={handleLeave}
      disabled={isLoading}
      variant="danger"
    >
      {isLoading ? 'İşlem yapılıyor...' : 'Ayrıl'}
    </Button>
  ) : (
    <Button
      onClick={handleJoin}
      disabled={isLoading}
      variant="primary"
    >
      {isLoading ? 'İşlem yapılıyor...' : 'Katıl'}
    </Button>
  );
}; 
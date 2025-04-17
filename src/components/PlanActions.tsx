"use client";

import Button from "@/components/ui/Button";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useState } from "react";
import axios from "axios";

export interface Plan {
  _id: string;
  participants: any[];
  creator: any;
}

interface PlanActionsProps {
  plan: Plan;
}

export const PlanActions = ({ plan }: PlanActionsProps) => {
  const { data: session } = useSession();
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  
  if (!session) {
    return (
      <Button
        onClick={() => router.push("/login")}
        variant="primary"
        className="w-full"
      >
        Katılmak için giriş yap
      </Button>
    );
  }

  const userId = session.user?.id;
  const isCreator = plan.creator?._id === userId || plan.creator === userId;
  const isParticipant = plan.participants?.some(
    (p) => p._id === userId || p === userId
  );

  const handleJoin = async () => {
    if (joining) return;
    
    setJoining(true);
    try {
      const response = await axios.post(`/api/plans/${plan._id}/join`);
      
      if (response.status === 200) {
        toast.success("Plana başarıyla katıldınız");
        // Katılma işlemi başarılı olduğunda plan odasına yönlendir
        router.push(`/plan/${plan._id}`);
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Plana katılırken bir hata oluştu");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (leaving) return;
    
    setLeaving(true);
    try {
      const response = await axios.post(`/api/plans/${plan._id}/leave`);
      
      if (response.status === 200) {
        toast.success("Plandan ayrıldınız");
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Plandan ayrılırken bir hata oluştu");
    } finally {
      setLeaving(false);
    }
  };

  const goToPlanRoom = () => {
    router.push(`/plan/${plan._id}`);
  };

  // Kullanıcı plana katılmışsa veya oluşturucuysa plan odasına gidebilir ve ayrılabilir
  if (isParticipant || isCreator) {
    return (
      <div className="flex gap-2">
        <Button
          onClick={goToPlanRoom}
          variant="primary"
          className="flex-1"
        >
          Plan Odası
        </Button>
        {!isCreator && (
          <Button
            onClick={handleLeave}
            variant="danger"
            className="flex-1"
            disabled={leaving}
          >
            {leaving ? "Ayrılıyor..." : "Ayrıl"}
          </Button>
        )}
      </div>
    );
  }

  // Kullanıcı ne katılımcı ne de oluşturucuysa sadece katılma butonu göster
  return (
    <Button
      onClick={handleJoin}
      variant="success"
      className="w-full"
      disabled={joining}
    >
      {joining ? "Katılıyor..." : "Katıl"}
    </Button>
  );
}; 
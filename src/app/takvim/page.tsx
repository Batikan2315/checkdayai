"use client";

import React, { useState, useEffect } from "react";
import PageContainer from "@/components/layout/PageContainer";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { FaCalendarAlt, FaMapMarkerAlt, FaClock, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth, addMonths, subMonths, getDay, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import Button from "@/components/ui/Button";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import PlanCard from "@/components/ui/PlanCard";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { data: session } = useSession();
  const userId = session?.user?.id || null;
  
  // Kullanıcının planlarını getir
  useEffect(() => {
    const fetchPlans = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Kullanıcının katıldığı planlar
        const joinedResponse = await fetch(`/api/plans?participant=${userId}`);
        let joinedPlans = [];
        
        if (joinedResponse.ok) {
          const data = await joinedResponse.json();
          joinedPlans = data.plans || [];
        }
        
        // Kullanıcının oluşturduğu planlar
        const createdResponse = await fetch(`/api/plans?creator=${userId}`);
        let createdPlans = [];
        
        if (createdResponse.ok) {
          const data = await createdResponse.json();
          createdPlans = data.plans || [];
        }
        
        // Planları birleştir ve tekrar edenleri çıkar
        const allPlans = [...joinedPlans, ...createdPlans];
        const uniquePlans = allPlans.filter((plan, index, self) =>
          index === self.findIndex((p) => p._id === plan._id)
        );
        
        setPlans(uniquePlans);
        setLoading(false);
      } catch (error) {
        console.error("Planları getirme hatası:", error);
        toast.error("Planlar yüklenirken bir sorun oluştu");
        setLoading(false);
      }
    };
    
    fetchPlans();
  }, [userId]);
  
  // Seçilen tarihteki planları filtrele
  const selectedDatePlans = plans.filter((plan) => {
    if (!selectedDate) return false;
    
    const planDate = new Date(plan.startDate);
    return (
      planDate.getDate() === selectedDate.getDate() &&
      planDate.getMonth() === selectedDate.getMonth() &&
      planDate.getFullYear() === selectedDate.getFullYear()
    );
  });
  
  // Takvim günlerini hesapla
  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
  
  // Günleri hafta formatında bölmek için
  const weeks: Date[][] = [];
  let week: Date[] = [];
  
  // Ayın ilk gününden önceki günleri ekleme (önceki ayın son günleri)
  const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 = Pazar, 1 = Pazartesi
  const firstActualDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  
  for (let i = 0; i < firstActualDay; i++) {
    const previousMonthDay = new Date(firstDayOfMonth);
    previousMonthDay.setDate(previousMonthDay.getDate() - (firstActualDay - i));
    week.push(previousMonthDay);
  }
  
  // Ay günlerini ekleme
  daysInMonth.forEach((day) => {
    week.push(day);
    
    // Eğer haftanın son günü ise (Pazar, getDay = 0)
    if (day.getDay() === 0) {
      weeks.push(week);
      week = [];
    }
  });
  
  // Son haftanın kalan günlerini ekleme (sonraki ay)
  if (week.length > 0) {
    const daysToAdd = 7 - week.length;
    for (let i = 1; i <= daysToAdd; i++) {
      const nextMonthDay = new Date(lastDayOfMonth);
      nextMonthDay.setDate(nextMonthDay.getDate() + i);
      week.push(nextMonthDay);
    }
    weeks.push(week);
  }
  
  // Önceki aya git
  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };
  
  // Sonraki aya git
  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };
  
  // Bugüne git
  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Takvimden kaldır butonu için
  const handleRemoveFromCalendar = async (planId: string) => {
    if (!userId) {
      toast.error("Bu işlem için giriş yapmalısınız");
      return;
    }
    
    try {
      const response = await fetch(`/api/plans/${planId}/join`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      
      if (!response.ok) {
        throw new Error("Plandan ayrılma işlemi başarısız oldu");
      }
      
      // Planları yenile
      setPlans(plans.filter(p => p._id !== planId));
      toast.success("Plan takviminizden kaldırıldı");
    } catch (error) {
      console.error("Plan kaldırma hatası:", error);
      toast.error("Plan kaldırılırken bir sorun oluştu");
    }
  };

  return (
    <PageContainer title="Takvim">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Takvim bölümü */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center pb-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {format(currentDate, "MMMM yyyy", { locale: tr })}
              </h2>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                  Önceki Ay
                </Button>
                <Button variant="outline" size="sm" onClick={handleToday}>
                  Bugün
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextMonth}>
                  Sonraki Ay
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {/* Hafta başlıkları */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Takvim günleri */}
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1 mb-1">
                  {week.map((day, dayIndex) => {
                    // Bu günde plan var mı kontrol et
                    const hasPlans = plans.some((plan) => {
                      const planDate = new Date(plan.startDate);
                      return (
                        planDate.getDate() === day.getDate() &&
                        planDate.getMonth() === day.getMonth() &&
                        planDate.getFullYear() === day.getFullYear()
                      );
                    });
                    
                    return (
                      <button
                        key={dayIndex}
                        className={`relative h-16 flex flex-col items-center justify-center rounded-md transition-colors ${
                          isToday(day)
                            ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                            : !isSameMonth(day, currentDate)
                            ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600"
                            : selectedDate && 
                              day.getDate() === selectedDate.getDate() &&
                              day.getMonth() === selectedDate.getMonth() &&
                              day.getFullYear() === selectedDate.getFullYear()
                            ? "bg-blue-50 dark:bg-blue-800 border border-blue-500"
                            : "bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
                        }`}
                        onClick={() => setSelectedDate(day)}
                      >
                        <span>{day.getDate()}</span>
                        {hasPlans && (
                          <div className="absolute bottom-1 w-4 h-1 rounded-full bg-blue-500"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
        
        {/* Seçili günün planları */}
        <div>
          <Card>
            <CardHeader>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedDate ? formatDate(selectedDate) : "Seçili Gün"}
              </h3>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : selectedDatePlans.length > 0 ? (
                <div className="space-y-4">
                  {selectedDatePlans.map((plan) => (
                    <PlanCard
                      key={plan._id}
                      id={plan._id}
                      title={plan.title}
                      description={plan.description}
                      date={new Date(plan.startDate)}
                      location={plan.location || (plan.isOnline ? "Online" : "Belirtilmemiş")}
                      imageUrl={plan.imageUrl}
                      creator={plan.creator}
                      isOnline={plan.isOnline}
                      isFree={plan.isFree}
                      price={plan.price}
                      maxParticipants={plan.maxParticipants}
                      participantCount={plan.participants?.length || 0}
                      isJoined={true}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {selectedDate ? "Bu tarihte planınız yok" : "Takvimden bir gün seçin"}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
      
      {/* Yaklaşan Planlar Listesi */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Tüm Planlarım</h3>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : plans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan._id}
                    id={plan._id}
                    title={plan.title}
                    description={plan.description}
                    date={new Date(plan.startDate)}
                    location={plan.location || (plan.isOnline ? "Online" : "Belirtilmemiş")}
                    imageUrl={plan.imageUrl}
                    creator={plan.creator}
                    isOnline={plan.isOnline}
                    isFree={plan.isFree}
                    price={plan.price}
                    maxParticipants={plan.maxParticipants}
                    participantCount={plan.participants?.length || 0}
                    isJoined={true}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Henüz planınız yok
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </PageContainer>
  );
} 
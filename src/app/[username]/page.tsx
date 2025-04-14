"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import PlanCard from "@/components/ui/PlanCard";
import Button from "@/components/ui/Button";
import { FaCalendarAlt, FaClock, FaFilter, FaMapPin, FaTags, FaUser } from "react-icons/fa";
import { IPlan, IUser } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function UserProfile() {
  const params = useParams();
  const usernameParam = params?.username as string;
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<IUser | null>(null);
  const [plans, setPlans] = useState<IPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<IPlan[]>([]);
  const [activeTab, setActiveTab] = useState<"weekly" | "all" | "upcoming" | "past">("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "free" | "online" | "offline">("all");

  // Kullanıcı bilgilerini getir
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!usernameParam) return;
        
        setLoading(true);
        // username parametresindeki @ işaretini kaldır ve küçük harfe dönüştür
        const cleanUsername = usernameParam.replace('@', '').toLowerCase();
        console.log(`Parametre: ${usernameParam}, Temizlenmiş username: ${cleanUsername}`);
        
        // API uç noktasını kullanarak kullanıcı bilgilerini getir
        const response = await fetch(`/api/user/profile?username=${cleanUsername}`);
        
        if (!response.ok) {
          throw new Error("Kullanıcı bulunamadı");
        }
        
        const userData = await response.json();
        setUser(userData);

        // Kullanıcının planlarını getir
        const plansResponse = await fetch(`/api/plans?creator=${userData._id}`);
        
        if (plansResponse.ok) {
          const plansData = await plansResponse.json();
          setPlans(plansData.plans || []);
          setFilteredPlans(plansData.plans || []);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Kullanıcı bilgileri getirme hatası:", error);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [usernameParam]);

  // Filtreleme işlevleri
  useEffect(() => {
    if (!plans.length) return;
    
    let filtered = [...plans];
    const now = new Date();
    
    // Tab filtreleme
    switch (activeTab) {
      case "weekly": {
        // Bugünden bir hafta sonrasına kadar olan planlar
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        filtered = filtered.filter(plan => {
          const startDate = new Date(plan.startDate);
          return startDate >= now && startDate <= nextWeek;
        });
        break;
      }
      case "upcoming": {
        // Gelecek planlar
        filtered = filtered.filter(plan => {
          const startDate = new Date(plan.startDate);
          return startDate >= now;
        });
        break;
      }
      case "past": {
        // Geçmiş planlar
        filtered = filtered.filter(plan => {
          const endDate = new Date(plan.endDate);
          return endDate < now;
        });
        break;
      }
    }
    
    // Tür filtreleme
    switch (activeFilter) {
      case "free":
        filtered = filtered.filter(plan => plan.isFree);
        break;
      case "online":
        filtered = filtered.filter(plan => plan.isOnline);
        break;
      case "offline":
        filtered = filtered.filter(plan => !plan.isOnline);
        break;
    }
    
    // Tarihe göre sırala - yakın olanlar önce
    filtered.sort((a, b) => {
      const dateA = new Date(a.startDate).getTime();
      const dateB = new Date(b.startDate).getTime();
      return dateA - dateB;
    });
    
    setFilteredPlans(filtered);
  }, [plans, activeTab, activeFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Kullanıcı Bulunamadı</h1>
        <p className="mt-2 text-gray-600">Bu kullanıcı adı ile kayıtlı bir kullanıcı bulunmamaktadır.</p>
        <Button 
          onClick={() => window.history.back()}
          className="mt-4" 
          variant="outline"
        >
          Geri Dön
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Kullanıcı Profil Kartı */}
      <Card className="mb-8 overflow-hidden">
        <div className="h-40 bg-gradient-to-r from-blue-400 to-indigo-500 relative">
          <div className="absolute -bottom-16 left-8">
            <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-white">
              <img 
                src={user.profilePicture || "/images/avatars/default.png"} 
                alt={user.username} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/images/avatars/default.png";
                }}
              />
            </div>
          </div>
        </div>
        
        <CardBody className="pt-20 pb-6">
          <div className="flex flex-col md:flex-row justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : user.username}
              </h1>
              <p className="text-gray-600 text-sm mt-1">@{user.username}</p>
              
              <div className="mt-4 flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <FaUser className="mr-1" />
                  <span>{plans.length} plan</span>
                </div>
                <div className="flex items-center">
                  <FaCalendarAlt className="mr-1" />
                  <span>Üyelik: {formatDate(user.createdAt || new Date())}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 md:mt-0">
              {user.role === "admin" && (
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">
                  Admin
                </span>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
      
      {/* Planlar Bölümü */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Planları</h2>
        
        {/* Sekmeler */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button 
            variant={activeTab === "all" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab("all")}
          >
            Tüm Planlar
          </Button>
          <Button 
            variant={activeTab === "weekly" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab("weekly")}
          >
            Bu Hafta
          </Button>
          <Button 
            variant={activeTab === "upcoming" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab("upcoming")}
          >
            Gelecek Planlar
          </Button>
          <Button 
            variant={activeTab === "past" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab("past")}
          >
            Geçmiş Planlar
          </Button>
        </div>
        
        {/* Filtreler */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button 
            variant={activeFilter === "all" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("all")}
            className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-700"
          >
            <FaFilter className="mr-1" />
            Tümü
          </Button>
          <Button 
            variant={activeFilter === "free" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("free")}
            className="bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 border border-gray-300 dark:border-gray-700"
          >
            <FaTags className="mr-1" />
            Ücretsiz
          </Button>
          <Button 
            variant={activeFilter === "online" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("online")}
            className="bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-gray-300 dark:border-gray-700"
          >
            <FaClock className="mr-1" />
            Online
          </Button>
          <Button 
            variant={activeFilter === "offline" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("offline")}
            className="bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 border border-gray-300 dark:border-gray-700"
          >
            <FaMapPin className="mr-1" />
            Yüz Yüze
          </Button>
        </div>
        
        {/* Planlar Listesi */}
        {filteredPlans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlans.map((plan) => (
              <PlanCard
                key={plan._id?.toString()}
                id={plan._id?.toString() || ""}
                title={plan.title}
                description={plan.description}
                date={new Date(plan.startDate)}
                location={plan.location || ""}
                imageUrl={plan.imageUrl}
                creator={plan.creator as any}
                isOnline={plan.isOnline}
                isFree={plan.isFree}
                price={plan.price}
                maxParticipants={plan.maxParticipants}
                participantCount={plan.participants?.length || 0}
                likes={plan.likes?.length || 0}
                saves={plan.saves?.length || 0}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <FaCalendarAlt className="mx-auto text-4xl text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Henüz Plan Bulunmuyor</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {activeTab !== "all" || activeFilter !== "all" 
                ? "Seçilen filtrelere uygun plan bulunamadı." 
                : "Bu kullanıcının henüz oluşturduğu bir plan bulunmuyor."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 
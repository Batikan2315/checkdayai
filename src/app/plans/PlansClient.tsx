"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PlanCard from "@/components/ui/PlanCard";
import { IPlan } from "@/lib/types";
import { toast } from "react-hot-toast";
import { FaFilter } from "react-icons/fa";
import Button from "@/components/ui/Button";

// Modern SearchBar bileşeni
const SearchBar = ({ placeholder, onSearch, initialValue, className }: { 
  placeholder: string; 
  onSearch: (value: string) => void; 
  initialValue?: string; 
  className?: string 
}) => {
  const [value, setValue] = useState(initialValue || '');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(value);
  };
  
  return (
    <form onSubmit={handleSubmit} className={`flex ${className}`}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-grow p-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button 
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 transition-colors"
      >
        Ara
      </button>
    </form>
  );
};

// Modern FilterBar bileşeni
const FilterBar = ({ 
  filters, 
  onFilterChange, 
  onClearFilters, 
  activeFiltersCount 
}: { 
  filters: { 
    isFree: string; 
    isOnline: string; 
    sortBy: string 
  }; 
  onFilterChange: (name: string, value: string) => void; 
  onClearFilters: () => void; 
  activeFiltersCount: number 
}) => {
  return (
    <div className="w-full">
      <div className="flex justify-center items-center gap-2 mb-4">
        <Button 
          size="sm"
          variant={filters.isFree === "true" ? "primary" : "outline"}
          onClick={() => onFilterChange('isFree', filters.isFree === "true" ? "" : "true")}
          className="min-w-[100px]"
        >
          Ücretsiz
        </Button>
        <Button 
          size="sm"
          variant={filters.isFree === "false" ? "primary" : "outline"}
          onClick={() => onFilterChange('isFree', filters.isFree === "false" ? "" : "false")}
          className="min-w-[100px]"
        >
          Ücretli
        </Button>
        <Button 
          size="sm"
          variant={filters.isOnline === "true" ? "primary" : "outline"}
          onClick={() => onFilterChange('isOnline', filters.isOnline === "true" ? "" : "true")}
          className="min-w-[100px]"
        >
          Online
        </Button>
        <Button 
          size="sm"
          variant={filters.isOnline === "false" ? "primary" : "outline"}
          onClick={() => onFilterChange('isOnline', filters.isOnline === "false" ? "" : "false")}
          className="min-w-[100px]"
        >
          Yüz Yüze
        </Button>
      </div>
      
      {activeFiltersCount > 0 && (
        <div className="flex justify-center mt-1 mb-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onClearFilters}
          >
            Filtreleri Temizle
          </Button>
        </div>
      )}
    </div>
  );
};

// Plan türlerini kullanmak için basit arayüzler
interface Creator {
  _id?: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
}

export default function PlansClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [plans, setPlans] = useState<IPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtre durumunu URL'den al
  const filters = {
    search: searchParams?.get("search") || "",
    isFree: searchParams?.get("isFree") || "",
    isOnline: searchParams?.get("isOnline") || "",
    sortBy: searchParams?.get("sortBy") || "startDate",
  };
  
  useEffect(() => {
    fetchPlans();
  }, [searchParams]);
  
  const fetchPlans = async () => {
    setLoading(true);
    try {
      // URL parametreleri al
      const params = new URLSearchParams(searchParams?.toString() || "");
      const response = await fetch(`/api/plans?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Planlar yüklenirken bir hata oluştu");
      }
      
      const data = await response.json();
      setPlans(data.plans);
      setError(null);
    } catch (error: any) {
      console.error("Plan yükleme hatası:", error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = (search: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (search) {
      params.set("search", search);
    } else {
      params.delete("search");
    }
    
    router.push(`/planlar?${params.toString()}`);
  };
  
  const handleFilterChange = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    
    router.push(`/planlar?${params.toString()}`);
  };
  
  const handleClearFilters = () => {
    router.push('/planlar');
  };
  
  const activeFiltersCount = Object.values(filters).filter(Boolean).length - (filters.sortBy ? 1 : 0);
  
  const getCreatorInfo = (creator: any): Creator | undefined => {
    if (!creator) {
      return {
        _id: "unknown",
        username: 'Anonim',
        profilePicture: '/images/avatars/default.png'
      };
    }
    
    if (typeof creator === 'string') {
      return {
        _id: creator,
        username: 'Kullanıcı',
        profilePicture: '/images/avatars/default.png'
      };
    }
    
    if (typeof creator === 'object') {
      // ObjectId olma ihtimaline karşı
      if (creator._bsontype === 'ObjectID') {
        return {
          _id: creator.toString ? creator.toString() : undefined,
          username: 'Kullanıcı',
          profilePicture: '/images/avatars/default.png'
        };
      }
      
      // Gerçek kullanıcı nesnesi
      const username = creator.username || 'Kullanıcı';
      const firstName = creator.firstName || '';
      const lastName = creator.lastName || '';
      
      return {
        _id: creator._id ? (typeof creator._id === 'object' ? creator._id.toString() : creator._id) : undefined,
        username: username,
        firstName: firstName,
        lastName: lastName,
        profilePicture: creator.profilePicture || '/images/avatars/default.png'
      };
    }
    
    return {
      _id: "unknown",
      username: 'Kullanıcı',
      profilePicture: '/images/avatars/default.png'
    };
  };
  
  return (
    <>
      <div className="mb-6">
        <div className="flex flex-col gap-4">
          <div className="w-full">
            <SearchBar
              placeholder="Plan ara..."
              onSearch={handleSearch}
              initialValue={filters.search}
              className="w-full"
            />
          </div>
          <FilterBar
            filters={{
              isFree: filters.isFree,
              isOnline: filters.isOnline,
              sortBy: filters.sortBy,
            }}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            activeFiltersCount={activeFiltersCount}
          />
        </div>
      </div>
      
      {error ? (
        <div className="bg-red-100 dark:bg-red-900 p-4 rounded mb-4">
          <p className="text-red-700 dark:text-red-200">{error}</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-xl text-gray-600 dark:text-gray-300">Henüz plan bulunamadı.</p>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Yeni bir plan oluşturmak ister misiniz?</p>
          <Button 
            className="mt-4"
            onClick={() => router.push('/plan/olustur')}
          >
            Plan Oluştur
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan._id ? plan._id.toString() : `plan-${Math.random()}`}
              id={plan._id ? plan._id.toString() : ''}
              title={plan.title || ''}
              description={plan.description || ''}
              date={new Date(plan.startDate || Date.now())}
              location={plan.location || ''}
              imageUrl={plan.imageUrl}
              creator={getCreatorInfo(plan.creator)}
              isOnline={Boolean(plan.isOnline)}
              isFree={Boolean(plan.isFree)}
              price={plan.price || 0}
              maxParticipants={plan.maxParticipants || 0}
              participantCount={plan.participants?.length || 0}
              likes={plan.likes?.length || 0}
              saves={plan.saves?.length || 0}
              isJoined={plan.participants?.includes(plan.creator) || false}
            />
          ))}
        </div>
      )}
    </>
  );
} 
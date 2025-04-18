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
        className="flex-grow p-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
      />
      <button 
        type="submit"
        className="bg-blue-600 text-white px-5 py-3 rounded-r-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
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
        <button 
          onClick={() => onFilterChange('isFree', filters.isFree === "true" ? "" : "true")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            filters.isFree === "true" 
              ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
          }`}
        >
          Ücretsiz
        </button>
        <button 
          onClick={() => onFilterChange('isFree', filters.isFree === "false" ? "" : "false")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            filters.isFree === "false" 
              ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
          }`}
        >
          Ücretli
        </button>
        <button 
          onClick={() => onFilterChange('isOnline', filters.isOnline === "true" ? "" : "true")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            filters.isOnline === "true" 
              ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
          }`}
        >
          Online
        </button>
        <button 
          onClick={() => onFilterChange('isOnline', filters.isOnline === "false" ? "" : "false")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            filters.isOnline === "false" 
              ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
          }`}
        >
          Yüz Yüze
        </button>
      </div>
      
      {activeFiltersCount > 0 && (
        <div className="flex justify-center mt-1 mb-2">
          <button 
            onClick={onClearFilters}
            className="px-4 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors border border-gray-300"
          >
            Filtreleri Temizle
          </button>
        </div>
      )}
    </div>
  );
};

// Plan türlerini kullanmak için basit arayüzler
interface Creator {
  _id: string; // ID'yi zorunlu yap
  username: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  profilePicture?: string;
  image?: string;
  googleProfilePicture?: string;
  email?: string;
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
  
  const getCreatorInfo = (creator: any): Creator => {
    // Creator hiç yok ise varsayılan değer kullan
    if (!creator) {
      return {
        _id: "unknown",
        username: 'Anonim',
        profilePicture: '/images/avatars/default.png'
      };
    }
    
    // Creator string ise (ID)
    if (typeof creator === 'string') {
      return {
        _id: creator,
        username: 'Kullanıcı',
        profilePicture: '/images/avatars/default.png'
      };
    }
    
    // Creator ObjectID ise
    if (creator._bsontype === 'ObjectID' || 
        (creator._id && typeof creator._id === 'string' && !creator.username)) {
      return {
        _id: creator.toString ? creator.toString() : String(creator),
        username: 'Kullanıcı',
        profilePicture: '/images/avatars/default.png'
      };
    }
    
    // Normal kullanıcı nesnesi - profil resmi kontrolü yap
    const profilePicture = creator.profilePicture || 
                           creator.googleProfilePicture || 
                           creator.image || 
                           '/images/avatars/default.png';
    
    // Kullanıcı adı kontrolü
    const username = creator.username || 
                    (creator.email ? creator.email.split('@')[0] : 'Kullanıcı');
    
    // Tam isim kontrolü
    const firstName = creator.firstName || '';
    const lastName = creator.lastName || '';
    const name = creator.name || '';
    
    return {
      _id: creator._id ? (typeof creator._id === 'object' ? creator._id.toString() : creator._id) : 'unknown',
      username,
      firstName,
      lastName,
      name,
      profilePicture,
      image: creator.image,
      googleProfilePicture: creator.googleProfilePicture,
      email: creator.email
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
              isJoined={plan.participants?.some(participant => {
                // Participant ID'sini string'e dönüştür
                const participantId = typeof participant === 'object' 
                  ? ('_id' in participant ? participant._id.toString() : String(participant))
                  : String(participant);
                
                // Creator ID'sini string'e dönüştür
                const creatorId = typeof plan.creator === 'object' 
                  ? ('_id' in plan.creator ? plan.creator._id.toString() : String(plan.creator))
                  : typeof plan.creator === 'string' 
                    ? plan.creator 
                    : String(plan.creator || '');
                
                return participantId === creatorId;
              }) || false}
            />
          ))}
        </div>
      )}
    </>
  );
} 
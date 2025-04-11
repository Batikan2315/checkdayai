import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { IPlan } from "./types";

// Tarih biçimlendirme
export const formatDate = (date: string | Date): string => {
  if (!date) return "";
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, "d MMMM yyyy", { locale: tr });
};

// Tarih ve saat biçimlendirme
export const formatDateTime = (date: string | Date): string => {
  if (!date) return "";
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, "d MMMM yyyy, HH:mm", { locale: tr });
};

// Tarih aralığı biçimlendirme
export const formatDateRange = (startDate: string | Date, endDate: string | Date): string => {
  if (!startDate || !endDate) return "";
  
  const start = typeof startDate === "string" ? parseISO(startDate) : startDate;
  const end = typeof endDate === "string" ? parseISO(endDate) : endDate;
  
  // Aynı gün içinde ise sadece saatleri göster
  if (format(start, "yyyy-MM-dd") === format(end, "yyyy-MM-dd")) {
    return `${format(start, "d MMMM yyyy", { locale: tr })} ${format(start, "HH:mm")} - ${format(end, "HH:mm")}`;
  }
  
  // Farklı günlerde ise tam tarihleri göster
  return `${format(start, "d MMMM yyyy, HH:mm", { locale: tr })} - ${format(end, "d MMMM yyyy, HH:mm", { locale: tr })}`;
};

// Para biçimlendirme
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(amount);
};

// Kısaltılmış sayı biçimlendirme (1K, 1M gibi)
export const formatNumber = (number: number): string => {
  if (number < 1000) return number.toString();
  if (number < 1000000) return `${(number / 1000).toFixed(1)}B`;
  return `${(number / 1000000).toFixed(1)}M`;
};

// Görsel URL'sini optimize et
export const getOptimizedImageUrl = (imageUrl: string, width = 600): string => {
  if (!imageUrl) return "/images/default-plan.jpg";
  
  // Zaten Cloudinary URL'i ise genişlik parametresini güncelle
  if (imageUrl.includes("cloudinary")) {
    return imageUrl.replace(/\/upload\//, `/upload/w_${width},c_scale/`);
  }
  
  return imageUrl;
};

// Planların filtrelenmesi
export const filterPlans = (plans: IPlan[], search: string, filterOptions: any = {}): IPlan[] => {
  if (!plans || plans.length === 0) return [];
  
  let filtered = [...plans];
  
  // Arama metni ile filtrele
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      (plan) =>
        plan.title.toLowerCase().includes(searchLower) ||
        plan.description.toLowerCase().includes(searchLower) ||
        (plan.location && plan.location.toLowerCase().includes(searchLower))
    );
  }
  
  // Diğer filtreleme seçenekleri
  if (filterOptions.isFree === true) {
    filtered = filtered.filter((plan) => plan.isFree);
  } else if (filterOptions.isFree === false) {
    filtered = filtered.filter((plan) => !plan.isFree);
  }
  
  if (filterOptions.isOnline === true) {
    filtered = filtered.filter((plan) => plan.isOnline);
  } else if (filterOptions.isOnline === false) {
    filtered = filtered.filter((plan) => !plan.isOnline);
  }
  
  if (filterOptions.startDate) {
    filtered = filtered.filter(
      (plan) => new Date(plan.startDate) >= new Date(filterOptions.startDate)
    );
  }
  
  if (filterOptions.endDate) {
    filtered = filtered.filter(
      (plan) => new Date(plan.endDate) <= new Date(filterOptions.endDate)
    );
  }
  
  return filtered;
};

// Kullanıcı adını formatla
export const formatUsername = (username: string): string => {
  if (!username) return "";
  return "@" + username;
};

// Tam ad formatla
export const formatFullName = (firstName?: string, lastName?: string): string => {
  if (!firstName && !lastName) return "İsimsiz Kullanıcı";
  if (!firstName) return lastName || "";
  if (!lastName) return firstName;
  return `${firstName} ${lastName}`;
};

/**
 * Kısa tarih formatla
 * @param date Formatlanacak tarih
 * @returns Formatlanmış tarih (örn: 12 Ara 2023)
 */
export function formatShortDate(date: Date): string {
  const months = [
    "Oca", "Şub", "Mar", "Nis", "May", "Haz", 
    "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
} 
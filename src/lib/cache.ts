/**
 * API istekleri için gelişmiş önbellek (cache) sistemi
 * Bu sistem, API isteklerini önbelleğe alarak tekrarlanan isteklerin 
 * performansını ve uygulamanın hızını artırır
 */

type CacheItem<T> = {
  data: T;
  timestamp: number;
  expires: number;
};

class ApiCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 dakika varsayılan
  private maxCacheSize: number = 100; // Maksimum cache öğesi sayısı
  private hitCount: number = 0;
  private missCount: number = 0;

  /**
   * Cache'den veri almayı dener
   * @param key Önbellek anahtarı
   * @returns Önbellekteki veri veya null
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.missCount++;
      return null;
    }

    // Verinin süresi dolmuş mu kontrol et
    if (Date.now() > item.expires) {
      this.delete(key);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    // Erişim sıklığı için yeniden sıralama
    this.cache.delete(key);
    this.cache.set(key, item);
    
    return item.data as T;
  }

  /**
   * Önbelleğe veri ekler
   * @param key Önbellek anahtarı
   * @param data Saklanacak veri
   * @param ttl Milisaniye cinsinden yaşam süresi (isteğe bağlı)
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Eğer önbellek maksimum boyuta ulaştıysa, en eski kaydı sil
    if (this.cache.size >= this.maxCacheSize) {
      // Array'e dönüştürerek ilk anahtarı al (Map iterasyon sorunu için daha güvenli)
      const keys = Array.from(this.cache.keys());
      if (keys.length > 0) {
        this.delete(keys[0]);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expires: Date.now() + (ttl || this.defaultTTL)
    });
  }

  /**
   * Önbellekten bir kaydı siler
   * @param key Önbellek anahtarı
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Belirli bir pattern ile eşleşen tüm kayıtları siler
   * @param pattern Anahtar pattern'i (regex veya string)
   */
  deletePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
      : pattern;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
      }
    }
  }

  /**
   * Tüm önbelleği temizler
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Önbellek istatistiklerini döndürür
   */
  getStats() {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;
    
    return {
      size: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: `${hitRate.toFixed(2)}%`
    };
  }

  /**
   * Varsayılan TTL süresini ayarlar
   * @param ttl Milisaniye cinsinden yaşam süresi
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }

  /**
   * Maksimum önbellek boyutunu ayarlar
   * @param size Maksimum kayıt sayısı
   */
  setMaxSize(size: number): void {
    this.maxCacheSize = size;
  }
}

// Singleton örneği
export const apiCache = new ApiCache();

/**
 * API isteklerini önbellekle birlikte yürütmek için yardımcı fonksiyon
 * @param url API endpoint URL'i
 * @param options Fetch seçenekleri
 * @param ttl Önbellek TTL (ms)
 */
export async function fetchWithCache<T>(
  url: string,
  options: RequestInit = {},
  ttl?: number,
  forceFresh: boolean = false
): Promise<T> {
  // GET istekleri için önbellek kullan, diğerlerinde kullanma
  if (options.method && options.method !== 'GET') {
    const response = await fetch(url, options);
    return await response.json();
  }

  // Önbellek anahtarını oluştur (URL + parametreler)
  const cacheKey = `${url}${options.body ? `-${JSON.stringify(options.body)}` : ''}`;
  
  // Zorla yenileme istenmediyse önbellekten ver
  if (!forceFresh) {
    const cachedData = apiCache.get<T>(cacheKey);
    if (cachedData) {
      return cachedData;
    }
  }

  // Önbellekte yoksa veya yenileme isteniyorsa, gerçek istekte bulun
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`API isteği başarısız: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Önbelleğe ekle
    apiCache.set<T>(cacheKey, data, ttl);
    
    return data;
  } catch (error) {
    console.error('API isteği hatası:', error);
    throw error;
  }
}

export default apiCache; 
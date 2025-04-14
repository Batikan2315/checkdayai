/**
 * Basit bir bellek-içi önbellek sistemi
 * Büyük ölçekli uygulamalar için Redis, Memcached gibi çözümlerle değiştirilmelidir
 */

interface CacheItem {
  data: any;
  timestamp: number;
}

class MemoryCache {
  private cache: Record<string, CacheItem> = {};
  private defaultTTL: number = 60 * 1000; // 60 saniye varsayılan

  /**
   * Önbellekten veri al
   * @param key Önbellek anahtarı
   * @returns Önbellekteki veri veya null
   */
  get(key: string): any {
    const item = this.cache[key];
    if (!item) return null;

    // TTL kontrolü
    if (Date.now() - item.timestamp > this.defaultTTL) {
      this.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Önbelleğe veri ekle
   * @param key Önbellek anahtarı
   * @param data Saklanacak veri
   * @param ttl Milisaniye cinsinden yaşam süresi (isteğe bağlı)
   */
  set(key: string, data: any, ttl?: number): void {
    this.cache[key] = {
      data,
      timestamp: Date.now(),
    };

    // Belirtilen TTL varsa, süre sonunda otomatik temizle
    if (ttl) {
      setTimeout(() => {
        this.delete(key);
      }, ttl);
    }
  }

  /**
   * Önbellekten veri sil
   * @param key Önbellek anahtarı
   */
  delete(key: string): void {
    delete this.cache[key];
  }

  /**
   * Belirlenen önekle başlayan tüm anahtarları temizle
   * @param prefix Önbellek anahtarı öneki
   */
  invalidateByPrefix(prefix: string): void {
    Object.keys(this.cache).forEach(key => {
      if (key.startsWith(prefix)) {
        this.delete(key);
      }
    });
  }

  /**
   * Tüm önbelleği temizle
   */
  clear(): void {
    this.cache = {};
  }

  /**
   * Önbellekteki öğe sayısını al
   */
  size(): number {
    return Object.keys(this.cache).length;
  }

  /**
   * Varsayılan TTL'yi ayarla
   * @param ttl Milisaniye cinsinden yaşam süresi
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }
}

// Singleton örnek
const cacheInstance = new MemoryCache();

export default cacheInstance; 
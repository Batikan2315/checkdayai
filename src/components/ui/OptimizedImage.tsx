import React, { useState, useEffect, useRef, memo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  loadingPlaceholder?: 'blur' | 'empty' | 'shimmer';
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  onClick?: () => void;
}

const optimizeImageUrl = (src: string, width: number): string => {
  if (!src) return '';
  
  // Zaten optimize edilmiş URL'leri kontrol et
  if (src.includes('res.cloudinary.com')) {
    // Cloudinary için optimize et
    const baseUrl = src.split('/upload/')[0];
    const imageId = src.split('/upload/')[1];
    
    if (baseUrl && imageId) {
      return `${baseUrl}/upload/c_scale,w_${width},q_auto:good,f_auto/${imageId}`;
    }
  }
  
  return src;
};

const OptimizedImage = memo(({
  src,
  alt,
  width = 300,
  height,
  className = '',
  priority = false,
  loadingPlaceholder = 'shimmer',
  objectFit = 'cover',
  onClick
}: OptimizedImageProps) => {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  
  // Lazy loading için IntersectionObserver kullan
  useEffect(() => {
    if (!priority && imgRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { rootMargin: '200px' }
      );
      
      observer.observe(imgRef.current);
      
      return () => {
        if (imgRef.current) {
          observer.disconnect();
        }
      };
    } else {
      setIsVisible(true);
    }
  }, [priority]);
  
  // Görüntü yükleme hatası için fallback
  const handleError = () => {
    setIsError(true);
    setIsLoading(false);
    setImgSrc('/images/fallback.jpg');
  };
  
  // Görüntü yükleme tamamlandığında
  const handleLoad = () => {
    setIsLoading(false);
  };
  
  // Optimize edilmiş URL'yi oluştur
  useEffect(() => {
    if (src) {
      setImgSrc(optimizeImageUrl(src, width));
      setIsError(false);
      setIsLoading(true);
    }
  }, [src, width]);
  
  // Shimmer efekti için placeholder
  const shimmerPlaceholder = (
    <div className="animate-pulse flex">
      <div className={`bg-gray-200 rounded ${className}`} style={{ width, height }}></div>
    </div>
  );
  
  // Yükleme durumunda placeholder göster
  if (!isVisible || (isLoading && loadingPlaceholder === 'shimmer')) {
    return (
      <div ref={imgRef}>
        {shimmerPlaceholder}
      </div>
    );
  }
  
  // Hata durumunda fallback göster
  if (isError) {
    return (
      <div 
        ref={imgRef}
        className={cn("relative overflow-hidden", className)}
        style={{ width, height }}
        onClick={onClick}
      >
        <div className="flex items-center justify-center w-full h-full bg-gray-100 text-gray-400 text-sm">
          Görüntü yüklenemedi
        </div>
      </div>
    );
  }
  
  // Görseli göster
  return (
    <div 
      ref={imgRef}
      className={cn("relative overflow-hidden", className)}
      style={{ width, height }}
      onClick={onClick}
    >
      <Image
        src={imgSrc}
        alt={alt}
        width={width}
        height={height || width}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        style={{
          objectFit: objectFit,
          maxWidth: '100%',
          height: 'auto',
        }}
        loading={priority ? 'eager' : 'lazy'}
        priority={priority}
        quality={80}
        onLoad={handleLoad}
        onError={handleError}
        placeholder={loadingPlaceholder === 'blur' ? 'blur' : 'empty'}
        sizes={`(max-width: 768px) 100vw, (max-width: 1200px) 50vw, ${width}px`}
      />
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage; 
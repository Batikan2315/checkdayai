import { useRef, useEffect } from 'react';

export default function useHorizontalScroll() {
  const elRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      
      // Varsayılan dikey kaydırmayı engelle
      e.preventDefault();
      
      // Yatay kaydırma miktarını ayarla
      el.scrollTo({
        left: el.scrollLeft + e.deltaY,
        behavior: 'smooth'
      });
    };
    
    // Fare tekerleği olayını dinle
    el.addEventListener('wheel', onWheel);
    
    // Component unmount olduğunda olayı temizle
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  
  return elRef;
} 
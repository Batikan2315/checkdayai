import React, { lazy, Suspense } from 'react';

// Komponenti yükleme ekranı ile lazy yükleme utility fonksiyonu
export function lazyLoad(
  importFunc: () => Promise<{ default: React.ComponentType<any> }>,
  fallback: React.ReactNode = <LazyLoadingSpinner />
) {
  const LazyComponent = lazy(importFunc);
  
  return (props: any) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

// Yükleniyor ekranı
export const LazyLoadingSpinner = () => (
  <div className="flex justify-center items-center p-4">
    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Daha büyük skeleton ekranlar için
export const LazyLoadingBox = ({ height = 'h-32', width = 'w-full' }) => (
  <div className={`${width} ${height} bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md`}></div>
);

// Büyük bileşenler için iskelet yükleme ekranı
export const LazyLoadingCardSkeleton = () => (
  <div className="border rounded shadow-sm p-4 w-full">
    <div className="w-1/2 h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mb-4"></div>
    <div className="w-full h-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mb-4"></div>
    <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mb-2"></div>
    <div className="w-1/2 h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
  </div>
);

// Örnek kullanım:
// import { lazyLoad } from '@/components/LazyLoadComponents';
// const LazyComponent = lazyLoad(() => import('./HeavyComponent'));
// ...
// <LazyComponent prop1={value1} prop2={value2} /> 
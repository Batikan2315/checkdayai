"use client";

import React from "react";
import { twMerge } from "tailwind-merge";

interface PageContainerProps {
  title?: string;
  className?: string;
  children: React.ReactNode;
}

const PageContainer: React.FC<PageContainerProps> = ({
  title,
  className,
  children,
}) => {
  return (
    <div
      className={twMerge(
        "container mx-auto px-4 pt-12 pb-4 sm:pt-16 sm:pb-6 md:pt-16 md:pb-8 mb-16 md:mb-0",
        className
      )}
    >
      {title && (
        <h1 className="text-xl sm:text-2xl font-bold mb-3 text-gray-900 dark:text-white">
          {title}
        </h1>
      )}
      {children}
    </div>
  );
};

export default PageContainer; 
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
        "container mx-auto px-4 py-2 sm:pt-4 md:pt-6",
        className
      )}
    >
      {title && (
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          {title}
        </h1>
      )}
      {children}
    </div>
  );
};

export default PageContainer; 
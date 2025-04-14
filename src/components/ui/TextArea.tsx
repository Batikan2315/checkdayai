import React, { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, className, fullWidth = false, ...props }, ref) => {
    const textAreaClasses = twMerge(
      "px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
      error
        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
        : "border-gray-300 dark:border-gray-600 focus:border-blue-500",
      "bg-white dark:bg-gray-700 text-gray-900 dark:text-white",
      fullWidth ? "w-full" : "",
      className
    );

    return (
      <div className={fullWidth ? "w-full" : ""}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={textAreaClasses}
          rows={4}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

TextArea.displayName = "TextArea";

export default TextArea; 
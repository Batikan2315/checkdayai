import React from "react";

export default function AICheckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ai-check-layout">
      {children}
    </div>
  );
} 
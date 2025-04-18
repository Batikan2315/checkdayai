"use client";

import React from "react";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider
      refetchInterval={5 * 60} // 5 dakikada bir yenile
      refetchOnWindowFocus={true} // Sekme aktif olduğunda yenile
    >
      <ThemeProvider attribute="class" defaultTheme="light">
        <AuthProvider>
          <SocketProvider>
            {children}
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </SessionProvider>
  );
} 
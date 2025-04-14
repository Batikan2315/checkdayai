"use client";

import React, { useState, useEffect } from "react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdminStatus() {
      try {
        // MongoDB'deki gerçek rol bilgisini al
        const response = await fetch('/api/auth/check-admin');
        const data = await response.json();
        
        // Token ve veritabanı rolleri arasındaki tutarsızlığı logla
        if (data.tokenRole !== data.dbRole) {
          console.warn("Rol tutarsızlığı tespit edildi:", {
            tokenRole: data.tokenRole,
            dbRole: data.dbRole
          });
        }
        
        setIsAdmin(data.isAdmin);
        setLoading(false);
      } catch (error) {
        console.error("Admin kontrolü sırasında hata:", error);
        setLoading(false);
      }
    }

    if (status === "loading") {
      // Oturum henüz yükleniyor, bekle
      return;
    } else if (status === "unauthenticated") {
      // Giriş yapılmamış, anasayfaya yönlendir
      redirect("/giris");
    } else {
      // Oturum yüklendi, admin kontrolü yap
      checkAdminStatus();
    }
  }, [status]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 dark:text-gray-400">Yükleniyor...</p>
      </div>
    );
  }

  if (!isAdmin) {
    redirect("/");
  }

  return <>{children}</>;
} 
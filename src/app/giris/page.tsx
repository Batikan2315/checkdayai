"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LoginForm from "./LoginForm";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
import { FaLock } from "react-icons/fa";

export default function Login() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Oturum açıksa ana sayfaya yönlendir
  React.useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);
  
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center py-6">
          <div className="mx-auto bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mb-4">
            <FaLock className="text-blue-600 text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Giriş Yap</h1>
          <p className="text-gray-600 mt-2">CheckDay hesabınıza giriş yapın</p>
        </CardHeader>
        
        <CardBody>
          <LoginForm />
        </CardBody>
        
        <CardFooter className="text-center border-t border-gray-200 py-4">
          <p className="text-gray-600">
            Hesabınız yok mu?{" "}
            <Link href="/kayit" className="text-blue-600 hover:text-blue-800 font-medium">
              Kayıt Ol
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
} 
"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { FaGoogle } from 'react-icons/fa';
import { useSearchParams } from "next/navigation";

// SearchParams için ayrı bir bileşen
function LoginErrorHandler() {
  const [errorMessage, setErrorMessage] = useState("");
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // URL'deki hata parametresini kontrol et
    const error = searchParams?.get("error");
    if (error) {
      console.log("Login error:", error);
      
      // Hata mesajını belirle
      if (error === "AccessDenied") {
        setErrorMessage("Google hesabınıza erişim reddedildi. Lütfen yöneticiyle iletişime geçin.");
      } else if (error === "OAuthSignin") {
        setErrorMessage("Google ile giriş başlatılırken bir hata oluştu.");
      } else if (error === "OAuthCallback") {
        setErrorMessage("Google'dan geri dönen bilgilerde sorun var.");
      } else {
        setErrorMessage(`Giriş yaparken bir hata oluştu: ${error}`);
      }
    }
  }, [searchParams]);
  
  if (!errorMessage) return null;
  
  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-5">
      <p>{errorMessage}</p>
    </div>
  );
}

export default function Login() {
  const { loginWithGoogle } = useAuth();

  const handleGoogleLogin = async () => {
    await loginWithGoogle();
  };

  return (
    <div className="flex min-h-screen justify-center items-center p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-bold">CheckDay'e Giriş Yap</h1>
          <p className="text-gray-600 dark:text-gray-400">Plan ve etkinliklerinizi keşfetmeye devam edin</p>
        </CardHeader>
        <CardBody className="space-y-6">
          <Suspense fallback={null}>
            <LoginErrorHandler />
          </Suspense>
          <Button 
            onClick={handleGoogleLogin}
            type="button"
            variant="primary"
            fullWidth
            className="flex items-center justify-center"
          >
            <FaGoogle className="mr-2" />
            Google ile Giriş Yap
          </Button>
        </CardBody>
      </Card>
    </div>
  );
} 
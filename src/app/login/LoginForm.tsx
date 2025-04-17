"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import { signIn } from "next-auth/react";
import { FaGoogle } from "react-icons/fa";

interface LoginFormProps {
  callbackUrl?: string;
}

const LoginForm = ({ callbackUrl = "/" }: LoginFormProps) => {
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      await signIn("google", {
        callbackUrl: callbackUrl
      });
    } catch (error) {
      console.error("Google girişi hatası:", error);
      toast.error("Google ile giriş yapılırken bir hata oluştu");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="text-xl font-semibold mb-4">CheckDay'e Hoş Geldiniz</h2>
      <p className="text-gray-600 mb-8 text-center max-w-md">
        Planlarınızı oluşturun, etkinliklere katılın ve CheckDay'in tüm özelliklerinden yararlanmak için Google hesabınızla giriş yapın.
      </p>
      
      <Button
        type="button"
        variant="primary"
        fullWidth
        onClick={handleGoogleLogin}
        loading={googleLoading}
        className="max-w-md flex items-center justify-center"
        size="lg"
      >
        <FaGoogle className="mr-2" />
        Google ile Giriş Yap
      </Button>
      
      <div className="mt-8 text-sm text-gray-500 text-center max-w-md">
        <p>
          Google ile giriş yaparak, CheckDay'in 
          <Link href="/terms" className="text-blue-600 hover:underline mx-1">Kullanım Şartları</Link>
          ve
          <Link href="/privacy" className="text-blue-600 hover:underline mx-1">Gizlilik Politikası</Link>
          'nı kabul etmiş olursunuz.
        </p>
      </div>
    </div>
  );
};

export default LoginForm; 
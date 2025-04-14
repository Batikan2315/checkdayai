"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import PageContainer from "@/components/layout/PageContainer";

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { resetPassword } = useAuth();
  
  const [token, setToken] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [tokenVerified, setTokenVerified] = useState<boolean | null>(null);
  
  useEffect(() => {
    if (!searchParams) {
      toast.error("Geçersiz şifre sıfırlama bağlantısı");
      router.push("/giris");
      return;
    }
    
    const urlToken = searchParams.get("token");
    if (!urlToken) {
      toast.error("Geçersiz şifre sıfırlama bağlantısı");
      router.push("/giris");
      return;
    }
    
    setToken(urlToken);
    // Token varlığını kontrol et ve token doğrulama işlevi buraya eklenebilir
    setTokenVerified(true);
  }, [searchParams, router]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Şifre eşleşme kontrolü
    if (newPassword !== confirmPassword) {
      toast.error("Şifreler eşleşmiyor");
      return;
    }
    
    // Şifre uzunluğu kontrolü
    if (newPassword.length < 6) {
      toast.error("Şifre en az 6 karakter olmalıdır");
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await resetPassword(token, newPassword);
      
      if (result.success) {
        toast.success(result.message || "Şifreniz başarıyla güncellendi");
        // Başarılı şifre sıfırlamadan sonra giriş sayfasına yönlendir
        setTimeout(() => {
          router.push("/giris");
        }, 2000);
      } else {
        // Hata kodlarına göre özel mesajlar
        if (result.code === "INVALID_TOKEN") {
          toast.error("Geçersiz veya süresi dolmuş bağlantı. Lütfen yeni bir şifre sıfırlama isteği oluşturun.");
          setTimeout(() => {
            router.push("/giris");
          }, 3000);
        } else if (result.code === "USER_NOT_FOUND") {
          toast.error("Kullanıcı bulunamadı. Lütfen yeni bir hesap oluşturun.");
          setTimeout(() => {
            router.push("/kayit");
          }, 3000);
        } else {
          toast.error(result.message || "Şifre güncellenirken bir hata oluştu");
        }
      }
    } catch (error) {
      console.error("Şifre sıfırlama hatası:", error);
      toast.error("Şifre güncellenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };
  
  // Token doğrulanamadıysa veya hata varsa
  if (tokenVerified === false) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h1 className="text-xl font-semibold mb-4 text-center">Geçersiz Bağlantı</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
          Şifre sıfırlama bağlantınız geçersiz veya süresi dolmuş.
        </p>
        <Button onClick={() => router.push("/giris")} className="w-full">
          Giriş Sayfasına Dön
        </Button>
      </div>
    );
  }
  
  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h1 className="text-xl font-semibold mb-4 text-center">Yeni Şifre Oluştur</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
        Lütfen hesabınız için yeni bir şifre belirleyin.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Yeni Şifre"
            required
            minLength={6}
            className="w-full"
          />
        </div>
        
        <div className="mb-6">
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Şifreyi Tekrarla"
            required
            minLength={6}
            className="w-full"
          />
        </div>
        
        <Button
          type="submit"
          disabled={loading}
          loading={loading}
          className="w-full"
        >
          {loading ? "İşleniyor..." : "Şifremi Güncelle"}
        </Button>
      </form>
    </div>
  );
} 
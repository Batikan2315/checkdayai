"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import { signIn } from "next-auth/react";

const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendVerificationLoading, setResendVerificationLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  
  const router = useRouter();
  const { login, error } = useAuth();

  useEffect(() => {
    if (error === "email_verification_required") {
      setVerificationEmail(formData.email);
      setNeedsVerification(true);
    }
  }, [error, formData.email]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const checkEmailVerification = async (email: string) => {
    try {
      const response = await fetch("/api/auth/check-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      console.log("Doğrulama durumu:", data);
      
      if (!data.isVerified) {
        toast.error(
          <div>
            <p>E-posta adresiniz henüz doğrulanmamış.</p>
            <button 
              onClick={() => handleResendVerification(email)}
              className="mt-2 underline text-blue-500 cursor-pointer"
            >
              Doğrulama e-postasını tekrar gönder
            </button>
          </div>,
          { duration: 8000 }
        );
        
        return false;
      }
      
      return data.isVerified;
    } catch (error) {
      console.error("Doğrulama kontrolü hatası:", error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error("Lütfen e-posta ve şifre girin");
      return;
    }
    
    setLoading(true);
    
    try {
      const success = await login(formData.email, formData.password);
      
      if (success) {
        toast.success("Giriş başarılı!");
        router.push("/");
      } else {
        await checkEmailVerification(formData.email);
      }
    } catch (error) {
      console.error("Giriş hatası:", error);
      await checkEmailVerification(formData.email);
    } finally {
      setLoading(false);
    }
  };
  
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail) {
      toast.error('Lütfen e-posta adresinizi girin');
      return;
    }

    setResetPasswordLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.code === "GOOGLE_USER") {
          toast.error('Bu hesap Google ile kaydedilmiş. Lütfen Google ile giriş yapın.');
        } else if (errorData.code === "INVALID_EMAIL_FORMAT") {
          toast.error('Geçerli bir e-posta adresi giriniz.');
        } else {
          toast.error(errorData.message || 'Şifre sıfırlama bağlantısı gönderilemedi');
        }
        throw new Error(errorData.message || 'Şifre sıfırlama hatası');
      }

      const data = await response.json();
      toast.success(data.message || 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi');
      setShowForgotPassword(false);
    } catch (error) {
      console.error('Şifre sıfırlama hatası:', error);
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      const result = await signIn("google", {
        redirect: false,
        callbackUrl: "/"
      });
      
      if (result?.error) {
        toast.error("Google girişi başarısız: " + result.error);
      } else if (result?.url) {
        router.push(result.url);
      }
    } catch (error) {
      console.error("Google girişi hatası:", error);
      toast.error("Google ile giriş yapılırken bir hata oluştu");
    } finally {
      setGoogleLoading(false);
    }
  };
  
  const handleResendVerification = async (email: string) => {
    try {
      setResendVerificationLoading(true);
      
      if (!email) {
        toast.error("E-posta adresi bulunamadı");
        return;
      }
      
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success("Doğrulama e-postası tekrar gönderildi. Lütfen e-postanızı kontrol edin.");
        setNeedsVerification(false);
      } else {
        toast.error(data.message || "Doğrulama e-postası gönderilemedi");
      }
    } catch (error) {
      console.error("Doğrulama e-postası gönderme hatası:", error);
      toast.error("Doğrulama e-postası gönderilirken bir hata oluştu");
    } finally {
      setResendVerificationLoading(false);
    }
  };

  if (needsVerification) {
    return (
      <div className="w-full">
        <h2 className="text-xl font-semibold mb-4">E-posta Doğrulama Gerekli</h2>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                E-posta adresiniz henüz doğrulanmamış. Lütfen e-postanızı kontrol edin veya yeni bir doğrulama e-postası göndermek için aşağıdaki butona tıklayın.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col space-y-4">
          <Button 
            onClick={() => handleResendVerification(verificationEmail)}
            disabled={resendVerificationLoading}
            loading={resendVerificationLoading}
          >
            {resendVerificationLoading ? "Gönderiliyor..." : "Doğrulama E-postasını Tekrar Gönder"}
          </Button>
          
          <button
            type="button"
            onClick={() => setNeedsVerification(false)}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Giriş formuna dön
          </button>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="w-full">
        <h2 className="text-xl font-semibold mb-4">Şifremi Unuttum</h2>
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div>
            <label htmlFor="forgotPasswordEmail" className="block text-sm font-medium text-gray-700 mb-1">
              E-posta Adresi
            </label>
            <Input
              id="forgotPasswordEmail"
              name="forgotPasswordEmail"
              type="email"
              placeholder="E-posta adresinizi girin"
              value={forgotPasswordEmail}
              onChange={(e) => setForgotPasswordEmail(e.target.value)}
              required
              className="w-full"
            />
          </div>
          
          <div className="flex flex-col space-y-2">
            <Button type="submit" disabled={resetPasswordLoading}>
              {resetPasswordLoading ? "Gönderiliyor..." : "Şifre Sıfırlama Bağlantısı Gönder"}
            </Button>
            
            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Giriş formuna dön
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-4">Giriş Yap</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            E-posta Adresi
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="E-posta adresinizi girin"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full"
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Şifre
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Şifrenizi girin"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full"
          />
        </div>
        
        <div className="flex flex-col space-y-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
          </Button>
          
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Şifremi Unuttum
            </button>
          </div>
          
          <div className="text-center text-sm">
            Hesabınız yok mu?{" "}
            <Link href="/kayit" className="text-blue-600 hover:text-blue-800">
              Kayıt Ol
            </Link>
          </div>
        </div>
      </form>
      
      <div className="relative mt-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            veya şununla devam et
          </span>
        </div>
      </div>
      
      <Button
        type="button"
        variant="outline"
        fullWidth
        loading={googleLoading}
        onClick={handleGoogleLogin}
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
          />
        </svg>
        Google ile Giriş Yap
      </Button>
    </div>
  );
};

export default LoginForm; 
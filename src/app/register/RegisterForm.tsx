"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import { signIn } from "next-auth/react";
import Link from "next/link";

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
  });
  
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { register } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Tüm alanları kontrol et
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      toast.error("Lütfen zorunlu alanları doldurun");
      return;
    }
    
    // Şifre eşleşmesini kontrol et
    if (formData.password !== formData.confirmPassword) {
      toast.error("Şifreler eşleşmiyor");
      return;
    }
    
    setLoading(true);
    
    try {
      const success = await register({
        email: formData.email,
        password: formData.password,
        username: formData.username,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      
      if (success) {
        toast.success("Kayıt başarılı! Giriş yapabilirsiniz.");
        router.push("/login");
      }
    } catch (error) {
      console.error("Kayıt hatası:", error);
      toast.error("Kayıt sırasında bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  // Google ile giriş fonksiyonu
  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      const result = await signIn("google", {
        redirect: false,
        callbackUrl: "/"
      });
      
      if (result?.error) {
        toast.error("Google ile giriş başarısız: " + result.error);
      } else if (result?.url) {
        router.push(result.url);
      }
    } catch (error) {
      console.error("Google ile giriş hatası:", error);
      toast.error("Google ile giriş yapılırken bir hata oluştu");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Ad"
          type="text"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
          placeholder="Adınız"
          fullWidth
        />
        
        <Input
          label="Soyad"
          type="text"
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
          placeholder="Soyadınız"
          fullWidth
        />
      </div>
      
      <Input
        label="E-posta *"
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="ornek@mail.com"
        required
        fullWidth
      />
      
      <Input
        label="Kullanıcı Adı"
        type="text"
        name="username"
        value={formData.username}
        onChange={handleChange}
        placeholder="kullanici_adi"
        fullWidth
      />
      
      <Input
        label="Şifre *"
        type="password"
        name="password"
        value={formData.password}
        onChange={handleChange}
        placeholder="••••••••"
        required
        fullWidth
      />
      
      <Input
        label="Şifre Tekrar *"
        type="password"
        name="confirmPassword"
        value={formData.confirmPassword}
        onChange={handleChange}
        placeholder="••••••••"
        required
        fullWidth
      />
      
      <div className="flex items-start mb-4">
        <div className="flex items-center h-5">
          <input
            id="terms"
            type="checkbox"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            required
          />
        </div>
        <label
          htmlFor="terms"
          className="ml-2 text-sm text-gray-700 dark:text-gray-300"
        >
          <span>
            <a
              href="#"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Şartlar ve koşulları
            </a>{" "}
            kabul ediyorum
          </span>
        </label>
      </div>
      
      <Button
        type="submit"
        fullWidth
        loading={loading}
      >
        {loading ? "Kayıt Olunuyor..." : "Kayıt Ol"}
      </Button>
      
      <div className="relative">
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
        onClick={handleGoogleSignIn}
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
          />
        </svg>
        Google ile Kayıt Ol
      </Button>
      
      <div className="text-center text-sm">
        Hesabınız var mı?{" "}
        <Link href="/login" className="text-blue-600 hover:text-blue-800">
          Giriş Yap
        </Link>
      </div>
    </form>
  );
};

export default RegisterForm; 
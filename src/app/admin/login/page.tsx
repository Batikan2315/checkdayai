"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { toast } from "react-hot-toast";
import { FaLock, FaUserShield } from "react-icons/fa";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  // Zaten giriş yapmış admin kullanıcı varsa doğrudan admin paneline yönlendir
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (status === "authenticated") {
        try {
          const response = await fetch('/api/auth/check-admin', {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.isAdmin) {
              router.push('/admin');
            }
          }
        } catch (error) {
          console.error("Admin kontrolü hatası:", error);
        }
      }
    };
    
    checkAdminStatus();
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("E-posta ve şifre zorunludur");
      return;
    }
    
    try {
      setLoading(true);
      
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      
      if (result?.error) {
        toast.error(result.error || "Giriş yapılırken bir hata oluştu");
        return;
      }
      
      // Admin yetkisini kontrol et
      const adminResponse = await fetch('/api/auth/check-admin', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (!adminResponse.ok) {
        toast.error("Admin yetkiniz kontrol edilirken bir hata oluştu");
        return;
      }
      
      const adminData = await adminResponse.json();
      
      if (adminData.isAdmin) {
        toast.success("Admin olarak giriş yapıldı");
        router.push('/admin');
      } else {
        toast.error("Admin girişi için yetkiniz bulunmuyor");
        // Oturumu temizle
        signIn("credentials", {
          redirect: false,
          email: "",
          password: "",
        });
      }
    } catch (error) {
      console.error("Giriş hatası:", error);
      toast.error("Giriş yapılırken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-500 p-3 rounded-full">
              <FaUserShield className="text-white text-3xl" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Admin Girişi</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Sadece yetkili yöneticiler giriş yapabilir
          </p>
        </CardHeader>
        
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                E-posta
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@checkday.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Şifre
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <Button
              type="submit"
              loading={loading}
              className="w-full mt-4"
            >
              <FaLock className="mr-2" />
              Admin Girişi
            </Button>
          </form>
        </CardBody>
        
        <CardFooter className="text-center text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
          Bu sayfa sadece yöneticiler içindir
        </CardFooter>
      </Card>
    </div>
  );
} 
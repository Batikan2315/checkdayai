"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

interface WelcomeSetupProps {
  onComplete: () => void;
  onBack?: () => void;
}

const WelcomeSetup: React.FC<WelcomeSetupProps> = ({ onComplete, onBack }) => {
  const router = useRouter();
  const { user, refreshUserData } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
  });
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  // Kullanıcı adı formatını kontrol eden fonksiyon
  const validateUsername = (username: string) => {
    const regex = /^[a-z0-9_]+$/;
    if (!username) {
      setUsernameError('Kullanıcı adı gereklidir');
      return false;
    } else if (!regex.test(username)) {
      setUsernameError('Kullanıcı adı sadece küçük harf, sayı ve alt çizgi içerebilir');
      return false;
    }
    setUsernameError('');
    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'username') {
      validateUsername(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateUsername(formData.username)) {
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          firstName: formData.firstName,
          lastName: formData.lastName,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Profil güncellenirken bir hata oluştu');
      }
      
      toast.success('Profil başarıyla oluşturuldu!');
      
      // Kullanıcı bilgilerini yenile
      if (refreshUserData) {
        await refreshUserData(true); // Kullanıcı bilgilerini zorla yenile
      }
      
      // Tamamlandı bilgisini gönder
      onComplete();
      
    } catch (error: any) {
      toast.error(error.message || 'Bir hata oluştu');
      console.error('Profil güncellenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <h2 className="text-2xl font-bold">Profilini Tamamla</h2>
        <p className="text-muted-foreground">Google hesabınla giriş yaptın, hemen profilini tamamla!</p>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-1">
              Kullanıcı Adı <span className="text-red-500">*</span>
            </label>
            <Input
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="kullanici_adi"
              className={usernameError ? 'border-red-500' : ''}
              fullWidth
            />
            {usernameError && <p className="text-red-500 text-xs mt-1">{usernameError}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              Sadece küçük harf, sayı ve alt çizgi kullanabilirsiniz.
            </p>
          </div>
          
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium mb-1">
              Ad
            </label>
            <Input
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              placeholder="Adınız"
              fullWidth
            />
          </div>
          
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium mb-1">
              Soyad
            </label>
            <Input
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder="Soyadınız"
              fullWidth
            />
          </div>
          
          <div className="flex space-x-2">
            {onBack && (
              <Button
                type="button"
                onClick={handleBack}
                variant="outline"
                className="w-1/2"
              >
                Geri
              </Button>
            )}
            <Button
              type="submit"
              className={onBack ? "w-1/2" : "w-full"}
              loading={loading}
            >
              {loading ? 'İşleniyor...' : 'Profili Tamamla'}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
};

export default WelcomeSetup; 
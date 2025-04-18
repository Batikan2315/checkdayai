"use client";

import React, { useState, useEffect, useRef, lazy } from "react";
import { useRouter } from "next/navigation";
import { FaUser, FaCalendarAlt, FaWallet, FaBookmark, FaCog, FaHeart, FaCamera, FaBell } from "react-icons/fa";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import PageContainer from "@/components/layout/PageContainer";
import { getUserPlans, getUserSavedPlans, getUserTransactions, getUserLikedPlans, updateUserBalance } from "@/lib/actions";
import { IUser, IPlan, ITransaction } from "@/lib/types";
import { toast } from "react-hot-toast";
import PlanCard from "@/components/ui/PlanCard";
import WelcomeSetup from "./WelcomeSetup";
import { connectDB } from "@/lib/db";
import { ObjectId } from "mongodb";

const NotificationSettingsLazy = lazy(() => import('@/components/settings/NotificationSettings'));

// Yaratıcı bilgilerini güvenli şekilde format fonksiyonu
const formatCreator = (creator: any) => {
  if (!creator) return undefined;
  
  return {
    _id: creator._id?.toString?.() || creator?.id,
    username: creator.username,
    firstName: creator.firstName,
    lastName: creator.lastName,
    profilePicture: creator.profilePicture || creator.image,
    image: creator.image || creator.profilePicture
  };
};

export default function Profile() {
  const { user, logout, loading: authLoading, refreshUserData } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"profile" | "plans" | "saved" | "likes" | "wallet" | "notifications">("profile");
  const [userPlans, setUserPlans] = useState<IPlan[]>([]);
  const [savedPlans, setSavedPlans] = useState<IPlan[]>([]);
  const [likedPlans, setLikedPlans] = useState<IPlan[]>([]);
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [loading, setLoading] = useState({
    plans: false,
    savedPlans: false,
    likedPlans: false,
    transactions: false,
    profilePicture: false,
  });
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);
  
  // Profil düzenleme için state'ler
  const [isProfileEditModalOpen, setIsProfileEditModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: ""
  });
  const [profileEditLoading, setProfileEditLoading] = useState(false);
  
  // Profil resmi yükleme için state ve ref
  const [isProfilePictureModalOpen, setIsProfilePictureModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Varsayılan profil resmi için güvenli yol
  const DEFAULT_AVATAR = "/images/avatars/default.png";

  // Profil kurulum kontrolü için state
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    if (!user && !authLoading) {
      router.push("/login");
    } else if (user) {
      // Google kullanıcısı kurulum ihtiyacına bakılır
      if ((user as any).needsSetup || (user.provider === 'google' && (!user.firstName || !user.lastName))) {
        setNeedsSetup(true);
      } else {
        // İlk yüklemede kullanıcı bilgilerini bir kez yenile
        const firstLoadKey = `profile_first_load_${(user as any).id || user._id}`;
        const hasLoaded = sessionStorage.getItem(firstLoadKey);
        
        if (!hasLoaded) {
          sessionStorage.setItem(firstLoadKey, 'true');
          refreshUserData().then(() => {
            // Planları yükle (ilk yüklemede)
            if (userPlans.length === 0) {
              fetchUserPlans();
            }
            if (savedPlans.length === 0) {
              fetchSavedPlans();
            }
          });
        }
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // Sadece sekme değiştiğinde ve veriler henüz yoksa fetch yap
    if (user) {
      if (activeTab === "plans" && userPlans.length === 0) {
        fetchUserPlans();
      } else if (activeTab === "saved" && savedPlans.length === 0) {
        fetchSavedPlans();
      } else if (activeTab === "likes" && likedPlans.length === 0) {
        fetchLikedPlans();
      } else if (activeTab === "wallet" && transactions.length === 0) {
        fetchTransactions();
      }
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        username: user.username || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || ""
      });
    }
  }, [user]);

  const fetchUserPlans = async () => {
    if (!user) return;
    
    const userId = (user as any).id || user._id?.toString();
    if (!userId) return;
    
    try {
      setLoading(prev => ({ ...prev, plans: true }));
      console.log("Kullanıcı planları getiriliyor, userId:", userId);
      const response = await getUserPlans(userId);
      console.log("Gelen plan yanıtı:", response);
      
      // Eğer API'den gelen yanıt plans içeriyorsa onu kullan, aksi halde response'un kendisini kullan
      const plans = Array.isArray(response) ? response : (response?.plans || []); 
      setUserPlans(plans as IPlan[]);
      console.log("Kullanıcı planları:", plans);
    } catch (error) {
      console.error("Planları getirme hatası:", error);
      setUserPlans([]); // Hata durumunda boş dizi
    } finally {
      setLoading(prev => ({ ...prev, plans: false }));
    }
  };

  const fetchSavedPlans = async () => {
    if (!user) return;
    
    const userId = (user as any).id || user._id?.toString();
    if (!userId) return;
    
    try {
      setLoading(prev => ({ ...prev, savedPlans: true }));
      const response = await getUserSavedPlans(userId);
      // Eğer API'den gelen yanıt plans içeriyorsa onu kullan, aksi halde response'un kendisini kullan
      const plans = Array.isArray(response) ? response : (response?.plans || []);
      setSavedPlans(plans as IPlan[]);
    } catch (error) {
      console.error("Kaydedilen planları getirme hatası:", error);
      setSavedPlans([]); // Hata durumunda boş dizi
    } finally {
      setLoading(prev => ({ ...prev, savedPlans: false }));
    }
  };

  const fetchLikedPlans = async () => {
    if (!user) return;
    
    const userId = (user as any).id || user._id?.toString();
    if (!userId) return;
    
    try {
      setLoading(prev => ({ ...prev, likedPlans: true }));
      const response = await getUserLikedPlans(userId);
      // Eğer API'den gelen yanıt plans içeriyorsa onu kullan, aksi halde response'un kendisini kullan
      const plans = Array.isArray(response) ? response : (response?.plans || []);
      setLikedPlans(plans as IPlan[]);
    } catch (error) {
      console.error("Beğenilen planları getirme hatası:", error);
      setLikedPlans([]); // Hata durumunda boş dizi
    } finally {
      setLoading(prev => ({ ...prev, likedPlans: false }));
    }
  };

  const fetchTransactions = async () => {
    if (!user) return;
    
    const userId = (user as any).id || user._id?.toString();
    if (!userId) return;
    
    try {
      setLoading(prev => ({ ...prev, transactions: true }));
      const txs = await getUserTransactions(userId);
      setTransactions(txs as ITransaction[]);
    } catch (error) {
      console.error("İşlemleri getirme hatası:", error);
      setTransactions([]);
    } finally {
      setLoading(prev => ({ ...prev, transactions: false }));
    }
  };

  const formatDate = (date: any) => {
    if (!date) return new Date().toLocaleDateString("tr-TR");
    return new Date(date).toLocaleDateString("tr-TR");
  };

  const handleDeposit = async () => {
    try {
      setDepositLoading(true);
      const amount = parseFloat(depositAmount);
      
      if (isNaN(amount) || amount <= 0) {
        toast.error("Lütfen geçerli bir tutar girin");
        return;
      }
      
      if (!user || !user._id) {
        toast.error("Kullanıcı bilgisi bulunamadı");
        return;
      }
      
      // Kullanıcı ID'sini güvenli şekilde alma
      const userId = typeof user._id === 'object' && user._id !== null 
        ? user._id.toString() 
        : typeof user._id === 'string' 
          ? user._id 
          : user.oauth_id || "";
          
      if (!userId) {
        toast.error("Kullanıcı ID bulunamadı");
        return;
      }
      
      // Bakiye güncelleme işlemi
      const newBalance = await updateUserBalance(userId, amount, "deposit");
      
      if (newBalance) {
        toast.success(`${amount} ₺ başarıyla yatırıldı`);
        setIsDepositModalOpen(false);
        setDepositAmount("");
        
        // Kullanıcı bilgilerini ve işlemlerini güncelle
        await refreshUserData();
        await fetchTransactions();
      } else {
        throw new Error("Para yatırma işlemi başarısız oldu");
      }
    } catch (error: any) {
      toast.error(error.message || "Para yatırma işlemi sırasında bir hata oluştu");
      console.error("Para yatırma hatası:", error);
    } finally {
      setDepositLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      setProfileEditLoading(true);
      
      if (!user) {
        toast.error("Kullanıcı bilgisi bulunamadı");
        return;
      }
      
      // Kullanıcı adı validasyonu
      const usernameRegex = /^[a-z0-9_]+$/; // Sadece küçük harf, rakam ve alt çizgi
      if (!usernameRegex.test(profileForm.username)) {
        toast.error("Kullanıcı adı sadece küçük harf, rakam ve alt çizgi içerebilir");
        return;
      }
      
      // API'ye gönderilecek veri
      const userId = typeof user._id === 'object' && user._id !== null 
        ? user._id.toString() 
        : typeof user._id === 'string' 
          ? user._id 
          : user.oauth_id || ""; // OAuth ID'sini kullan
          
      if (!userId) {
        toast.error("Kullanıcı ID bulunamadı");
        return;
      }
      
      const payload = {
        userId,
        username: profileForm.username,
        firstName: profileForm.firstName,
        lastName: profileForm.lastName
      };
      
      // API isteği
      const response = await fetch("/api/users/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Profil güncellenirken bir hata oluştu");
      }
      
      toast.success("Profil başarıyla güncellendi");
      setIsProfileEditModalOpen(false);
      
      // Kullanıcı bilgilerini güncelle
      await refreshUserData(); // AuthContext'i yenile
      router.refresh(); // Sayfayı yenile
      
      // Tüm sekmeleri yenile
      await fetchUserPlans();
      await fetchSavedPlans();
      await fetchLikedPlans();
      await fetchTransactions();
    } catch (error: any) {
      toast.error(error.message || "Profil güncellenemedi");
    } finally {
      setProfileEditLoading(false);
      toast.dismiss();
    }
  };

  const handleProfilePictureClick = () => {
    setIsProfilePictureModalOpen(true);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    try {
      setUploading(true);
      const file = e.target.files[0];
      
      // Dosya tipini kontrol et
      if (!file.type.includes('image')) {
        toast.error('Lütfen bir resim dosyası seçin');
        return;
      }
      
      // FormData oluştur
      const formData = new FormData();
      formData.append('profilePicture', file);
      formData.append('userId', user?._id?.toString() || user?.oauth_id || '');
      
      toast.loading('Profil resmi yükleniyor...');
      
      // Profil resmi yükleme isteği
      const response = await fetch('/api/user/profile-picture', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.dismiss();
        toast.success('Profil resmi güncellendi');
        // Context'teki kullanıcı bilgisini güncelle
        if (refreshUserData) {
          await refreshUserData();
        }
        
        // Sayfayı yenile - tüm bileşenlerin profil resmini yenilemesi için
        router.refresh();
        
        // 1 saniye sonra sayfayı yeniden yükleme - önbellek sorunlarını çözmek için
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        throw new Error(data.error || 'Profil resmi güncellenirken bir hata oluştu');
      }
    } catch (error: any) {
      console.error('Profil resmi yükleme hatası:', error);
      toast.dismiss();
      toast.error(error.message || 'Profil resmi yüklenirken bir hata oluştu');
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Profil kurulumu tamamlandığında
  const handleSetupComplete = () => {
    setNeedsSetup(false);
    setActiveTab("profile");
    refreshUserData();
  };

  if (authLoading) {
    return (
      <PageContainer className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">Yükleniyor...</p>
        </div>
      </PageContainer>
    );
  }

  if (!user) {
    // Kullanıcı giriş yapmamışsa
    return (
      <PageContainer className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md shadow-lg">
          <CardBody className="text-center py-8">
            <h2 className="text-xl font-semibold mb-4">Oturum Açmanız Gerekiyor</h2>
            <p className="mb-6 text-gray-600">Bu sayfayı görüntülemek için lütfen giriş yapın.</p>
            <Button
              onClick={() => router.push("/login")}
              fullWidth
            >
              Giriş Yap
            </Button>
          </CardBody>
        </Card>
      </PageContainer>
    );
  }

  // Kullanıcı kurulum yapması gerekiyorsa
  if (needsSetup) {
    return (
      <PageContainer className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <WelcomeSetup 
            onComplete={handleSetupComplete}
          />
        </div>
      </PageContainer>
    );
  }

  const renderProfileTab = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="relative h-40 bg-gradient-to-r from-blue-400 to-indigo-500">
            <div className="absolute -bottom-16 left-6">
              <div className="relative w-32 h-32 rounded-full border-4 border-white dark:border-gray-700 overflow-hidden bg-white">
                {uploading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                  </div>
                ) : null}
                <img 
                  src={`${user?.profilePicture || DEFAULT_AVATAR}?t=${new Date().getTime()}`} 
                  alt="Profil resmi" 
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={handleProfilePictureClick}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                  }}
                />
                <input 
                  type="file" 
                  id="profile-picture" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileInputChange}
                />
              </div>
            </div>
          </div>
          
          <div className="pt-20 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.username || 'Kullanıcı'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {user?.email}
                </p>
                <a 
                  href={`/@${user?.username}`} 
                  className="text-blue-600 dark:text-blue-400 text-sm hover:underline mt-1 inline-block"
                >
                  @{user?.username}
                </a>
              </div>
              
              <Button 
                onClick={() => setIsProfileEditModalOpen(true)}
                variant="outline"
                size="sm"
                className="mt-4 md:mt-0"
              >
                Profili Düzenle
              </Button>
            </div>

            {user?.role === "admin" && (
              <span className="mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full dark:bg-blue-900 dark:text-blue-300">
                Admin
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button variant="outline" color="danger" onClick={logout}>
            Çıkış Yap
          </Button>
          {user.role === "admin" && (
            <Button onClick={() => router.push("/admin")}>
              Admin Paneli
            </Button>
          )}
        </div>
        
        {/* Profil Düzenleme Modal */}
        {isProfileEditModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Profil Bilgilerini Düzenle</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kullanıcı Adı</label>
                  <input 
                    type="text" 
                    value={profileForm.username}
                    onChange={(e) => setProfileForm({...profileForm, username: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Sadece küçük harfler, rakamlar ve alt çizgi (_) kullanabilirsiniz.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ad</label>
                  <input 
                    type="text" 
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({...profileForm, firstName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Soyad</label>
                  <input 
                    type="text" 
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({...profileForm, lastName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-posta</label>
                  <input 
                    type="email" 
                    value={profileForm.email}
                    disabled={true}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 cursor-not-allowed focus:outline-none dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">E-posta adresi değiştirilemez.</p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsProfileEditModalOpen(false);
                    // Form bilgilerini sıfırla
                    setProfileForm({
                      username: user?.username || "",
                      firstName: user?.firstName || "",
                      lastName: user?.lastName || "",
                      email: user?.email || ""
                    });
                  }}
                >
                  İptal
                </Button>
                <Button
                  onClick={handleProfileUpdate}
                  loading={profileEditLoading}
                >
                  Kaydet
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Profil Resmi Modal */}
        {isProfilePictureModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Profil Resmi Değiştir</h3>
              
              <div className="mb-4 flex justify-center">
                <div className="w-40 h-40 rounded-full overflow-hidden bg-gray-200">
                  <img 
                    src={`${user?.profilePicture || DEFAULT_AVATAR}?t=${new Date().getTime()}`} 
                    alt={user?.username || 'Kullanıcı'} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                    }}
                  />
                </div>
              </div>
              
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileInputChange}
              />
              
              <div className="flex justify-between space-x-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsProfilePictureModalOpen(false)}
                  disabled={loading.profilePicture}
                >
                  İptal
                </Button>
                <Button 
                  className="flex-1"
                  onClick={triggerFileInput}
                  disabled={loading.profilePicture}
                  loading={loading.profilePicture}
                >
                  Resim Seç
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPlansTab = () => (
    <div>
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Oluşturduğunuz Planlar</h2>
      {loading.plans ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : userPlans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userPlans.map(plan => (
            <PlanCard
              key={plan._id?.toString()}
              id={plan._id?.toString() || ''}
              title={plan.title || ''}
              description={plan.description || ''}
              date={new Date(plan.startDate)}
              location={plan.location || ''}
              imageUrl={plan.imageUrl}
              creator={formatCreator(plan.creator)}
              isOnline={plan.isOnline}
              isFree={plan.isFree}
              price={plan.price}
              maxParticipants={plan.maxParticipants}
              participantCount={plan.participants?.length || 0}
              isJoined={plan.participants?.some(p => p.toString() === user._id.toString())}
              plan={plan}
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">Henüz plan oluşturmadınız.</p>
      )}
    </div>
  );

  const renderSavedPlansTab = () => (
    <div>
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Kaydettiğiniz Planlar</h2>
      {loading.savedPlans ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : savedPlans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedPlans.map(plan => (
            <PlanCard
              key={plan._id?.toString()}
              id={plan._id?.toString() || ''}
              title={plan.title || ''}
              description={plan.description || ''}
              date={new Date(plan.startDate)}
              location={plan.location || ''}
              imageUrl={plan.imageUrl}
              creator={formatCreator(plan.creator)}
              isOnline={plan.isOnline}
              isFree={plan.isFree}
              price={plan.price}
              maxParticipants={plan.maxParticipants}
              participantCount={plan.participants?.length || 0}
              isJoined={plan.participants?.some(p => p.toString() === user._id.toString())}
              plan={plan}
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">Henüz plan kaydetmediniz.</p>
      )}
    </div>
  );

  const renderLikedPlansTab = () => (
    <div>
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Beğendiğiniz Planlar</h2>
      {loading.likedPlans ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : likedPlans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {likedPlans.map(plan => (
            <PlanCard
              key={plan._id?.toString()}
              id={plan._id?.toString() || ''}
              title={plan.title || ''}
              description={plan.description || ''}
              date={new Date(plan.startDate)}
              location={plan.location || ''}
              imageUrl={plan.imageUrl}
              creator={formatCreator(plan.creator)}
              isOnline={plan.isOnline}
              isFree={plan.isFree}
              price={plan.price}
              maxParticipants={plan.maxParticipants}
              participantCount={plan.participants?.length || 0}
              isJoined={plan.participants?.some(p => p.toString() === user._id.toString())}
              plan={plan}
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">Henüz plan beğenmediniz.</p>
      )}
    </div>
  );

  const renderWalletTab = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bakiye İşlemleri</h2>
        <div className="text-right">
          <p className="text-gray-600 dark:text-gray-400">Bakiye</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{user.balance} ₺</p>
        </div>
      </div>
      
      <Button className="mb-4" onClick={() => setIsDepositModalOpen(true)}>Bakiye Yükle</Button>
      
      {isDepositModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Bakiye Yükle</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Tutar (₺)</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                placeholder="0"
                min="1"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsDepositModalOpen(false)}
                disabled={depositLoading}
              >
                İptal
              </Button>
              <Button 
                onClick={handleDeposit}
                disabled={depositLoading || !depositAmount}
              >
                {depositLoading ? "Yükleniyor..." : "Yükle"}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <h3 className="font-medium mb-3">İşlem Geçmişi</h3>
      
      {loading.transactions ? (
        <p>Yükleniyor...</p>
      ) : transactions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  İşlem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tutar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Açıklama
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {transactions.map(tx => (
                <tr key={tx._id?.toString()}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(tx.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        tx.type === "deposit" || tx.type === "refund"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                      }`}
                    >
                      {tx.type === "deposit"
                        ? "Yükleme"
                        : tx.type === "withdrawal"
                        ? "Harcama"
                        : "İade"}
                    </span>
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      tx.type === "deposit" || tx.type === "refund"
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {tx.type === "deposit" || tx.type === "refund" ? "+" : "-"}
                    {tx.amount} ₺
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {tx.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">Henüz işlem yapmadınız.</p>
      )}
    </div>
  );

  // Bildirim ayarları sekmesini render et
  const renderNotificationsTab = () => (
    <div className="my-4">
      <h2 className="text-xl font-bold mb-4">Bildirim Ayarları</h2>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4">
          <React.Suspense fallback={<div>Yükleniyor...</div>}>
            <NotificationSettingsLazy />
          </React.Suspense>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {needsSetup ? (
        <WelcomeSetup onComplete={handleSetupComplete} />
      ) : (
        <PageContainer className="profile-page">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Sol menü */}
            <div className="w-full md:w-64 md:min-w-64 md:max-h-[calc(100vh-16rem)] sticky top-24">
              <Card className="overflow-hidden">
                <CardHeader className="p-4">
                  <h2 className="text-lg font-bold text-center">
                    {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.username}
                  </h2>
                  <p className="text-sm text-gray-500 text-center">@{user?.username}</p>
                </CardHeader>
                <CardBody className="pb-4">
                  <div className="space-y-2">
                    <button 
                      className={`flex items-center gap-2 p-2 w-full rounded-md transition-colors ${
                        activeTab === "profile" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                      }`}
                      onClick={() => setActiveTab("profile")}
                    >
                      <FaUser className="text-blue-600" /> Profilim
                    </button>
                    <button 
                      className={`flex items-center gap-2 p-2 w-full rounded-md transition-colors ${
                        activeTab === "plans" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                      }`}
                      onClick={() => setActiveTab("plans")}
                    >
                      <FaCalendarAlt className="text-green-600" /> Planlarım
                    </button>
                    <button 
                      className={`flex items-center gap-2 p-2 w-full rounded-md transition-colors ${
                        activeTab === "saved" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                      }`}
                      onClick={() => setActiveTab("saved")}
                    >
                      <FaBookmark className="text-purple-600" /> Kaydedilenler
                    </button>
                    <button 
                      className={`flex items-center gap-2 p-2 w-full rounded-md transition-colors ${
                        activeTab === "likes" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                      }`}
                      onClick={() => setActiveTab("likes")}
                    >
                      <FaHeart className="text-red-600" /> Beğendiklerim
                    </button>
                    <button 
                      className={`flex items-center gap-2 p-2 w-full rounded-md transition-colors ${
                        activeTab === "wallet" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                      }`}
                      onClick={() => setActiveTab("wallet")}
                    >
                      <FaWallet className="text-amber-600" /> Cüzdanım
                    </button>
                    <button 
                      className={`flex items-center gap-2 p-2 w-full rounded-md transition-colors ${
                        activeTab === "notifications" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                      }`}
                      onClick={() => setActiveTab("notifications")}
                    >
                      <FaBell className="text-blue-600" /> Bildirimler
                    </button>
                  </div>
                </CardBody>
              </Card>
              
              <Button 
                variant="outline" 
                className="w-full mt-4 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                onClick={logout}
              >
                <span>Çıkış Yap</span>
              </Button>
            </div>
            
            {/* Ana içerik */}
            <div className="flex-1">
              {activeTab === "profile" && renderProfileTab()}
              {activeTab === "plans" && renderPlansTab()}
              {activeTab === "saved" && renderSavedPlansTab()}
              {activeTab === "likes" && renderLikedPlansTab()}
              {activeTab === "wallet" && renderWalletTab()}
              {activeTab === "notifications" && renderNotificationsTab()}
            </div>
          </div>
        </PageContainer>
      )}
      
      {/* Bakiye yükleme modalı */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Bakiye Yükle</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Tutar (₺)</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                placeholder="0"
                min="1"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsDepositModalOpen(false)}
                disabled={depositLoading}
              >
                İptal
              </Button>
              <Button 
                onClick={handleDeposit}
                disabled={depositLoading || !depositAmount}
              >
                {depositLoading ? "Yükleniyor..." : "Yükle"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 
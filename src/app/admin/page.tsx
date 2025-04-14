"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaUsers, FaCalendarAlt, FaChartLine, FaCog, FaClock, FaDownload, FaTrash, FaCloudDownloadAlt } from "react-icons/fa";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import PageContainer from "@/components/layout/PageContainer";
import { format } from "date-fns";
import toast from "react-hot-toast";

// Tip tanımlamaları
interface User {
  _id: string;
  firstName?: string;
  username?: string;
  name?: string;
  email: string;
  role: string;
  profilePicture?: string;
  image?: string;
  createdAt: string;
}

interface Plan {
  _id: string;
  title: string;
  location?: string;
  image?: string;
  startDate: string;
  creatorName?: string;
  participants?: string[];
}

interface StatsData {
  userCount: number;
  planCount: number;
  transactionTotal: number;
  countdown?: {
    title: string;
    date: string;
    active: boolean;
  };
  recentActivities?: Array<{
    title: string;
    description: string;
    time: string;
  }>;
}

// Veritabanı işlemleri için tip tanımları
interface LoadingState {
  stats: boolean;
  users: boolean;
  plans: boolean;
}

export default function AdminPanel() {
  // API'den alınacak veriler için state'ler
  const [activeTab, setActiveTab] = useState("dashboard");
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [loadingState, setLoadingState] = useState<LoadingState>({
    stats: false,
    users: false,
    plans: false
  });
  
  // Verileri saklamak için state'ler
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState<StatsData>({
    userCount: 0,
    planCount: 0,
    transactionTotal: 0
  });
  
  // Geri sayım state
  const [countdown, setCountdown] = useState({
    title: "",
    date: "",
    active: false
  });
  
  // Admin yetkisi kontrolü
  useEffect(() => {
    if (!loading) {
      if (!user) {
        console.log("Admin paneline erişim reddedildi: Kullanıcı oturumu yok");
        router.push('/giris');
        toast.error("Bu sayfaya erişmek için giriş yapmalısınız");
        return;
      }
      
      if (!isAdmin) {
        console.log("Admin paneline erişim reddedildi:", { 
          userId: user._id,
          userEmail: user.email,
          userRole: user.role 
        });
        router.push('/');
        toast.error("Bu sayfaya erişmek için admin yetkisine sahip olmalısınız");
        return;
      }

      console.log("Admin oturumu doğrulandı:", { 
        userId: user._id,
        userEmail: user.email,
        userRole: user.role 
      });
      
      // Admin girişi başarılı ise geri sayım verilerini getir
      fetchCountdownData();
    }
  }, [user, isAdmin, loading, router]);
  
  // Geri sayım verilerini getir
  const fetchCountdownData = async () => {
    try {
      const response = await fetch('/api/admin/countdown');
      
      if (!response.ok) {
        throw new Error('Geri sayım verileri alınamadı');
      }
      
      const data = await response.json();
      
      console.log("Geri sayım verileri alındı:", data);
      
      // Tarih boş ise şu anki tarih + 1 ay olarak ayarla
      if (!data.date) {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        data.date = nextMonth.toISOString().slice(0, 16);
      }
      
      setCountdown({
        title: data.title || "",
        date: data.date || "",
        active: data.active || false
      });
    } catch (error) {
      console.error("Geri sayım verilerini getirme hatası:", error);
      toast.error("Geri sayım verileri yüklenemedi");
    }
  };
  
  // Geri sayım ayarlarını kaydet
  const handleSaveCountdown = async () => {
    try {
      // Form doğrulama
      if (!countdown.title) {
        toast.error("Geri sayım başlığı zorunludur");
        return;
      }
      
      if (!countdown.date) {
        toast.error("Geri sayım tarihi zorunludur");
        return;
      }

      toast.loading("Geri sayım ayarları kaydediliyor...");
      
      console.log("Gönderilecek geri sayım verileri:", countdown);
      
      const response = await fetch('/api/admin/countdown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(countdown),
        credentials: 'include' // CSRF korumasını dahil etmek için
      });
      
      toast.dismiss();
      
      if (response.ok) {
        const result = await response.json();
        console.log("Geri sayım kaydetme sonucu:", result);
        toast.success("Geri sayım ayarları başarıyla güncellendi");
      } else {
        const error = await response.json();
        console.error("Geri sayım kaydetme API hatası:", error);
        
        if (error.error === "Bu işlem için admin yetkisine sahip olmalısınız") {
          toast.error("Admin yetkiniz doğrulanamadı. Lütfen tekrar giriş yapın.");
          router.push('/giris');
        } else {
          toast.error(error.error || "Geri sayım ayarları güncellenemedi");
        }
      }
    } catch (error) {
      toast.dismiss();
      console.error("Geri sayım ayarları kaydetme hatası:", error);
      toast.error("Geri sayım ayarları kaydedilirken bir hata oluştu");
    }
  };
  
  // Verileri yükleme
  useEffect(() => {
    if (user && user.role === "admin") {
      fetchStats();
      if (activeTab === "users") {
        fetchUsers();
      } else if (activeTab === "plans") {
        fetchPlans();
      }
    }
  }, [user, activeTab]);
  
  // İstatistikleri getir
  const fetchStats = async () => {
    try {
      setLoadingState((prev: LoadingState) => ({ ...prev, stats: true }));
      const response = await fetch('/api/admin/stats');
      
      if (!response.ok) {
        throw new Error('İstatistikler alınamadı');
      }
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('İstatistik getirme hatası:', error);
      toast.error('İstatistikler yüklenemedi');
    } finally {
      setLoadingState((prev: LoadingState) => ({ ...prev, stats: false }));
    }
  };
  
  // Kullanıcıları getir
  const fetchUsers = async () => {
    try {
      setLoadingState((prev: LoadingState) => ({ ...prev, users: true }));
      const response = await fetch('/api/admin/users');
      
      if (!response.ok) {
        throw new Error('Kullanıcılar alınamadı');
      }
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Kullanıcı getirme hatası:', error);
      toast.error('Kullanıcılar yüklenemedi');
    } finally {
      setLoadingState((prev: LoadingState) => ({ ...prev, users: false }));
    }
  };
  
  // Planları getir
  const fetchPlans = async () => {
    try {
      setLoadingState((prev: LoadingState) => ({ ...prev, plans: true }));
      const response = await fetch('/api/admin/plans');
      
      if (!response.ok) {
        throw new Error('Planlar alınamadı');
      }
      
      const data = await response.json();
      setPlans(data.plans || []);
    } catch (error) {
      console.error('Plan getirme hatası:', error);
      toast.error('Planlar yüklenemedi');
    } finally {
      setLoadingState((prev: LoadingState) => ({ ...prev, plans: false }));
    }
  };
  
  // Kullanıcı rolünü değiştir
  const changeUserRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch('/api/admin/users/change-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, role: newRole })
      });
      
      if (!response.ok) {
        throw new Error('Rol değiştirilemedi');
      }
      
      toast.success('Kullanıcı rolü güncellendi');
      fetchUsers(); // Kullanıcı listesini yenile
    } catch (error) {
      console.error('Rol değiştirme hatası:', error);
      toast.error('Rol değiştirilemedi');
    }
  };
  
  // Planı sil
  const deletePlan = async (planId: string) => {
    if (!confirm('Bu planı silmek istediğinize emin misiniz?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/plans/${planId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Plan silinemedi');
      }
      
      toast.success('Plan başarıyla silindi');
      fetchPlans(); // Plan listesini yenile
    } catch (error) {
      console.error('Plan silme hatası:', error);
      toast.error('Plan silinemedi');
    }
  };
  
  // Veritabanını sıfırla
  const resetDatabase = async () => {
    if (!confirm('Tüm veritabanını sıfırlamak istediğinize emin misiniz? Bu işlem geri alınamaz!')) {
      return;
    }
    
    try {
      toast.loading('Veritabanı sıfırlanıyor...');
      const response = await fetch('/api/admin/reset-db', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Veritabanı sıfırlanamadı');
      }
      
      toast.dismiss();
      toast.success('Veritabanı başarıyla sıfırlandı');
      
      // Verileri yenile
      fetchStats();
      fetchUsers();
      fetchPlans();
    } catch (error) {
      console.error('Veritabanı sıfırlama hatası:', error);
      toast.dismiss();
      toast.error('Veritabanı sıfırlanamadı');
    }
  };

  // Veritabanı işlemleri
  const handleDatabaseOperation = async (operation: 'backup' | 'clean' | 'reset') => {
    try {
      toast.loading(`Veritabanı ${operation} işlemi yapılıyor...`);
      
      const response = await fetch(`/api/admin/database/${operation}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        toast.dismiss();
        toast.success(`Veritabanı ${operation} işlemi başarıyla tamamlandı`);
      } else {
        const error = await response.json();
        toast.dismiss();
        toast.error(error.message || `Veritabanı ${operation} işlemi başarısız oldu`);
      }
    } catch (error) {
      console.error(`Veritabanı ${operation} işlemi hatası:`, error);
      toast.dismiss();
      toast.error(`Veritabanı ${operation} işlemi sırasında bir hata oluştu`);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500 dark:text-gray-400">Yükleniyor...</p>
        </div>
      </PageContainer>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }
  
  // Formatlanmış para birimini döndür
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { 
      style: 'currency', 
      currency: 'TRY',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  // Formatlanmış tarih döndür
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'dd.MM.yyyy');
    } catch (error) {
      return dateString;
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
              <FaUsers className="text-blue-600 dark:text-blue-400 text-xl" />
            </div>
            <div className="ml-4">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Toplam Kullanıcı</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loadingState.stats ? '...' : stats.userCount}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
              <FaCalendarAlt className="text-green-600 dark:text-green-400 text-xl" />
            </div>
            <div className="ml-4">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Aktif Planlar</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loadingState.stats ? '...' : stats.planCount}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
              <FaChartLine className="text-purple-600 dark:text-purple-400 text-xl" />
            </div>
            <div className="ml-4">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Toplam İşlem</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loadingState.stats ? '...' : formatCurrency(stats.transactionTotal)}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Son Aktiviteler</h3>
        <div className="space-y-4">
          {stats.recentActivities && stats.recentActivities.length > 0 ? (
            stats.recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.title}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400">Henüz aktivite yok</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Kullanıcı Yönetimi</h2>
        <Button size="sm" onClick={() => router.push("/giris")}>Yeni Kullanıcı</Button>
      </div>
      
      {loadingState.users ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500 dark:text-gray-400">Kullanıcılar yükleniyor...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Kullanıcı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    E-posta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Üyelik Tarihi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <img
                              className="h-10 w-10 rounded-full"
                              src={user.profilePicture || user.image || `/images/avatars/default.png`}
                              alt=""
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.firstName || user.username || user.name || 'İsimsiz'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              @{user.username || 'kullanici'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === "admin"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          }`}
                        >
                          {user.role === "admin" ? "Admin" : "Kullanıcı"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex space-x-2">
                          {user.role === "admin" ? (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => changeUserRole(user._id, "user")}
                            >
                              Kullanıcı Yap
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => changeUserRole(user._id, "admin")}
                            >
                              Admin Yap
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline" 
                            color="danger"
                            onClick={() => router.push(`/profil/${user._id}`)}
                          >
                            Görüntüle
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      Kullanıcı bulunamadı
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderPlans = () => (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Plan Yönetimi</h2>
        <Button size="sm" onClick={() => router.push("/plan/olustur")}>Yeni Plan</Button>
      </div>
      
      {loadingState.plans ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500 dark:text-gray-400">Planlar yükleniyor...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Oluşturan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Katılımcılar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {plans.length > 0 ? (
                  plans.map((plan) => (
                    <tr key={plan._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <img
                              className="h-10 w-10 rounded-lg object-cover"
                              src={plan.image || `/images/plans/default.jpg`}
                              alt=""
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {plan.title}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {plan.location}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {plan.creatorName || 'Bilinmiyor'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(plan.startDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {plan.participants?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => router.push(`/plan/${plan._id}`)}
                          >
                            Görüntüle
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            color="danger"
                            onClick={() => deletePlan(plan._id)}
                          >
                            Sil
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      Plan bulunamadı
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderCountdownSettings = () => (
      <div className="space-y-6">
        <Card>
          <CardHeader>
          <h2 className="text-xl font-semibold">Geri Sayım Ayarları</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
            <div className="flex flex-col">
              <label className="form-label mb-1">Geri Sayım Başlığı</label>
              <input
                type="text"
                value={countdown.title}
                onChange={(e) => setCountdown({ ...countdown, title: e.target.value })}
                className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-800"
                placeholder="Örn: Yeni Yıl Kutlaması"
              />
            </div>
            
            <div className="flex flex-col">
              <label className="form-label mb-1">Geri Sayım Tarihi</label>
              <input
                type="datetime-local"
                value={countdown.date}
                onChange={(e) => setCountdown({ ...countdown, date: e.target.value })}
                className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-800"
              />
                </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="countdown-active"
                checked={countdown.active}
                onChange={(e) => setCountdown({ ...countdown, active: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="countdown-active">Geri sayımı aktif et</label>
              </div>
              
            <Button onClick={handleSaveCountdown} className="mt-4">
              Geri Sayım Ayarlarını Kaydet
            </Button>
                </div>
        </CardBody>
      </Card>
              </div>
  );

  // Sistem Ayarları render fonksiyonu
  const renderSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Veritabanı Ayarları</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="flex flex-col">
              <p className="mb-4 text-gray-600 dark:text-gray-400">
                Veritabanı ile ilgili işlemler burada gerçekleştirilebilir. Dikkatli kullanınız.
              </p>
              
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => handleDatabaseOperation('backup')}
                  className="flex items-center"
                >
                  <FaCloudDownloadAlt className="mr-2" /> Yedek Al
                </Button>
                
                <Button 
                  onClick={() => handleDatabaseOperation('reset')}
                  variant="danger"
                  className="flex items-center"
                >
                  <FaTrash className="mr-2" /> Veritabanını Sıfırla
                </Button>
              </div>
              </div>
            </div>
          </CardBody>
        </Card>
    </div>
  );

  return (
    <PageContainer>
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-64 bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 md:mb-0 md:mr-6">
          <div className="space-y-2">
              <button
                onClick={() => setActiveTab("dashboard")}
              className={`flex items-center w-full p-2 rounded-md ${activeTab === "dashboard" ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
            >
              <FaChartLine className="mr-2" /> Dashboard
            </button>
            <button 
              onClick={() => setActiveTab("users")}
              className={`flex items-center w-full p-2 rounded-md ${activeTab === "users" ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
            >
              <FaUsers className="mr-2" /> Kullanıcılar
              </button>
              <button
              onClick={() => setActiveTab("plans")}
              className={`flex items-center w-full p-2 rounded-md ${activeTab === "plans" ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
            >
              <FaCalendarAlt className="mr-2" /> Planlar
              </button>
              <button
              onClick={() => setActiveTab("countdown")}
              className={`flex items-center w-full p-2 rounded-md ${activeTab === "countdown" ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
            >
              <FaClock className="mr-2" /> Geri Sayım
              </button>
              <button
                onClick={() => setActiveTab("settings")}
              className={`flex items-center w-full p-2 rounded-md ${activeTab === "settings" ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
            >
              <FaCog className="mr-2" /> Sistem Ayarları
              </button>
          </div>
        </div>
        
        <div className="flex-1">
          {activeTab === "dashboard" && renderDashboard()}
          {activeTab === "users" && renderUsers()}
          {activeTab === "plans" && renderPlans()}
          {activeTab === "countdown" && renderCountdownSettings()}
          {activeTab === "settings" && renderSettings()}
        </div>
      </div>
    </PageContainer>
  );
} 
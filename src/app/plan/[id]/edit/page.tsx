"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import PageContainer from "@/components/layout/PageContainer";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import TextArea from "@/components/ui/TextArea";
import { FaCalendarAlt, FaMapMarkerAlt, FaImage, FaMoneyBillWave, FaClock, FaUsers } from "react-icons/fa";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

// FormData tipi tanımı
interface FormData {
  title: string;
  description: string;
  imageUrl: string;
  imageFile: File | null;
  imagePreview: string | undefined;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  isOnline: boolean;
  location: string;
  onlineLink: string;
  isFree: boolean;
  price: number;
  isPrivate: boolean;
  maxParticipants: number;
  isLimitedParticipants: boolean;
  cancellationRules: string;
  cancellationTime: number;
  cancellationPolicy: string;
}

export default function EditPlan() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    imageUrl: '',
    imageFile: null,
    imagePreview: undefined,
    startDate: new Date(),
    endDate: new Date(),
    startTime: '18:00',
    endTime: '20:00',
    isOnline: false,
    location: '',
    onlineLink: '',
    isFree: true,
    price: 0,
    isPrivate: false,
    maxParticipants: 10,
    isLimitedParticipants: false,
    cancellationRules: '',
    cancellationTime: 120,
    cancellationPolicy: '',
  });

  // Mevcut planı getir
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        setInitialLoading(true);
        const response = await fetch(`/api/plans/${id}`);
        
        if (!response.ok) {
          throw new Error('Plan detayları getirilemedi');
        }
        
        const plan = await response.json();
        
        // Tarih ve saat ayarlamaları
        const startDate = new Date(plan.startDate);
        const endDate = new Date(plan.endDate);
        
        const startTime = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
        const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
        
        // Katılımcı sınırı kontrolü
        const isLimitedParticipants = plan.maxParticipants > 0;
        
        setFormData({
          title: plan.title || '',
          description: plan.description || '',
          imageUrl: plan.imageUrl || '',
          imageFile: null,
          imagePreview: plan.imageUrl || undefined,
          startDate: startDate,
          endDate: endDate,
          startTime: startTime,
          endTime: endTime,
          isOnline: plan.isOnline || false,
          location: plan.location || '',
          onlineLink: plan.onlineLink || '',
          isFree: plan.isFree || false,
          price: plan.price || 0,
          isPrivate: plan.isPrivate || false,
          maxParticipants: plan.maxParticipants || 10,
          isLimitedParticipants: isLimitedParticipants,
          cancellationRules: plan.cancellationRules || '',
          cancellationTime: plan.cancellationTime || 120,
          cancellationPolicy: plan.cancellationPolicy || '',
        });
        
        setInitialLoading(false);
      } catch (error) {
        console.error("Plan yüklenirken hata:", error);
        toast.error("Plan verileri yüklenemedi");
        router.push(`/plan/${id}`);
      }
    };

    if (id) {
      fetchPlan();
    }
  }, [id, router]);
  
  // Tarih kontrolleri için useEffect
  useEffect(() => {
    // Başlangıç tarihi bugünden önce olamaz
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (formData.startDate < today) {
      setFormData(prev => ({ 
        ...prev, 
        startDate: today 
      }));
    }
    
    // Bitiş tarihi başlangıç tarihinden önce olamaz
    if (formData.endDate < formData.startDate) {
      setFormData(prev => ({ 
        ...prev, 
        endDate: prev.startDate 
      }));
    }
  }, [formData.startDate, formData.endDate]);
  
  const handleChange = (
    nameOrEvent: string | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    valueParam?: any
  ) => {
    if (typeof nameOrEvent === 'string') {
      // Doğrudan isim ve değer verilmiş
      setFormData(prev => ({ ...prev, [nameOrEvent]: valueParam }));
    } else {
      // Event objesi verilmiş
      const e = nameOrEvent;
      const { name, value, type } = e.target;
      
      if (type === "checkbox") {
        const target = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: target.checked }));
      } else if (type === "date") {
        // Tarih kontrolü
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (name === "startDate") {
          // Başlangıç tarihi bugünden önce olamaz
          if (selectedDate < today) {
            toast.error("Geçmiş bir tarih seçemezsiniz");
            return;
          }
          
          setFormData(prev => ({ 
            ...prev, 
            [name]: selectedDate,
            // Eğer bitiş tarihi başlangıçtan önceyse, bitiş tarihini de güncelle
            endDate: prev.endDate < selectedDate ? selectedDate : prev.endDate
          }));
        } else if (name === "endDate") {
          // Bitiş tarihi başlangıç tarihinden önce olamaz
          if (selectedDate < formData.startDate) {
            toast.error("Bitiş tarihi başlangıç tarihinden önce olamaz");
            return;
          }
          
          setFormData(prev => ({ ...prev, [name]: selectedDate }));
        } else {
          setFormData(prev => ({ ...prev, [name]: selectedDate }));
        }
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    }
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        setFormData({
          ...formData,
          imageFile: file,
          imagePreview: reader.result as string,
        });
      };
      
      reader.readAsDataURL(file);
    }
  };
  
  const handleIsOnlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setFormData(prev => ({ 
      ...prev, 
      isOnline: isChecked,
      location: isChecked ? '' : prev.location 
    }));
  };
  
  const handleIsLimitedParticipantsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setFormData(prev => ({
      ...prev,
      isLimitedParticipants: isChecked,
      maxParticipants: isChecked ? prev.maxParticipants : 0
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Kullanıcı kontrolü
    if (!user) {
      toast.error("Düzenleme yapabilmek için giriş yapmanız gerekiyor");
      router.push("/login");
      return;
    }
    
    // Kullanıcı ID'sini al
    let userId = ""; 
    if (user._id) {
      userId = typeof user._id === 'object' ? user._id.toString() : String(user._id);
    }
    
    if (!userId) {
      toast.error("Kullanıcı kimliği alınamadı");
      return;
    }
    
    // Form doğrulama
    const validationErrors: string[] = [];
    
    if (!formData.title) validationErrors.push("Başlık zorunludur");
    if (!formData.description) validationErrors.push("Açıklama zorunludur");
    if (formData.description.length < 10) validationErrors.push("Açıklama en az 10 karakter olmalıdır");
    if (!formData.startDate) validationErrors.push("Başlangıç tarihi zorunludur");
    
    // Tarih kontrolü - geçmiş tarih olamaz
    const now = new Date();
    const startDateTime = new Date(`${formData.startDate.toISOString().split('T')[0]}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate.toISOString().split('T')[0]}T${formData.endTime}`);
    
    if (startDateTime < now) {
      validationErrors.push("Başlangıç tarihi geçmiş olamaz");
    }
    
    if (endDateTime < startDateTime) {
      validationErrors.push("Bitiş tarihi başlangıç tarihinden önce olamaz");
    }
    
    // Online değilse konum zorunluluğunu kontrol et
    if (!formData.isOnline && !formData.location) {
      validationErrors.push("Plan konumu zorunludur");
    }
    
    // Online ise link kontrolü (zorunlu değil)
    if (formData.isOnline && formData.onlineLink && !formData.onlineLink.startsWith('https://')) {
      validationErrors.push("Online link 'https://' ile başlamalıdır");
    }
    
    // Katılımcı sayısı kontrolü
    if (formData.isLimitedParticipants && formData.maxParticipants <= 0) {
      validationErrors.push("Katılımcı sayısı en az 1 olmalıdır");
      return;
    }
    
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }
    
    setLoading(true);
    
    try {
      // API isteği için formData'yı hazırla
      const startDateTime = new Date(`${formData.startDate.toISOString().split('T')[0]}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate.toISOString().split('T')[0]}T${formData.endTime}`);
      
      // maxParticipants değerini kontroler göre ayarla
      let maxParticipants = 0; // Varsayılan değer
      
      if (formData.isLimitedParticipants) {
        // Sınırlı katılımcı seçilmişse kullanıcının girdiği değeri kullan
        maxParticipants = Math.max(1, formData.maxParticipants); // En az 1 olmasını sağla
      } else {
        // Sınırsız katılımcı seçilmişse 0 ata (0 = sınırsız)
        maxParticipants = 0;
      }
      
      // Önce görüntü yükleme işlemi (yeni resim varsa)
      let imageUrl = formData.imageUrl;

      if (formData.imageFile) {
        // Görüntüyü optimize etmek için - boyutu kontrol et
        const fileSizeMB = formData.imageFile.size / (1024 * 1024);
        let imageToUpload = formData.imageFile;
        
        if (fileSizeMB > 1) {
          // 1MB'dan büyük dosyalarda kullanıcıya bilgi ver
          toast.loading('Görüntü optimize ediliyor...', { id: 'imageOptimize' });
        }
        
        // FormData oluştur
        const uploadFormData = new FormData();
        uploadFormData.append('file', imageToUpload);
        
        // Unsigned upload için upload_preset kullan
        uploadFormData.append('upload_preset', 'checkday_preset'); // Cloudinary'de oluşturulmuş preset adı
        uploadFormData.append('folder', 'checkday_plans');
        
        try {
          // Cloudinary API'ye yükleme yap
          toast.loading('Görüntü yükleniyor...', { id: 'imageUpload' });
          
          const uploadResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'di4fgpyeq'}/image/upload`,
            {
              method: 'POST',
              body: uploadFormData,
            }
          );
          
          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            console.error('Cloudinary hatası:', errorData);
            throw new Error('Görüntü yükleme başarısız oldu: ' + (errorData.error?.message || 'Bilinmeyen hata'));
          }
          
          const uploadResult = await uploadResponse.json();
          imageUrl = uploadResult.secure_url;
          console.log('Görüntü yüklendi:', imageUrl);
          
          toast.success('Görüntü başarıyla yüklendi', { id: 'imageUpload' });
          if (fileSizeMB > 1) {
            toast.dismiss('imageOptimize');
          }
        } catch (uploadError) {
          console.error('Görüntü yükleme hatası:', uploadError);
          toast.error('Görüntü yüklenirken bir hata oluştu, plan görüntüsüz olarak kaydedilecek', { id: 'imageUpload' });
          if (fileSizeMB > 1) {
            toast.dismiss('imageOptimize');
          }
        }
      }
      
      // planData için interface tanımlayalım
      interface PlanData {
        title: string;
        description: string;
        location: string;
        isOnline: boolean;
        isFree: boolean;
        price: number;
        startDate: string;
        endDate: string;
        maxParticipants: number;
        isPrivate: boolean;
        allowInvites: boolean;
        cancellationPolicy?: string;
        imageUrl?: string;
      }
      
      const planData: PlanData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        location: formData.isOnline ? "Online Plan" : formData.location.trim(), 
        isOnline: formData.isOnline,
        isFree: formData.isFree,
        price: formData.isFree ? 0 : parseFloat(formData.price.toString()),
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        maxParticipants: maxParticipants,
        isPrivate: formData.isPrivate,
        allowInvites: true,
      };
      
      // Yüklenen görüntü varsa ekle
      if (imageUrl) {
        planData.imageUrl = imageUrl;
      }
      
      // İptal politikası ekle (sadece ücretli planlar için)
      if (!formData.isFree && formData.cancellationPolicy) {
        planData.cancellationPolicy = formData.cancellationPolicy.trim();
      }
      
      console.log("Gönderilen veri:", planData);
      
      // API'ye PATCH isteği gönder
      const response = await fetch(`/api/plans/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Plan güncellenirken bir hata oluştu');
      }
      
      toast.success("Plan başarıyla güncellendi!");
      router.push(`/plan/${id}`);
    } catch (error: any) {
      console.error("Plan güncelleme hatası:", error);
      toast.error(error.message || "Plan güncellenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <PageContainer title="Plan Düzenleniyor">
        <div className="flex justify-center items-center min-h-screen">
          <p>Yükleniyor...</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Plan Düzenle">
      <Card>
        <form onSubmit={handleSubmit}>
          <CardBody className="space-y-6">
            {/* Fotoğraf Yükleme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Plan Fotoğrafı
              </label>
              <div 
                className={`border-2 border-dashed rounded-lg p-4 text-center ${
                  formData.imagePreview 
                    ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                    : "border-gray-300 dark:border-gray-700"
                }`}
              >
                {formData.imagePreview ? (
                  <div className="relative">
                    <img 
                      src={formData.imagePreview} 
                      alt="Yüklenen fotoğraf" 
                      className="mx-auto h-64 object-cover rounded"
                    />
                    <button 
                      type="button"
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                      onClick={() => setFormData({ ...formData, imageFile: null, imagePreview: undefined })}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div>
                    <FaImage className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                    <div className="mt-2">
                      <label htmlFor="image-upload" className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline">
                        Fotoğraf Yükle
                      </label>
                      <input
                        id="image-upload"
                        name="image"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      PNG, JPG, GIF (max. 2MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Başlık ve Açıklama */}
            <div>
              <Input
                label="Başlık *"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Plan başlığı"
                required
                fullWidth
              />
            </div>
            
            <div>
              <TextArea
                label="Açıklama *"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Plan hakkında bilgiler..."
                required
                fullWidth
              />
            </div>
            
            {/* Tarih ve Saat */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Başlangıç *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    name="startDate"
                    type="date"
                    value={formData.startDate.toISOString().split('T')[0]}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                  <Input
                    name="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bitiş *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    name="endDate"
                    type="date"
                    value={formData.endDate.toISOString().split('T')[0]}
                    onChange={handleChange}
                    min={formData.startDate.toISOString().split('T')[0]}
                    required
                  />
                  <Input
                    name="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>
            
            {/* Online/Fiziksel plan seçimi */}
            <div className="mb-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isOnline"
                  name="isOnline"
                  checked={formData.isOnline}
                  onChange={handleIsOnlineChange}
                  className="h-4 w-4"
                />
                <label
                  htmlFor="isOnline"
                  className="text-sm font-medium leading-none"
                >
                  Bu bir online plan
                </label>
              </div>
            </div>
            
            {/* Konum veya Online Link */}
            <div className="mb-4">
              {formData.isOnline ? (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Online Link <span className="text-xs text-gray-500">(İsteğe bağlı)</span>
                  </label>
                  <Input
                    name="onlineLink"
                    value={formData.onlineLink}
                    onChange={handleChange}
                    placeholder="https://meet.google.com/..."
                    fullWidth
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Konum <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="location"
                    type="text"
                    placeholder="Plan konumu"
                    value={formData.location}
                    onChange={handleChange}
                    fullWidth
                  />
                </div>
              )}
            </div>
            
            {/* Ücret Bilgisi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ücret
              </label>
              <div className="flex items-center space-x-4 mb-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isFree"
                    checked={formData.isFree}
                    onChange={handleChange}
                    className="mr-2 h-4 w-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Ücretsiz plan
                  </span>
                </label>
              </div>
              {!formData.isFree && (
                <div className="flex items-center">
                  <Input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price.toString()}
                    onChange={handleChange}
                    placeholder="0.00"
                    fullWidth
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">₺</span>
                </div>
              )}
            </div>
            
            {/* Plan Erişimi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Plan Erişimi
              </label>
              <div className="flex items-center space-x-4 mb-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isPrivate"
                    checked={formData.isPrivate}
                    onChange={handleChange}
                    className="mr-2 h-4 w-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Özel plan (Sadece davet edilenler katılabilir)
                  </span>
                </label>
              </div>
            </div>
            
            {/* Katılımcı sayısı kontrolü */}
            <div className="mb-4">
              <label htmlFor="maxParticipants" className="block mb-2 text-sm font-medium text-gray-700">
                Katılımcı sayısı
              </label>
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="isLimitedParticipants"
                  name="isLimitedParticipants"
                  checked={formData.isLimitedParticipants}
                  onChange={handleIsLimitedParticipantsChange}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isLimitedParticipants" className="text-sm text-gray-700">
                  Katılımcı sayısını sınırla
                </label>
              </div>
              {formData.isLimitedParticipants && (
                <div>
                  <input
                    type="number"
                    id="maxParticipants"
                    name="maxParticipants"
                    value={formData.maxParticipants}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    min="1"
                  />
                  <p className="mt-1 text-xs text-gray-500">Maksimum katılımcı sayısını belirleyin.</p>
                </div>
              )}
              {!formData.isLimitedParticipants && (
                <p className="text-xs text-gray-500">Sınırsız katılımcı kabul edilecek.</p>
              )}
            </div>
            
            {/* İptal politikası alanı (sadece ücretli planlar için) */}
            {!formData.isFree && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  İptal Politikası <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col space-y-4">
                  <div>
                    <label className="block text-sm mb-1">
                      İptal süresi (dakika) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="cancellationTime"
                      type="number"
                      min="0"
                      placeholder="120"
                      value={formData.cancellationTime}
                      onChange={handleChange}
                      fullWidth
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Plan başlamadan kaç dakika öncesine kadar iptal edilebilir.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">
                      İptal politikası detayları <span className="text-red-500">*</span>
                    </label>
                    <TextArea
                      name="cancellationPolicy"
                      placeholder="İptal koşullarını ve iade politikanızı açıklayın"
                      value={formData.cancellationPolicy}
                      onChange={handleChange}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardBody>
          
          <CardFooter className="flex justify-end space-x-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/plan/${id}`)}
            >
              İptal
            </Button>
            <Button
              type="submit"
              loading={loading}
            >
              Planı Güncelle
            </Button>
          </CardFooter>
        </form>
      </Card>
    </PageContainer>
  );
} 
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

type NotificationType = 'system' | 'invitation' | 'message' | 'like' | 'join' | 'reminder';
type DeliveryType = 'email' | 'push';

const notificationLabels = {
  system: 'Sistem Bildirimleri',
  invitation: 'Davet Bildirimleri',
  message: 'Mesaj Bildirimleri',
  like: 'Beğeni Bildirimleri',
  join: 'Katılım Bildirimleri',
  reminder: 'Hatırlatıcı Bildirimleri',
};

const deliveryLabels = {
  email: 'E-posta Bildirimleri',
  push: 'Anlık Bildirimler',
};

const NotificationSettings: React.FC = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users/notification-preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      } else {
        toast.error('Bildirim tercihleri yüklenemedi');
      }
    } catch (error) {
      console.error('Tercihler getirme hatası:', error);
      toast.error('Bildirim tercihleri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/users/notification-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });
      
      if (response.ok) {
        toast.success('Bildirim tercihleri kaydedildi');
      } else {
        toast.error('Bildirim tercihleri kaydedilemedi');
      }
    } catch (error) {
      console.error('Tercihler kayıt hatası:', error);
      toast.error('Bildirim tercihleri kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4">Yükleniyor...</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Bildirim Ayarları</h2>
      
      <h3 className="font-medium mb-2 mt-4">Bildirim Türleri</h3>
      <div className="space-y-2">
        {Object.entries(notificationLabels).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between">
            <span>{label}</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={preferences[key] ?? true}
                onChange={() => handleToggle(key)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        ))}
      </div>
      
      <h3 className="font-medium mb-2 mt-6">Bildirim Kanalları</h3>
      <div className="space-y-2">
        {Object.entries(deliveryLabels).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between">
            <span>{label}</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={preferences[key] ?? true}
                onChange={() => handleToggle(key)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        ))}
      </div>
      
      <div className="mt-6">
        <button
          onClick={savePreferences}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
        >
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </div>
  );
};

export default NotificationSettings; 
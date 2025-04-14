import React, { useState } from 'react';
import { optimizeImageUrl } from '@/lib/cloudinary';

interface UserAvatarProps {
  src?: string;
  username?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  username = 'Kullanıcı',
  size = 'md',
  className = '',
  onClick,
}) => {
  const [imgError, setImgError] = useState(false);
  const defaultAvatar = '/images/avatars/default.png';
  
  // Profil resmi URL'sine zaman damgası ekle (önbellek sorunlarını çözmek için)
  const imgSrc = !imgError && src ? optimizeImageUrl(src) : defaultAvatar;
  
  // Boyut sınıfları
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };
  
  // İlk harfleri alma
  const initials = username
    ?.split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2) || '?';
  
  const handleError = () => {
    console.error('Avatar resmi yüklenemedi:', src);
    setImgError(true);
  };
  
  return (
    <div 
      className={`flex items-center justify-center rounded-full overflow-hidden bg-gray-200 ${sizeClasses[size]} ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {!imgError ? (
        <img
          src={imgSrc}
          alt={username}
          className="w-full h-full object-cover"
          onError={handleError}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white">
          {initials}
        </div>
      )}
    </div>
  );
};

export default UserAvatar; 
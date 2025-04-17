import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";

interface ProfileHeaderProps {
  user: {
    _id?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    bio?: string;
    profilePicture?: string;
    image?: string;
  } | null;
  isCurrentUser?: boolean;
}

const ProfileHeader = ({ user, isCurrentUser = false }: ProfileHeaderProps) => {
  const { data: session, status, update } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Profil resmi kontrolü
  const getUserImage = () => {
    if (profilePicture) return profilePicture;
    if (user?.profilePicture) return user.profilePicture;
    if (user?.image) return user.image;
    
    // Session'dan profil resmi kontrolü
    if (session?.user?.image) return session.user.image;
    if (session?.user?.profilePicture) return session.user.profilePicture;
    
    return "/images/avatars/default.png";
  };
  
  // Profil resmi yükleme
  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/upload/profile-picture", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Profil resmi yüklenemedi");
      }
      
      const data = await response.json();
      setProfilePicture(data.url);
      
      // Session ve API'yi güncelle
      await fetch("/api/user/update-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profilePicture: data.url,
        }),
      });
      
      // Session'ı güncelle
      if (session) {
        await update({ ...session, user: { ...session.user, profilePicture: data.url } });
      }
      
      toast.success("Profil resmi güncellendi");
    } catch (error) {
      console.error("Profil resmi yükleme hatası:", error);
      toast.error("Profil resmi yüklenemedi");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative mb-8">
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative w-24 h-24 rounded-full overflow-hidden">
          <img
            src={getUserImage()}
            alt={user?.username || "Profil"}
            className="w-full h-full object-cover profile-image"
          />
          
          {isCurrentUser && (
            <div className="absolute bottom-0 right-0">
              <label 
                htmlFor="profile-upload" 
                className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full cursor-pointer hover:bg-blue-700 transition-colors"
              >
                <input
                  type="file"
                  id="profile-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                  disabled={isUploading}
                />
                {isUploading ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <span>📷</span>
                )}
              </label>
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-center md:items-start">
          {/* Kullanıcı adı veya isim gösterimi */}
          <h1 className="text-2xl font-bold">
            {user?.username || 
             (user?.firstName && user?.lastName) 
               ? `${user?.firstName || ''} ${user?.lastName || ''}`
               : user?.firstName || user?.name || session?.user?.name || "Misafir"}
          </h1>
          
          {/* Kullanıcı bio bölümü */}
          <p className="text-gray-600 dark:text-gray-300 text-center md:text-left">
            {user?.bio || "Henüz bir bio yazılmamış."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader; 
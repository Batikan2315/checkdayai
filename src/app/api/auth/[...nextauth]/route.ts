import NextAuth, { AuthOptions, NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { generateToken } from "@/lib/auth";
import { JWT } from "next-auth/jwt";
import crypto from "crypto";
import { DefaultSession } from "next-auth";
import { uploadProfileImage } from "@/lib/cloudinary";
import axios from "axios";

// Google profil tipini tanımla
interface GoogleProfile {
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  sub: string;
}

// Google'dan gelen resmi base64 formatına dönüştür
const fetchImageAsBase64 = async (imageUrl: string): Promise<string | null> => {
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const contentType = response.headers['content-type'];
    const buffer = Buffer.from(response.data, 'binary');
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error("Resim indirme hatası:", error);
    return null;
  }
};

// Benzersiz kullanıcı adı oluştur
const generateUniqueUsername = async (name: string): Promise<string> => {
  // Boşlukları kaldır ve sadece alfanumerik karakterleri kabul et
  let baseUsername = name
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 15); // Max 15 karakter
  
  // Türkçe karakterleri İngilizce muadillerine dönüştür
  baseUsername = baseUsername
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
  
  // Eğer boşsa veya çok kısaysa
  if (!baseUsername || baseUsername.length < 3) {
    baseUsername = "user";
  }
  
  // Kullanıcı adı mevcut mu kontrol et
  const existingUser = await User.findOne({ username: baseUsername });
  
  if (!existingUser) {
    console.log("Oluşturulan kullanıcı adı:", baseUsername);
    return baseUsername;
  }
  
  // Mevcut ise rasgele bir sayı ekle
  let uniqueUsername;
  let isUnique = false;
  let attempts = 0;
  
  while (!isUnique && attempts < 10) {
    attempts++;
    // 3 basamaklı rasgele sayı ekle
    const randomSuffix = Math.floor(Math.random() * 900 + 100);
    uniqueUsername = `${baseUsername.slice(0, 12)}${randomSuffix}`;
    
    const existingUserWithNewName = await User.findOne({ username: uniqueUsername });
    if (!existingUserWithNewName) {
      isUnique = true;
    }
  }
  
  console.log("Oluşturulan benzersiz kullanıcı adı:", uniqueUsername);
  return uniqueUsername || `${baseUsername}${Date.now().toString().slice(-3)}`;
};

// Google ile giriş yapan kullanıcının profil resmini optimize et ve önbellekleme sorunlarını çöz
const getOptimizedProfilePicture = async (googleImage: string, userId: string, existingImage?: string | null): Promise<string> => {
  try {
    // Eğer profil resmi yoksa, varsayılan resmi kullan
    if (!googleImage) return '/images/avatars/default.png';
    
    // Google profil resmini base64 olarak getir
    const profileImageBase64 = await fetchImageAsBase64(googleImage);
    
    // Base64 dönüştürme başarısızsa, Google URL'yi döndür (cache busting ile)
    if (!profileImageBase64) {
      return googleImage + `?t=${Date.now()}`;
    }

    // Profil resmini Cloudinary'ye yükle (optimize edilmiş olarak)
    const imageUrl = await uploadProfileImage(
      profileImageBase64,
      userId
    );
    
    // Önbellek sorunlarını önlemek için URL'ye zaman damgası ekle
    return imageUrl + `?t=${Date.now()}`;
  } catch (error) {
    console.error("Profil resmi optimize edilemedi:", error);
    // Sorun olursa, orijinal Google URL'sini döndür ama önbellekleme sorunlarını önle
    return googleImage + `?t=${Date.now()}`;
  }
};

console.log("NextAuth yapılandırılıyor. Callback URL:", process.env.NEXTAUTH_URL);
console.log("Google Client ID:", process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + "...");

// Session tipi genişletmesi
declare module "next-auth" {
  // Default tipler için tip geçersiz kılma işlemini kullanıyoruz
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: string;
      // Diğer özel alanlar
      oauth_id?: string;
      provider?: string;
      username?: string;
      firstName?: string;
      lastName?: string;
      balance?: number;
      profilePicture?: string;
    }
  }
  
  interface User {
    role: string;
    oauth_id?: string;
    provider?: string;
  }
}

// JWT tipi genişletmesi
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    oauth_id?: string;
    provider?: string;
  }
}

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("E-posta ve şifre gereklidir");
        }

        await connectDB();
        
        // Kullanıcıyı e-posta ile bul
        const user = await User.findOne({ email: credentials.email }).select('+password');
        if (!user) {
          throw new Error("Geçersiz e-posta veya şifre");
        }
        
        // E-posta doğrulanmış mı kontrolü
        if (!user.isVerified) {
          throw new Error("Lütfen önce e-posta adresinizi doğrulayın");
        }
        
        console.log("Şifre doğrulama işlemi başlatılıyor...");
        
        // Şifreyi kontrol et
        const isMatch = await user.comparePassword(credentials.password);
        
        console.log("Şifre eşleşme sonucu:", isMatch);
        
        if (!isMatch) {
          throw new Error("Geçersiz e-posta veya şifre");
        }

        // Token oluştur
        const tokenPayload = {
          id: user._id.toString(),
          email: user.email,
          role: user.role
        };
        
        const token = generateToken(tokenPayload);
        
        return {
          id: user._id.toString(),
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
          image: user.profilePicture || null,
          token: token,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (account && profile) {
        token.id = token.sub;
        token.role = "user"; // Varsayılan olarak user rolü
        token.provider = account.provider;
        token.oauth_id = token.sub; // OAuth ID'sini token'a ekliyoruz
      }
      
      // MongoDB'den kullanıcı bilgilerini ve rolünü al
      try {
        await connectDB();
        let dbUser;
        
        if (token.oauth_id) {
          console.log("JWT - OAuth ID ile kullanıcı aranıyor:", token.oauth_id);
          dbUser = await User.findOne({ oauth_id: token.oauth_id });
        } else if (token.email) {
          console.log("JWT - E-posta ile kullanıcı aranıyor:", token.email);
          dbUser = await User.findOne({ email: token.email });
        }
        
        if (dbUser && dbUser.role) {
          console.log("JWT - MongoDB'den rol alındı:", dbUser.role);
          token.role = dbUser.role;
        }
      } catch (error) {
        console.error("JWT - MongoDB rolü alınamadı:", error);
      }
      
      console.log("JWT - Güncel token:", token);
      return token;
    },
    async session({ session, token }) {
      // Kullanıcı ID'sini session'a ekle
      if (session?.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        
        // OAuth ID ve provider bilgilerini ekle
        if (token.oauth_id) {
          (session.user as any).oauth_id = token.oauth_id;
        }
        if (token.provider) {
          (session.user as any).provider = token.provider;
        }
        
        try {
          await connectDB();
          let dbUser;
          
          if (token.oauth_id) {
            dbUser = await User.findOne({ oauth_id: token.oauth_id });
          } else if (token.email) {
            dbUser = await User.findOne({ email: token.email });
          }
          
          if (dbUser) {
            // Kullanıcı adını ekle
            (session.user as any).username = dbUser.username;
            
            // Ad ve soyadı ekle
            (session.user as any).firstName = dbUser.firstName;
            (session.user as any).lastName = dbUser.lastName;
            
            // Bakiye ekle
            (session.user as any).balance = dbUser.balance;
            
            // Profil resmini ekle (son cache busting için yeni timestamp ekle)
            const profilePicUrl = dbUser.profilePicture;
            if (profilePicUrl) {
              (session.user as any).profilePicture = profilePicUrl.includes('?') 
                ? profilePicUrl.split('?')[0] + `?t=${Date.now()}`
                : profilePicUrl + `?t=${Date.now()}`;
            }
          }
        } catch (error) {
          console.error("SESSION - Kullanıcı veri alınamadı:", error);
        }
      }
      
      console.log("SESSION - Güncel oturum:", session);
      return session;
    },
    async signIn({ user, account, profile }) {
      // Google ile giriş yapıldığında
      if (account?.provider === 'google' && profile) {
        try {
          await connectDB();
          
          // Google profil nesnesini uygun tip ile işle
          const googleProfile = profile as GoogleProfile;
          
          // Kullanıcı adı oluşturmak için ismi kullan
          const name = googleProfile.name || 'user';
          
          // Google OAuth ID'si ile kullanıcı var mı kontrol et
          let existingUser = await User.findOne({ oauth_id: googleProfile.sub });
          
          // OAuth ID ile kullanıcı bulunamadıysa e-posta ile de kontrol et
          if (!existingUser && googleProfile.email) {
            existingUser = await User.findOne({ email: googleProfile.email });
          }
          
          if (existingUser) {
            // Kullanıcı zaten varsa, OAuth bilgilerini güncelle
            existingUser.oauth_id = existingUser.oauth_id || googleProfile.sub;
            existingUser.provider = existingUser.provider || 'google';
            
            // E-posta doğrulamasını otomatik olarak tamamla
            if (!existingUser.isVerified) {
              existingUser.isVerified = true;
              existingUser.verificationToken = undefined;
              existingUser.verificationExpires = undefined;
            }
            
            // Profil resmi güncelleme işlemi
            if (googleProfile.picture && typeof googleProfile.picture === 'string') {
              // Google profil resmini optimize et ve Cloudinary'ye yükle
              const optimizedProfilePic = await getOptimizedProfilePicture(
                googleProfile.picture,
                existingUser._id.toString(),
                existingUser.profilePicture
              );
              
              existingUser.profilePicture = optimizedProfilePic;
            }
            
            // Ad-soyad bilgilerini güncelle (eğer boşsa)
            if (!existingUser.firstName && googleProfile.given_name) {
              existingUser.firstName = googleProfile.given_name;
            }
            if (!existingUser.lastName && googleProfile.family_name) {
              existingUser.lastName = googleProfile.family_name;
            }
            
            await existingUser.save();
            console.log("Mevcut kullanıcı güncellendi (Google):", existingUser.email);
          } else {
            // Benzersiz kullanıcı adı oluştur
            const username = await generateUniqueUsername(name);
            
            // Yeni kullanıcı oluştur
            const newUser = new User({
              email: googleProfile.email,
              firstName: googleProfile.given_name || "",
              lastName: googleProfile.family_name || "",
              username: username,
              isVerified: true, // Google hesabı doğrulanmış kabul edilir
              oauth_id: googleProfile.sub, // Google tarafından verilen kimlik
              provider: 'google',
              role: "user",
            });
            
            // Profil resmi ekleme
            if (googleProfile.picture && typeof googleProfile.picture === 'string') {
              // Google profil resmini optimize et ve Cloudinary'ye yükle
              const optimizedProfilePic = await getOptimizedProfilePicture(
                googleProfile.picture,
                newUser._id.toString()
              );
              
              newUser.profilePicture = optimizedProfilePic;
            }
            
            await newUser.save();
            console.log("Yeni Google kullanıcısı oluşturuldu:", newUser.email);
          }
          
          return true;
        } catch (error) {
          console.error("Google ile giriş hatası:", error);
          return false;
        }
      }
      
      return true;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 gün
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/giris",
    error: "/giris?error=AuthError",
  },
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST } 
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

export const authOptions: NextAuthOptions = {
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
        
        // Veritabanından kullanıcı bilgilerini al
        try {
          await connectDB();
          
          // Google/OAuth kullanıcıları için ObjectId hatasını önlemek için
          // doğrudan oauth_id ile kullanıcıyı buluyoruz
          let query = {};
          
          if (token.oauth_id) {
            // OAuth kimliği varsa, önce onunla arayalım
            query = { oauth_id: token.oauth_id };
            console.log("OAuth ID ile kullanıcı aranıyor:", token.oauth_id);
          } else if (token.id && token.id.length === 24 && /^[0-9a-fA-F]{24}$/.test(token.id)) {
            // ID, MongoDB ObjectID formatında ise (_id olarak arayabiliriz)
            query = { _id: token.id };
            console.log("MongoDB ID (_id) ile kullanıcı aranıyor:", token.id);
          } else {
            // Diğer durumlar için email ile arama yapalım
            query = { email: session.user.email };
            console.log("E-posta ile kullanıcı aranıyor:", session.user.email);
          }
          
          console.log("Kullanıcı bulma sorgusu:", query);
          const dbUser = await User.findOne(query);
          
          if (dbUser) {
            console.log("Kullanıcı bulundu, session güncelleniyor");
            // Veritabanından gelen bilgileri session'a ekle
            session.user.name = dbUser.firstName && dbUser.lastName 
              ? `${dbUser.firstName} ${dbUser.lastName}`.trim() 
              : dbUser.username;
            
            // Kullanıcı adını ekle
            (session.user as any).username = dbUser.username;
            
            // Diğer bilgileri ekle
            (session.user as any).firstName = dbUser.firstName || '';
            (session.user as any).lastName = dbUser.lastName || '';
            (session.user as any).balance = dbUser.balance || 0;
            
            // _id değerini OAuth ID'si yerine MongoDB _id olarak ayarla
            session.user.id = dbUser._id.toString();
            
            // Profil resmini güncelle
            if (dbUser.profilePicture) {
              session.user.image = dbUser.profilePicture;
            }
          } else {
            console.log("Kullanıcı bulunamadı, session bilgileri varsayılan olarak bırakıldı");
          }
        } catch (error) {
          console.error("Session callback db hatası:", error);
        }
      }
      
      return session;
    },
    async signIn({ user, account, profile }) {
      try {
        console.log("Sign in callback çalışıyor. Provider:", account?.provider);
        
        if (!user || !account || !profile) {
          console.error("Kullanıcı veya hesap bilgileri eksik.");
          return false;
        }
        
        if (account.provider === "google") {
          const googleProfile = profile as any;
          console.log("Google ile giriş yapan kullanıcı:", googleProfile.email);
          
          await connectDB();
          
          // Kullanıcı zaten var mı diye kontrol et
          const existingUser = await User.findOne({ email: googleProfile.email });
          
          if (existingUser) {
            console.log("Kullanıcı zaten var, profil güncelleniyor");
            
            // OAuth ID'sini güncelle
            existingUser.oauth_id = profile.sub || googleProfile.sub;
            
            // Profil resmini ve diğer bilgileri güncelle
            if (googleProfile.picture && (!existingUser.profilePicture || existingUser.profilePicture.includes("default"))) {
              try {
                // Optimize edilmiş profil resmi al
                const optimizedImage = await getOptimizedProfilePicture(
                  googleProfile.picture,
                  existingUser._id.toString()
                );
                existingUser.profilePicture = optimizedImage;
                console.log("Profil resmi optimize edildi ve önbellekleme sorunları giderildi");
              } catch (imageError) {
                console.error("Profil resmi işlenirken hata:", imageError);
                // Hata durumunda doğrudan Google URL'sini kaydet (önbellek bypass ile)
                existingUser.profilePicture = googleProfile.picture + `?t=${Date.now()}`;
              }
            }
            
            if (googleProfile.name && !existingUser.firstName) {
              // Türkçe karakterleri düzgün şekilde kaydedelim
              existingUser.firstName = googleProfile.name;
            }
            
            // Google'dan gelen provider bilgisini de ekleyelim
            existingUser.provider = "google";
            
            console.log("Kullanıcı güncellemesi:", existingUser);
            await existingUser.save();
            
            return true;
          } else {
            console.log("Yeni kullanıcı oluşturuluyor");
            
            // Benzersiz kullanıcı adı oluştur
            const username = await generateUniqueUsername(googleProfile.name || googleProfile.email);
            console.log("Oluşturulan kullanıcı adı:", username);
            
            // İsim alanında Türkçe karakterleri koruyalım
            const firstName = googleProfile.name || googleProfile.given_name || '';
            const lastName = googleProfile.family_name || '';
            
            // Profil resmi için varsayılan değer
            let profilePicture = '/images/avatars/default.png';
            
            // Google profil resmini işle (varsa)
            if (googleProfile.picture) {
              try {
                // Optimize edilmiş profil resmi al (yeni kullanıcı için henüz ID yok, oluşturulduktan sonra güncelle)
                profilePicture = googleProfile.picture + `?t=${Date.now()}`; // Geçici olarak Google URL'sini kullan
              } catch (imageError) {
                console.error("Profil resmi işlenirken hata:", imageError);
                // Hata durumunda varsayılan resmi kullan
              }
            }
            
            // Yeni kullanıcı oluştur
            const newUser = await User.create({
              email: googleProfile.email,
              username,
              password: crypto.randomBytes(16).toString('hex'), // Rastgele şifre oluştur
              firstName: firstName,
              lastName: lastName,
              isVerified: googleProfile.email_verified || true,
              profilePicture: profilePicture,
              role: 'user',
              oauth_id: profile.sub || googleProfile.sub,
              provider: account.provider
            });
            
            console.log("Yeni kullanıcı oluşturuldu:", newUser._id);
            
            // Eğer Google profil resmi varsa, kullanıcı oluşturulduktan sonra
            // Cloudinary'ye optimize edilmiş şekilde yükle
            if (googleProfile.picture) {
              try {
                // Şimdi optimize edilmiş profil resmini alalım (kullanıcı ID'si mevcut)
                const optimizedImage = await getOptimizedProfilePicture(
                  googleProfile.picture,
                  newUser._id.toString()
                );
                
                // Kullanıcı profil resmini güncelle
                await User.findByIdAndUpdate(newUser._id, { profilePicture: optimizedImage });
                console.log("Yeni kullanıcının profil resmi optimize edildi");
              } catch (imageError) {
                console.error("Yeni kullanıcı profil resmi işlenirken hata:", imageError);
                // Hata durumunda herhangi bir işlem yapma, varsayılan Google URL'si kalacak
              }
            }
            
            return true;
          }
        }
        
        return true;
      } catch (error) {
        console.error("Giriş hatası:", error);
        return false;
      }
    },
  },
  pages: {
    signIn: "/giris",
    error: "/giris",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 gün
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 
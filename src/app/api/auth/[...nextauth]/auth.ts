import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      id: "credentials",
      name: "E-posta ve Şifre",
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error("E-posta ve şifre gereklidir");
          }
          
          await connectDB();
          
          // E-posta adresine göre kullanıcı kontrolü
          const user = await User.findOne({ email: credentials.email }).select('+password');
          
          if (!user) {
            throw new Error("Kullanıcı bulunamadı");
          }
          
          // E-posta doğrulaması kontrolü
          if (!user.isVerified) {
            throw new Error("Lütfen önce e-posta adresinizi doğrulayın");
          }
          
          // Şifre kontrolü
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          
          if (!isPasswordValid) {
            throw new Error("Hatalı şifre");
          }
          
          console.log(`Kullanıcı giriş yaptı: ${user.email}, Rol: ${user.role}`);
          
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username,
            image: user.profilePicture,
            role: user.role
          };
        } catch (error: any) {
          console.error("Giriş hatası:", error.message);
          throw new Error(error.message || "Giriş yapılırken bir hata oluştu");
        }
      }
    })
  ],
  secret: process.env.JWT_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 gün
  },
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider === "google") {
        try {
          await connectDB();
          
          // Google profilinden bilgileri al
          const email = profile?.email;
          const name = profile?.name;
          const imageUrl = profile?.image;
          const oauthId = account.providerAccountId;
          
          if (!email) {
            return false;
          }
          
          // Kullanıcıyı kontrol et
          const existingUser = await User.findOne({ email });
          
          if (existingUser) {
            // Kullanıcı varsa bilgilerini güncelle
            existingUser.oauth_id = oauthId;
            existingUser.provider = "google";
            
            // Profil resmi yoksa ekle
            if (!existingUser.profilePicture && imageUrl) {
              existingUser.profilePicture = imageUrl;
            }
            
            // Ad soyad bilgisi yoksa gereken ayarlamaları yap
            if (!existingUser.firstName || !existingUser.lastName) {
              // Ad soyad ayırma
              const nameParts = name?.split(" ") || [];
              if (nameParts.length > 0) {
                if (!existingUser.firstName) {
                  existingUser.firstName = nameParts[0];
                }
                if (!existingUser.lastName && nameParts.length > 1) {
                  existingUser.lastName = nameParts.slice(1).join(" ");
                }
              }
              
              // Kullanıcı adı yoksa oluştur - kurulum ihtiyacı belirle
              if (!existingUser.username) {
                existingUser.needsSetup = true;
              }
            }
            
            await existingUser.save();
          } else {
            // Kullanıcı yoksa yeni oluştur
            const nameParts = name?.split(" ") || [];
            const firstName = nameParts[0] || "";
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
            
            await User.create({
              email,
              firstName,
              lastName,
              profilePicture: imageUrl,
              oauth_id: oauthId,
              provider: "google",
              isVerified: true,
              needsSetup: true,
              role: email === "batikan@checkday.org" ? "admin" : "user"
            });
          }
          
          return true;
        } catch (error) {
          console.error("Google sign-in error:", error);
          return false;
        }
      }
      
      return true;
    },
    
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "user";
      }
      
      if (account) {
        token.provider = account.provider;
      }
      
      // Kullanıcı bilgilerini MongoDB'den al
      try {
        await connectDB();
        const dbUser = await User.findOne({ email: token.email });
        
        if (dbUser) {
          token.id = dbUser._id.toString();
          token.role = dbUser.role || "user";
          token.username = dbUser.username;
          token.oauth_id = dbUser.oauth_id;
          token.firstName = dbUser.firstName;
          token.lastName = dbUser.lastName;
          token.profilePicture = dbUser.profilePicture;
          
          // Google profil resmi kontrolü - DB'de yoksa Google'dan gelen resmi kullan
          if (!token.profilePicture && token.picture) {
            token.profilePicture = token.picture;
          }
        }
      } catch (error) {
        console.error("JWT callback error:", error);
      }
      
      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        // Tüm token bilgilerini session.user'a aktar
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).username = token.username;
        (session.user as any).provider = token.provider;
        (session.user as any).oauth_id = token.oauth_id;
        (session.user as any).firstName = token.firstName;
        (session.user as any).lastName = token.lastName;
        (session.user as any).profilePicture = token.profilePicture;
        
        // Google profil resmi kontrolü
        if (!session.user.profilePicture && session.user.image) {
          (session.user as any).profilePicture = session.user.image;
        }
      }
      
      return session;
    },
  },
}; 
import jwt from "jsonwebtoken";
import { UserSession } from "./types";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import User from "@/models/User";
import { connectDB } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "checkday-secret-key";

// NextAuth.js için options
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        try {
          await connectDB();
          
          // Kullanıcıyı e-posta ile bul
          const user = await User.findOne({ email: credentials.email }).select('+password');
          
          if (!user) {
            return null;
          }
          
          // E-posta doğrulanmış mı kontrol et
          if (!user.isVerified) {
            throw new Error("Lütfen önce e-posta adresinizi doğrulayın");
          }
          
          // Şifreyi doğrula
          const isValid = await user.comparePassword(credentials.password);
          
          if (!isValid) {
            return null;
          }
          
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.username,
            image: user.profilePicture,
            role: user.role
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, account }) => {
      if (user) {
        console.log("JWT callback - user bilgileri:", user);
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        token.role = user.role;
        
        // OAuth giriş ise oauth_id ve provider ekle
        if (account?.provider) {
          token.provider = account.provider;
          token.oauth_id = token.sub;
        }

        // Özel admin kontrolü - bilinen admin e-postaları için
        if (token.email === "batikan@checkday.org") {
          console.log("JWT callback - Admin e-postası tespit edildi, admin rolü atanıyor");
          token.role = "admin";
        }

        // Tüm giriş yöntemleri için MongoDB'den rol kontrolü yap
        try {
          await connectDB();
          let dbUser;
          
          if (token.oauth_id) {
            dbUser = await User.findOne({ oauth_id: token.oauth_id });
          } else if (token.email) {
            dbUser = await User.findOne({ email: token.email });
          }
          
          if (dbUser && dbUser.role) {
            console.log("JWT callback - MongoDB'den rol alındı:", dbUser.role);
            token.role = dbUser.role;
          } else if (!token.role) {
            console.log("JWT callback - role değeri eksik, varsayılan atanıyor");
            token.role = "user";
          }
          
          // Eğer bilinen bir admin e-postası ise ve veritabanında rolü ayarlanmamışsa, güncelle
          if (token.email === "batikan@checkday.org" && (!dbUser?.role || dbUser.role !== "admin")) {
            console.log("Admin rolü veritabanında güncelleniyor...");
            await User.updateOne(
              { email: token.email },
              { $set: { role: "admin" } }
            );
          }
        } catch (error) {
          console.error("JWT callback - MongoDB rolü alınamadı:", error);
          if (!token.role) token.role = "user";
        }
        
        console.log("JWT callback - token oluşturuldu:", token);
      }
      return token;
    },
    session: async ({ session, token }) => {
      console.log("Session callback - token:", token);
      
      if (token) {
        if (!session.user) session.user = { id: '', role: '' };
        
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
        session.user.role = token.role as string;
        
        console.log("Session callback - session güncellendi:", session);
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 gün
  },
  secret: JWT_SECRET,
  pages: {
    signIn: "/giris",
    error: "/giris"
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NODE_ENV === "production" ? ".checkday.ai" : undefined
      }
    }
  }
};

// Token için payload tipi tanımla
interface TokenPayload {
  id: string;
  email: string;
  role?: string;
}

// JWT token oluşturma
export const generateToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_SECRET || 'supersecret';
  
  // Admin e-posta kontrolü
  if (payload.email === "batikan@checkday.org") {
    payload.role = "admin";
  }
  
  // 1 gün geçerli token
  return jwt.sign(payload, secret, { expiresIn: '1d' });
};

// Token doğrulama
export const verifyToken = (token: string): any => {
  const secret = process.env.JWT_SECRET || 'supersecret';
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Geçersiz veya süresi dolmuş token');
  }
};

// Yetki kontrolü
export const checkPermission = (
  userId: string,
  resourceUserId: string,
  isAdmin: boolean
) => {
  return userId === resourceUserId || isAdmin;
};

// E-posta doğrulama token'ı oluştur
export const generateVerificationToken = (email: string): string => {
  return jwt.sign({ email }, JWT_SECRET, {
    expiresIn: "1d",
  });
};

// Şifre sıfırlama token'ı oluştur
export const generateResetToken = (email: string): string => {
  return jwt.sign({ email }, JWT_SECRET, {
    expiresIn: "1h",
  });
};

// E-posta doğrulama ve şifre sıfırlama token'ını doğrula
export const verifyEmailToken = (token: string): string | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
    return decoded.email;
  } catch (error) {
    return null;
  }
};

// Kullanıcı rolünü kontrol et
export const isAdmin = (role: string): boolean => {
  return role === "admin";
}; 
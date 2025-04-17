import 'next-auth';
import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';
import NextAuth from "next-auth";

declare module 'next-auth' {
  /**
   * Kullanıcı ile ilgili geliştirilen özel alanların NextAuth ile kullanılması için genişletilmiş tip tanımlaması
   */
  interface User {
    id: string;
    email: string;
    isAdmin?: boolean;
    username?: string;
    firstName?: string;
    lastName?: string;
    provider?: string;
    role?: string;
    profilePicture?: string;
  }

  /**
   * Session kullanıcı verisini genişletme
   */
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      isAdmin: boolean;
      username?: string;
      firstName?: string;
      lastName?: string;
      provider?: string;
      role?: string;
      profilePicture?: string;
    }
  }

  /**
   * JWT token verisini genişletme
   */
  interface JWT {
    id: string;
    email?: string;
    name?: string;
    isAdmin: boolean;
    username?: string;
    firstName?: string;
    lastName?: string;
    provider?: string;
    role?: string;
  }
}

declare module 'next-auth/jwt' {
  /**
   * JWT için tip tanımlarını genişletme
   */
  interface JWT extends DefaultJWT {
    id: string;
    isAdmin: boolean;
    username?: string;
    firstName?: string;
    lastName?: string;
    image?: string;
    provider?: string;
    role?: string;
    profilePicture?: string;
  }
} 
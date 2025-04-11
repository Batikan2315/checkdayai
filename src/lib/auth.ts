import jwt from "jsonwebtoken";
import { UserSession } from "./types";

const JWT_SECRET = process.env.JWT_SECRET || "checkday-secret-key";

// JWT token oluştur
export const generateToken = (id: string, email: string, role: string): string => {
  return jwt.sign({ id, email, role }, JWT_SECRET, {
    expiresIn: "30d",
  });
};

// JWT token doğrula
export const verifyToken = (token: string): UserSession | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserSession;
    return decoded;
  } catch (error) {
    return null;
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
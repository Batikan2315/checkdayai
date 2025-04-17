import jwt from "jsonwebtoken";
import { UserSession } from "./types";
import bcrypt from "bcryptjs";
import { getAuth, requireAuth, requireAdmin } from "./auth-helpers";

const JWT_SECRET = process.env.JWT_SECRET || "checkday-secret-key";

// Token için payload tipi tanımla
interface TokenPayload {
  id: string;
  email: string;
  role?: string;
}

// Şifre karşılaştırma
export const verifyPassword = async (
  enteredPassword: string, 
  storedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(enteredPassword, storedPassword);
};

// JWT token oluşturma - SERVER ONLY
export const generateToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_SECRET || 'supersecret';
  
  // Admin e-posta kontrolü
  if (payload.email === "batikan@checkday.org") {
    payload.role = "admin";
  }
  
  // 1 gün geçerli token
  return jwt.sign(payload, secret, { expiresIn: '1d' });
};

// Token doğrulama - SERVER ONLY
export const verifyToken = (token: string): any => {
  const secret = process.env.JWT_SECRET || 'supersecret';
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Geçersiz veya süresi dolmuş token');
  }
};

// Yetki kontrolü - PUBLIC
export const checkPermission = (
  userId: string,
  resourceUserId: string,
  isAdmin: boolean
) => {
  return userId === resourceUserId || isAdmin;
};

// E-posta doğrulama token'ı oluştur - SERVER ONLY
export const generateVerificationToken = (email: string): string => {
  return jwt.sign({ email }, JWT_SECRET, {
    expiresIn: "1d",
  });
};

// Şifre sıfırlama token'ı oluştur - SERVER ONLY
export const generateResetToken = (email: string): string => {
  return jwt.sign({ email }, JWT_SECRET, {
    expiresIn: "1h",
  });
};

// E-posta doğrulama ve şifre sıfırlama token'ını doğrula - SERVER ONLY
export const verifyEmailToken = (token: string): string | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
    return decoded.email;
  } catch (error) {
    return null;
  }
};

// Kullanıcı rolünü kontrol et - PUBLIC
export const isAdmin = (role: string): boolean => {
  return role === "admin";
};

// Yardımcı fonksiyonları yeniden dışa aktar
export { getAuth, requireAuth, requireAdmin }; 
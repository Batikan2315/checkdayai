import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { redirect } from "next/navigation";

/**
 * Mevcut oturumu döndüren yardımcı fonksiyon
 */
export async function getAuth() {
  return await getServerSession(authOptions);
}

/**
 * Kullanıcı giriş yapmamışsa login sayfasına yönlendiren yardımcı fonksiyon
 */
export async function requireAuth() {
  const session = await getAuth();
  
  if (!session) {
    redirect("/login");
  }
  
  return session;
}

/**
 * Kullanıcı admin değilse anasayfaya yönlendiren yardımcı fonksiyon
 */
export async function requireAdmin() {
  const session = await getAuth();
  
  if (!session) {
    redirect("/login");
  }
  
  if (!session.user.isAdmin) {
    redirect("/");
  }
  
  return session;
} 
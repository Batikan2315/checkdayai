import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // Korumalı rotalar
  const isProtectedRoute = 
    path.startsWith('/admin') || 
    path.startsWith('/profile')
  
  // Kimliği doğrulanmış kullanıcı için kısıtlı sayfalar (örn. login sayfası)
  const isAuthRoute = path.startsWith('/login') || path.startsWith('/register')
  
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  })
  
  // Kullanıcı oturum açmamışsa ve korumalı bir rotaya erişmeye çalışıyorsa
  if (!token && isProtectedRoute) {
    const url = new URL('/login', request.url)
    url.searchParams.set('callbackUrl', encodeURI(request.url))
    return NextResponse.redirect(url)
  }
  
  // Kullanıcı zaten oturum açmışsa ve login/register sayfalarına erişmeye çalışıyorsa
  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  
  // Admin rotaları için admin kontrolü 
  if (path.startsWith('/admin') && token && !token.isAdmin) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  
  return NextResponse.next()
}

// Middleware'in uygulanacağı yollar
export const config = {
  matcher: [
    '/admin/:path*', 
    '/profile/:path*', 
    '/login', 
    '/register',
  ]
} 
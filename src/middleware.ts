import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const pathname = url.pathname
  
  // @ işareti ile başlayan path'leri yönlendir
  if (pathname.startsWith('/@')) {
    // @ işaretini kaldır
    const username = pathname.slice(2) // '/@' kısmını kaldır
    url.pathname = `/${username}`
    return NextResponse.redirect(url)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    // @ ile başlayan tüm path'leri kontrol et
    '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
  ],
} 
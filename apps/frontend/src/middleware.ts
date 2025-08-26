import { NextRequest, NextResponse } from 'next/server'
// import { createSessionMiddleware } from '@/lib/security/session-management'

// Supported locales for i18n
const locales = ['en', 'es', 'fr', 'de', 'ja', 'zh']
const defaultLocale = 'en'

function getLocale(request: NextRequest): string {
  // Check if locale is in URL path
  const pathname = request.nextUrl.pathname
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameHasLocale) {
    return pathname.split('/')[1]
  }

  // Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language')
  if (acceptLanguage) {
    for (const locale of locales) {
      if (acceptLanguage.includes(locale)) {
        return locale
      }
    }
  }

  // Check stored preference
  const storedLocale = request.cookies.get('locale')?.value
  if (storedLocale && locales.includes(storedLocale)) {
    return storedLocale
  }

  return defaultLocale
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check if pathname has locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  // Redirect if no locale in pathname
  if (!pathnameHasLocale) {
    const locale = getLocale(request)
    const newUrl = new URL(`/${locale}${pathname}`, request.url)
    const response = NextResponse.redirect(newUrl)
    
    // Set locale cookie
    response.cookies.set('locale', locale, {
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })
    
    return response
  }

  // Handle session management
  // const sessionMiddleware = createSessionMiddleware()
  // const sessionResponse = await sessionMiddleware(request)
  
  // if (sessionResponse) {
  //   return sessionResponse
  // }

  // Continue with request
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function generateNonce() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function buildCsp(nonce: string) {
  const isDev = process.env.NODE_ENV !== 'production'
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    'https://www.googletagmanager.com',
    'https://va.vercel-scripts.com',
  ]
  if (isDev) {
    scriptSrc.push("'unsafe-eval'")
  }

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "img-src 'self' data: https://images.unsplash.com https://i.ytimg.com https://www.google-analytics.com",
    "style-src 'self' 'unsafe-inline'",
    "style-src-attr 'unsafe-inline'",
    `script-src ${scriptSrc.join(' ')}`,
    "script-src-attr 'none'",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://vitals.vercel-insights.com https://www.google-analytics.com https://www.googletagmanager.com",
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "upgrade-insecure-requests",
    "block-all-mixed-content",
    "report-uri /api/csp-report",
  ].join('; ')
}

export async function proxy(request: NextRequest) {
  const nonce = generateNonce()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  const csp = buildCsp(nonce)

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  supabaseResponse.headers.set('Content-Security-Policy', csp)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          supabaseResponse.headers.set('Content-Security-Policy', csp)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: do not add logic between createServerClient and getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirectResponse = NextResponse.redirect(url)
    redirectResponse.headers.set('Content-Security-Policy', csp)
    return redirectResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

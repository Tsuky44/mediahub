import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

function isLocalHost(host: string | null): boolean {
  if (!host) return false
  return (
    host.startsWith('127.') ||
    host === 'localhost' ||
    host === '::1' ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
  )
}

export default withAuth(
  function middleware(req) {
    const requestHeaders = new Headers(req.headers)
    let modified = false

    // Fix: misconfigured reverse proxies (Nginx Proxy Manager, etc.) often send
    // x-forwarded-host: 127.0.0.1:3006 while origin is tv.yonix.me.
    // Next.js Server Actions abort if x-forwarded-host != origin on forwarded requests.
    // We rewrite x-forwarded-host to the public Host so the check passes.
    const xForwardedHost = requestHeaders.get('x-forwarded-host')
    const host = requestHeaders.get('host')

    if (xForwardedHost && host && xForwardedHost !== host) {
      if (isLocalHost(xForwardedHost) && !isLocalHost(host)) {
        requestHeaders.set('x-forwarded-host', host)
        requestHeaders.delete('x-forwarded-port')
        modified = true
      }
    }

    // Admin routes must always see the real user (ignoring impersonation)
    // This allows keeping the admin tab with admin rights while another tab previews the site
    const isAdminRoute = 
      req.nextUrl.pathname.startsWith('/dashboard/settings') || 
      req.nextUrl.pathname.startsWith('/api/admin')

    if (isAdminRoute && req.cookies.has('mediahub_impersonate')) {
      const cookies = requestHeaders.get('cookie') || ''
      
      // Remove mediahub_impersonate from cookie string to force real user session
      const newCookies = cookies
        .split(';')
        .filter(c => !c.trim().startsWith('mediahub_impersonate='))
        .join(';')
      
      requestHeaders.set('cookie', newCookies)
      modified = true
    }

    if (modified) {
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    }

    return NextResponse.next()
  },
  {
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: ["/dashboard/:path*", "/api/admin/:path*"]
}

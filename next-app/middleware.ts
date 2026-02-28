import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Admin routes must always see the real user (ignoring impersonation)
    // This allows keeping the admin tab with admin rights while another tab previews the site
    const isAdminRoute = 
      req.nextUrl.pathname.startsWith('/dashboard/settings') || 
      req.nextUrl.pathname.startsWith('/api/admin')

    if (isAdminRoute && req.cookies.has('mediahub_impersonate')) {
      const requestHeaders = new Headers(req.headers)
      const cookies = requestHeaders.get('cookie') || ''
      
      // Remove mediahub_impersonate from cookie string to force real user session
      const newCookies = cookies
        .split(';')
        .filter(c => !c.trim().startsWith('mediahub_impersonate='))
        .join(';')
      
      requestHeaders.set('cookie', newCookies)
      
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

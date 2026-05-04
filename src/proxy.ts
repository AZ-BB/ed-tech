import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/** Maps Supabase `user_metadata.type` to the app home for that role. */
function authedHomePath(type: unknown): string | null {
  switch (type) {
    case "student":
      return "/student"
    case "school":
    case "school_admin":
      return "/school"
    case "admin":
      return "/admin"
    default:
      return null
  }
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Validates the JWT with Supabase Auth (do not use getSession() here — cookie payload may be stale)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const authedHome = authedHomePath(user?.user_metadata?.type)

  const { pathname } = request.nextUrl

  // Auth/marketing pages anyone can open without logging in (prefix match).
  const publicAuthRoutes = [
    '/login',
    '/signup',
    '/auth/callback',
    '/auth',
    '/forget-password',
    '/auth/reset-password',
    '/privacy',
    '/terms',
    '/about',
    '/contact',
  ]
  const isPublicAuthRoute = publicAuthRoutes.some((route) =>
    pathname.startsWith(route)
  )

  // Landing is public for guests; do not use pathname.startsWith("/") — that matches every path.
  const isPublicForGuests = pathname === '/' || isPublicAuthRoute

  // OAuth callback route needs special handling - always allow it through
  const isCallbackRoute = pathname.startsWith('/auth/callback')

  // If user is not authenticated and trying to access a protected route
  if (!user && !isPublicForGuests) {
    const redirectUrl = new URL('/login', request.url)
    // Add the current path as a query parameter to redirect back after login
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Authed user on app root → role dashboard (when type is set)
  if (user && pathname === "/" && authedHome) {
    return NextResponse.redirect(new URL(authedHome, request.url))
  }

  // If user is authenticated and trying to access auth pages, redirect to home
  // BUT allow the callback route to complete its processing
  // (Exclude "/": logged-in users without a role still use the marketing landing.)
  if (user && isPublicAuthRoute && !isCallbackRoute) {
    const dest = authedHome ?? "/"
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

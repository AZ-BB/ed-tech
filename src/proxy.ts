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
    case "advisor":
      return "/advisor"
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

  // Open to everyone (guest or signed-in) — e.g. payment links, webhooks, token flows.
  const publicOpenRoutes = [
    "/application-support",
    "/api/webhooks",
    "/recommendation",
    "/webinars",
  ]
  const isPublicOpenRoute = publicOpenRoutes.some((route) =>
    pathname.startsWith(route),
  )

  // Marketing/auth pages guests may visit; signed-in users are redirected to their dashboard.
  const publicGuestOnlyRoutes = [
    "/login",
    "/signup",
    "/auth/callback",
    "/auth",
    "/forget-password",
    "/auth/reset-password",
    "/privacy",
    "/terms",
    "/about",
    "/contact",
    "/for-schools",
    "/for-advisors",
    "/blog",
  ]
  const isPublicGuestOnlyRoute = publicGuestOnlyRoutes.some((route) =>
    pathname.startsWith(route),
  )

  // Landing is public for guests; do not use pathname.startsWith("/") — that matches every path.
  const isPublicForGuests =
    pathname === "/" || isPublicOpenRoute || isPublicGuestOnlyRoute

  // Auth recovery/callback routes must complete even when a session exists.
  const isAuthFlowRoute =
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/auth/confirm") ||
    pathname.startsWith("/auth/reset-password")

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

  // Signed-in users on login/signup/marketing → dashboard (not payment/token links).
  if (user && isPublicGuestOnlyRoute && !isAuthFlowRoute) {
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

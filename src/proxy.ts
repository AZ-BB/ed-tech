import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  defaultLocale,
  isLocale,
  isLocalizedPublicPath,
  locales,
  stripLocaleFromPath,
} from "@/lib/i18n/config";

const LOCALE_COOKIE = "NEXT_LOCALE";

/** Maps Supabase `user_metadata.type` to the app home for that role. */
function authedHomePath(type: unknown): string | null {
  switch (type) {
    case "student":
      return "/student";
    case "school":
    case "school_admin":
      return "/school";
    case "admin":
      return "/admin";
    case "advisor":
      return "/advisor";
    default:
      return null;
  }
}

function shouldSkipLocale(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/student") ||
    pathname.startsWith("/school") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/advisor") ||
    pathname.startsWith("/application-support") ||
    pathname.startsWith("/recommendation") ||
    /\.[^/]+$/.test(pathname)
  );
}

function nextWithPathname(request: NextRequest): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

function localeRedirect(request: NextRequest, pathname: string): NextResponse | null {
  if (shouldSkipLocale(pathname)) return null;

  const { locale } = stripLocaleFromPath(pathname);
  if (locale) return null;

  if (!isLocalizedPublicPath(pathname)) return null;

  const preferredCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  const preferred =
    preferredCookie && isLocale(preferredCookie) ? preferredCookie : defaultLocale;

  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? `/${preferred}` : `/${preferred}${pathname}`;
  return NextResponse.redirect(url);
}

function loginPath(request: NextRequest): string {
  const preferredCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale =
    preferredCookie && isLocale(preferredCookie) ? preferredCookie : defaultLocale;
  return `/${locale}/login`;
}

function pathMatches(pathname: string, route: string): boolean {
  const { pathnameWithoutLocale } = stripLocaleFromPath(pathname);
  if (route === "/") return pathnameWithoutLocale === "/";
  return pathnameWithoutLocale === route || pathnameWithoutLocale.startsWith(`${route}/`);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const localeRedirectResponse = localeRedirect(request, pathname);
  if (localeRedirectResponse) return localeRedirectResponse;

  let supabaseResponse = nextWithPathname(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = nextWithPathname(request);
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const authedHome = authedHomePath(user?.user_metadata?.type);
  const { locale, pathnameWithoutLocale } = stripLocaleFromPath(pathname);

  if (locale) {
    supabaseResponse.cookies.set(LOCALE_COOKIE, locale, { path: "/" });
  }

  const publicOpenRoutes = ["/application-support", "/api/webhooks", "/recommendation", "/webinars"];
  const isPublicOpenRoute = publicOpenRoutes.some((route) => pathMatches(pathname, route));

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
  ];
  const isPublicGuestOnlyRoute = publicGuestOnlyRoutes.some((route) =>
    pathMatches(pathname, route),
  );

  const isPublicForGuests =
    pathnameWithoutLocale === "/" || isPublicOpenRoute || isPublicGuestOnlyRoute;

  const isAuthFlowRoute =
    pathMatches(pathname, "/auth/callback") ||
    pathMatches(pathname, "/auth/confirm") ||
    pathMatches(pathname, "/auth/reset-password");

  if (!user && !isPublicForGuests) {
    const redirectUrl = new URL(loginPath(request), request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathnameWithoutLocale === "/" && authedHome) {
    return NextResponse.redirect(new URL(authedHome, request.url));
  }

  if (user && isPublicGuestOnlyRoute && !isAuthFlowRoute) {
    const dest = authedHome ?? (locale ? `/${locale}` : `/${defaultLocale}`);
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

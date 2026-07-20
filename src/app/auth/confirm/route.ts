import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/database.types";
import { NextResponse, type NextRequest } from "next/server";

type ConfirmOtpType =
  | "recovery"
  | "magiclink"
  | "signup"
  | "invite"
  | "email"
  | "email_change";

const ALLOWED_OTP_TYPES = new Set<string>([
  "recovery",
  "magiclink",
  "signup",
  "invite",
  "email",
  "email_change",
]);

function safeNextPath(raw: string | null): string {
  const next = raw?.trim() ?? "";
  if (next.startsWith("/") && !next.startsWith("//") && !next.includes("://")) {
    return next;
  }
  return "/auth/reset-password";
}

function buildRedirectUrl(request: NextRequest, path: string): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}${path}`;
  }
  return new URL(path, request.url).toString();
}

function redirectToLoginWithError(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "error",
    "This sign-in link is invalid or has expired. Please try again or contact support.",
  );
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const redirectTarget = buildRedirectUrl(request, next);

  let response = NextResponse.redirect(redirectTarget);

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.redirect(redirectTarget);
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  if (tokenHash && type && ALLOWED_OTP_TYPES.has(type)) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as ConfirmOtpType,
      token_hash: tokenHash,
    });
    if (!error) {
      return response;
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  return redirectToLoginWithError(request);
}

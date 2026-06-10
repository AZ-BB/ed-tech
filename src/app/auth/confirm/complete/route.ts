import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/database.types";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") ?? "recovery";

  const successRedirect = `${origin}/auth/reset-password`;
  const failureRedirect = `${origin}/auth/reset-password?error=invalid_link`;

  let response = NextResponse.redirect(successRedirect);

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
    console.error("[auth/confirm/complete] exchangeCodeForSession", error);
    return NextResponse.redirect(failureRedirect);
  }

  if (tokenHash && type === "recovery") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    if (!error) {
      return response;
    }
    console.error("[auth/confirm/complete] verifyOtp", error);
    return NextResponse.redirect(failureRedirect);
  }

  return NextResponse.redirect(failureRedirect);
}

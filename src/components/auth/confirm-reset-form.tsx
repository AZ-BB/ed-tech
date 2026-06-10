"use client";

import { createSupabaseBrowserClient } from "@/utils/supabase-browser";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const INVALID_MESSAGE =
  "This reset link is invalid or has expired. Request a new one from the login page.";

export function ConfirmResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasHashTokens, setHasHashTokens] = useState(false);

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") ?? "recovery";
  const code = searchParams.get("code");
  const hasQueryParams = Boolean(tokenHash || code);

  useEffect(() => {
    const hash = window.location.hash;
    const hashHasTokens =
      hash.includes("access_token=") || hash.includes("type=recovery");
    if (hashHasTokens) {
      setHasHashTokens(true);
    }

    const supabase = createSupabaseBrowserClient();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session &&
        (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")
      ) {
        router.replace("/auth/reset-password");
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/auth/reset-password");
        return;
      }
      setChecking(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  function handleContinue() {
    setLoading(true);
    setError(null);

    if (code) {
      const params = new URLSearchParams({ code });
      window.location.href = `/auth/confirm/complete?${params.toString()}`;
      return;
    }

    if (tokenHash) {
      const params = new URLSearchParams({
        token_hash: tokenHash,
        type,
      });
      window.location.href = `/auth/confirm/complete?${params.toString()}`;
      return;
    }

    if (hasHashTokens) {
      router.replace("/auth/reset-password");
      return;
    }

    setError(INVALID_MESSAGE);
    setLoading(false);
  }

  if (checking) {
    return (
      <p className="text-sm leading-relaxed text-[#6a6a6a]">Checking your reset link…</p>
    );
  }

  if (!hasQueryParams && !hasHashTokens) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {INVALID_MESSAGE}
        </p>
        <Link
          href="/login"
          className="inline-flex text-sm font-medium text-[var(--green)] hover:underline"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-[#6a6a6a]">
        Click continue to verify your reset link and choose a new password.
      </p>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={loading}
        onClick={handleContinue}
        className="m-0 box-border flex h-12 w-full max-w-full cursor-pointer items-center justify-center rounded-full border-0 border-transparent bg-[#2D634D] px-5 text-sm font-semibold leading-normal text-white antialiased shadow-[0_3px_14px_rgba(45,99,77,0.25)] transition hover:bg-[var(--green-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D634D] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
      >
        {loading ? "Verifying…" : "Continue password reset"}
      </button>

      <Link
        href="/login"
        className="inline-flex text-sm font-medium text-[var(--green)] hover:underline"
      >
        Back to login
      </Link>
    </div>
  );
}

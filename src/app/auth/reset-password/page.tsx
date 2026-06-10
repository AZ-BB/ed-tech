"use client";

import { createSupabaseBrowserClient } from "@/utils/supabase-browser";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

const MIN_PASSWORD = 8;

function LogoIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const establishSession = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const code = searchParams.get("code");

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setLoadError(
          "This reset link is invalid or has expired. Please request a new one.",
        );
        setReady(true);
        return;
      }
      router.replace("/auth/reset-password");
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      setLoadError(
        "This reset link is invalid or has expired. Please request a new one.",
      );
      setHasSession(false);
    } else {
      setHasSession(true);
    }

    setReady(true);
  }, [router, searchParams]);

  useEffect(() => {
    void establishSession();
  }, [establishSession]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (password.length < MIN_PASSWORD) {
      setSubmitError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setSubmitError(error.message || "Could not update your password.");
        return;
      }
      await supabase.auth.signOut();
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F4F9F4] before:pointer-events-none before:absolute before:-top-[180px] before:-right-[120px] before:h-[500px] before:w-[500px] before:rounded-full before:bg-[rgba(45,106,79,0.05)] before:content-[''] after:pointer-events-none after:absolute after:-bottom-[140px] after:-left-[100px] after:h-[380px] after:w-[380px] after:rounded-full after:bg-[rgba(45,106,79,0.04)] after:content-['']"
      data-page="reset-password"
    >
      <div className="relative z-10 flex w-full max-w-[min(100%,28rem)] flex-col items-center px-4 py-10 sm:px-5 sm:py-12">
        <Link href="/" className="mb-8 flex items-center gap-2.5">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#2D634D]"
            aria-hidden
          >
            <LogoIcon />
          </div>
          <span className="text-[1.15rem] font-bold tracking-tight text-[var(--text)]">
            Univeera
          </span>
        </Link>

        <div className="w-full rounded-[20px] border border-[var(--border-light)] bg-white p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:p-10">
          {!ready ? (
            <p className="text-center text-sm text-[#6a6a6a]">Verifying your reset link…</p>
          ) : done ? (
            <div className="text-center">
              <h1 className="serif text-[1.6rem] leading-tight text-[var(--text)]">
                Password updated
              </h1>
              <p className="mt-3 text-sm text-[#6a6a6a]">
                Your password has been changed. You can sign in with your new password.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-[#2D634D] px-6 text-sm font-semibold text-white hover:bg-[var(--green-dark)]"
              >
                Go to login
              </Link>
            </div>
          ) : loadError || !hasSession ? (
            <div className="text-center">
              <h1 className="serif text-[1.6rem] leading-tight text-[var(--text)]">
                Reset link expired
              </h1>
              <p className="mt-3 text-sm text-[#6a6a6a]" role="alert">
                {loadError ??
                  "This reset link is invalid or has expired. Please request a new one."}
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-[#2D634D] px-6 text-sm font-semibold text-white hover:bg-[var(--green-dark)]"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="serif text-[1.6rem] leading-tight text-[var(--text)]">
                Choose a new password
              </h1>
              <p className="mt-2 text-sm text-[#6a6a6a]">
                Enter a new password for your Univeera account.
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                {submitError ? (
                  <p
                    className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
                    role="alert"
                  >
                    {submitError}
                  </p>
                ) : null}

                <div>
                  <label
                    htmlFor="new-password"
                    className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]"
                  >
                    New password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={MIN_PASSWORD}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="m-0 box-border min-h-12 w-full max-w-full appearance-none rounded-xl border-[1.5px] border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text)] focus:border-[var(--green-light)] focus:outline-none focus:shadow-[0_0_0_4px_rgba(45,106,79,0.07)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]"
                  >
                    Confirm password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={MIN_PASSWORD}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="m-0 box-border min-h-12 w-full max-w-full appearance-none rounded-xl border-[1.5px] border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text)] focus:border-[var(--green-light)] focus:outline-none focus:shadow-[0_0_0_4px_rgba(45,106,79,0.07)]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="m-0 box-border flex h-12 w-full cursor-pointer items-center justify-center rounded-full border-0 bg-[#2D634D] text-sm font-semibold text-white shadow-[0_3px_14px_rgba(45,99,77,0.25)] transition hover:bg-[var(--green-dark)] disabled:cursor-wait disabled:opacity-70"
                >
                  {submitting ? "Updating…" : "Update password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResetPasswordFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F9F4]">
      <div className="h-96 w-full max-w-md animate-pulse rounded-[20px] bg-white/80" />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

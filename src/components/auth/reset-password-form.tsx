"use client";

import { createSupabaseBrowserClient } from "@/utils/supabase-browser";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const inputClass =
  "m-0 box-border min-h-12 w-full max-w-full appearance-none rounded-xl border-[1.5px] border-[var(--border)] bg-white px-4 py-3 text-sm leading-normal text-[var(--text)] antialiased transition placeholder:text-[#c0bdb8] focus:border-[var(--green-light)] focus:outline-none focus:ring-0 focus:shadow-[0_0_0_4px_rgba(45,106,79,0.07)]";

const EXPIRED_MESSAGE =
  "This reset link is invalid or has expired. Request a new one from the login page.";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const supabase = createSupabaseBrowserClient();

    const markReady = () => {
      if (cancelled) return;
      setReady(true);
      setError(null);
      setChecking(false);
      router.replace("/auth/reset-password", { scroll: false });
    };

    const markFailed = (message = EXPIRED_MESSAGE) => {
      if (cancelled) return;
      setReady(false);
      setError(message);
      setChecking(false);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        markReady();
      }
    });

    async function establishRecoverySession() {
      const callbackError = searchParams.get("error");
      if (callbackError === "auth_callback") {
        markFailed();
        return;
      }

      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      const code = searchParams.get("code");

      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          markFailed();
          return;
        }
        markReady();
        return;
      }

      if (tokenHash && type === "recovery") {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (verifyError) {
          markFailed();
          return;
        }
        markReady();
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        markReady();
        return;
      }

      timeoutId = setTimeout(async () => {
        const {
          data: { user: retryUser },
        } = await supabase.auth.getUser();
        if (retryUser) {
          markReady();
        } else {
          markFailed();
        }
      }, 2500);
    }

    void establishRecoverySession();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      authListener.subscription.unsubscribe();
    };
  }, [router, searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message || "Could not update your password.");
        return;
      }

      await supabase.auth.signOut();
      setSuccess(true);
      router.replace("/login?reset=success");
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <p className="text-sm leading-relaxed text-[#6a6a6a]">
        Verifying your reset link…
      </p>
    );
  }

  if (success) {
    return (
      <p className="text-sm leading-relaxed text-[#6a6a6a]">
        Password updated. Redirecting you to sign in…
      </p>
    );
  }

  if (!ready) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error ?? EXPIRED_MESSAGE}
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
    <form className="space-y-4" onSubmit={handleSubmit}>
      <p className="text-sm leading-relaxed text-[#6a6a6a]">
        Choose a new password for your Univeera account.
      </p>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <div>
        <label
          htmlFor="reset-password"
          className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]"
        >
          New password
        </label>
        <input
          id="reset-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
          placeholder="At least 8 characters"
        />
      </div>

      <div>
        <label
          htmlFor="reset-password-confirm"
          className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]"
        >
          Confirm new password
        </label>
        <input
          id="reset-password-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className={inputClass}
          placeholder="Repeat your new password"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="m-0 box-border flex h-12 w-full max-w-full cursor-pointer items-center justify-center rounded-full border-0 border-transparent bg-[#2D634D] px-5 text-sm font-semibold leading-normal text-white antialiased shadow-[0_3px_14px_rgba(45,99,77,0.25)] transition hover:bg-[var(--green-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D634D] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
      >
        {submitting ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}

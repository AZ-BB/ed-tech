import { ConfirmResetForm } from "@/components/auth/confirm-reset-form";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Confirm password reset | Univeera",
  description: "Verify your password reset link.",
};

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

function ConfirmResetFallback() {
  return (
    <p className="text-sm leading-relaxed text-[#6a6a6a]">Loading…</p>
  );
}

export default function ConfirmPasswordResetPage() {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F4F9F4] before:pointer-events-none before:absolute before:-top-[180px] before:-right-[120px] before:h-[500px] before:w-[500px] before:rounded-full before:bg-[rgba(45,106,79,0.05)] before:content-[''] after:pointer-events-none after:absolute after:-bottom-[140px] after:-left-[100px] after:h-[380px] after:w-[380px] after:rounded-full after:bg-[rgba(45,106,79,0.04)] after:content-['']"
      data-page="confirm-password-reset"
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

        <div className="w-full rounded-[20px] border border-[var(--border-light)] bg-white p-8 shadow-[0_12px_40px_rgba(0,0,0,0.06)] sm:p-10">
          <h1 className="serif mb-1.5 text-[22px] text-[var(--text)]">
            Confirm password reset
          </h1>
          <Suspense fallback={<ConfirmResetFallback />}>
            <ConfirmResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

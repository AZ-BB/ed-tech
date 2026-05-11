"use client";

import { login, requestPasswordReset } from "@/actions/auth";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState, useState } from "react";

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

function EyeIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden
        >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function EyeOffIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden
        >
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    );
}

function ForgotPasswordModal({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const [state, formAction, isPending] = useActionState(requestPasswordReset, null);

    if (!open) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/35 p-5 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-title"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            onKeyDown={(e) => {
                if (e.key === "Escape") onClose();
            }}
        >
            <div className="relative m-0 w-full max-w-[400px] min-w-0 box-border overflow-hidden rounded-2xl border-0 bg-white p-10 shadow-[0_8px_40px_rgba(0,0,0,0.12)] sm:p-11">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-3.5 right-4 m-0 inline-flex size-9 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-xl leading-none text-[var(--text-hint)] appearance-none hover:text-[var(--text-mid)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)] focus-visible:ring-offset-2 [&::-moz-focus-inner]:border-0 [&::-moz-focus-inner]:p-0"
                    aria-label="Close"
                >
                    ×
                </button>

                {state?.data ? (
                    <div className="pt-1 text-center">
                        <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--green-bg)]">
                            <svg
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="var(--green)"
                                strokeWidth="2.5"
                                aria-hidden
                            >
                                <path d="M20 6L9 17l-5-5" />
                            </svg>
                        </div>
                        <h2
                            id="forgot-title"
                            className="serif mb-1.5 text-lg text-[var(--text)]"
                        >
                            Check your email
                        </h2>
                        <p className="text-[13px] leading-relaxed text-[#6a6a6a]">
                            If an account exists with that email, you&apos;ll receive a password
                            reset link shortly.
                        </p>
                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="m-0 inline cursor-pointer border-0 bg-transparent p-0 font-inherit text-xs font-medium text-[var(--green)] appearance-none hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--green)] focus-visible:ring-offset-2 [&::-moz-focus-inner]:border-0"
                            >
                                Back to login
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <h2
                            id="forgot-title"
                            className="serif mb-1.5 text-[22px] text-[var(--text)]"
                        >
                            Reset your password
                        </h2>
                        <p className="mb-6 text-sm leading-relaxed text-[#6a6a6a]">
                            Enter your email address and we&apos;ll send you a link to reset your
                            password.
                        </p>
                        <form className="m-0 p-0" action={formAction}>
                            {state?.error ? (
                                <p
                                    className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
                                    role="alert"
                                >
                                    {String(state.error)}
                                </p>
                            ) : null}
                            <label
                                htmlFor="forgot-email"
                                className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]"
                            >
                                Email address
                            </label>
                            <input
                                id="forgot-email"
                                name="forgot-email"
                                type="email"
                                required
                                placeholder="your@email.com"
                                className="m-0 mb-2 box-border min-h-12 w-full max-w-full appearance-none rounded-xl border-[1.5px] border-[var(--border)] bg-white px-4 py-3 text-sm leading-normal text-[var(--text)] antialiased transition placeholder:text-[#c0bdb8] focus:border-[var(--green-light)] focus:outline-none focus:ring-0 focus:shadow-[0_0_0_4px_rgba(45,106,79,0.07)]"
                            />
                            <button
                                type="submit"
                                disabled={isPending}
                                className="m-0 mt-2 box-border inline-flex h-12 w-full max-w-full cursor-pointer items-center justify-center rounded-full border-0 border-transparent bg-[var(--green)] px-5 text-sm font-semibold font-inherit leading-normal text-white antialiased shadow-[0_3px_12px_rgba(45,106,79,0.2)] appearance-none transition hover:bg-[var(--green-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)] focus-visible:ring-offset-2 focus:ring-0 disabled:cursor-wait disabled:opacity-70 [&::-moz-focus-inner]:border-0 [&::-moz-focus-inner]:p-0"
                            >
                                {isPending ? "Sending…" : "Send reset link"}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}

function LoginFormCard({ onRequestForgot }: { onRequestForgot: () => void }) {
    const [showPassword, setShowPassword] = useState(false);
    const searchParams = useSearchParams();
    const next = searchParams.get("next") || "/";
    const [state, formAction, isPending] = useActionState(login, null);

    return (
        <div className="w-full rounded-[20px] border border-[var(--border-light)] bg-white p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:p-9">
            {/* Log in */}
            <h1 className="serif text-[1.65rem] leading-tight text-[var(--text)] sm:text-[1.75rem]">
                Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-[#6a6a6a]">Log in to continue your journey</p>

            <form className="mt-6 space-y-4" action={formAction}>
                <input name="next" type="hidden" value={next} />
                {state?.error ? (
                    <p
                        className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
                        role="alert"
                    >
                        {String(state.error)}
                    </p>
                ) : null}
                <div>
                    <label
                        htmlFor="login-email"
                        className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]"
                    >
                        Email
                    </label>
                    <input
                        id="login-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="you@university.edu"
                        className="m-0 box-border min-h-12 w-full max-w-full appearance-none rounded-xl border-[1.5px] border-[var(--border)] bg-white px-4 py-3 text-sm leading-normal text-[var(--text)] antialiased transition placeholder:text-[#c0bdb8] focus:border-[var(--green-light)] focus:outline-none focus:ring-0 focus:shadow-[0_0_0_4px_rgba(45,106,79,0.07)]"
                    />
                </div>

                <div>
                    <label
                        htmlFor="login-password"
                        className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]"
                    >
                        Password
                    </label>
                    <div className="relative">
                        <input
                            id="login-password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            required
                            placeholder="••••••••"
                            className="m-0 box-border min-h-12 w-full max-w-full appearance-none rounded-xl border-[1.5px] border-[var(--border)] bg-white py-3 pr-12 pl-4 text-sm leading-normal text-[var(--text)] antialiased transition placeholder:text-[#c0bdb8] focus:border-[var(--green-light)] focus:outline-none focus:ring-0 focus:shadow-[0_0_0_4px_rgba(45,106,79,0.07)]"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-1 text-[var(--text-hint)] hover:text-[var(--text-mid)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)] focus-visible:ring-offset-1"
                            aria-pressed={showPassword}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                    </div>
                </div>

                <div className="flex justify-end pt-0.5">
                    <button
                        type="button"
                        onClick={onRequestForgot}
                        className="m-0 cursor-pointer border-0 bg-transparent p-0 text-sm font-medium text-[var(--green)] hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--green)] focus-visible:ring-offset-2"
                    >
                        Forgot password?
                    </button>
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="m-0 box-border flex h-12 w-full max-w-full cursor-pointer items-center justify-center rounded-full border-0 border-transparent bg-[#2D634D] px-5 text-sm font-semibold leading-normal text-white antialiased shadow-[0_3px_14px_rgba(45,99,77,0.25)] transition hover:bg-[var(--green-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D634D] focus-visible:ring-offset-2 focus:ring-0 disabled:cursor-wait disabled:opacity-70"
                >
                    {isPending ? "Logging in…" : "Log in"}
                </button>
            </form>

            <div className="my-8 flex w-full items-center gap-3">
                <div className="h-px min-w-0 flex-1 bg-[var(--border)]" />
                <span className="shrink-0 text-xs font-medium text-[#9a9a9a]">New here?</span>
                <div className="h-px min-w-0 flex-1 bg-[var(--border)]" />
            </div>

            <h2 className="serif text-[1.35rem] leading-tight text-[var(--text)] sm:text-[1.45rem]">
                Start your university journey
            </h2>
            <p className="mt-1.5 text-sm text-[#6a6a6a]">Create your account in under 2 minutes</p>
            <Link
                href="/signup"
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-[var(--border)] bg-white text-sm font-semibold text-[var(--text-mid)] antialiased transition hover:border-[#c8c4bc] hover:bg-[#faf9f7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)] focus-visible:ring-offset-2"
            >
                Create account
                <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
            </Link>
        </div>
    );
}

function LoginPageContent() {
    const [forgotOpen, setForgotOpen] = useState(false);
    const [forgotKey, setForgotKey] = useState(0);

    return (
        <div
            className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F4F9F4] before:pointer-events-none before:absolute before:-top-[180px] before:-right-[120px] before:h-[500px] before:w-[500px] before:rounded-full before:bg-[rgba(45,106,79,0.05)] before:content-[''] after:pointer-events-none after:absolute after:-bottom-[140px] after:-left-[100px] after:h-[380px] after:w-[380px] after:rounded-full after:bg-[rgba(45,106,79,0.04)] after:content-['']"
            data-page="login"
        >
            <div className="relative z-10 flex w-full max-w-[min(100%,28rem)] flex-col items-center px-4 py-10 sm:px-5 sm:py-12">
                <div className="mb-8 flex items-center gap-2.5">
                    <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#2D634D]"
                        aria-hidden
                    >
                        <LogoIcon />
                    </div>
                    <span className="text-[1.15rem] font-bold tracking-tight text-[var(--text)]">
                        Univeera
                    </span>
                </div>

                <LoginFormCard
                    onRequestForgot={() => {
                        setForgotKey((k) => k + 1);
                        setForgotOpen(true);
                    }}
                />
            </div>

            <ForgotPasswordModal
                key={forgotKey}
                open={forgotOpen}
                onClose={() => setForgotOpen(false)}
            />
        </div>
    );
}

function LoginPageFallback() {
    return (
        <div
            className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F4F9F4] before:pointer-events-none before:absolute before:-top-[180px] before:-right-[120px] before:h-[500px] before:w-[500px] before:rounded-full before:bg-[rgba(45,106,79,0.05)] before:content-[''] after:pointer-events-none after:absolute after:-bottom-[140px] after:-left-[100px] after:h-[380px] after:w-[380px] after:rounded-full after:bg-[rgba(45,106,79,0.04)] after:content-['']"
            data-page="login"
        >
            <div className="relative z-10 w-full max-w-[min(100%,28rem)] px-4 py-10 sm:px-5 sm:py-12">
                <div className="h-96 w-full animate-pulse rounded-[20px] border border-[var(--border-light)] bg-white/80" />
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<LoginPageFallback />}>
            <LoginPageContent />
        </Suspense>
    );
}

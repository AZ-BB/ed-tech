"use client";

import { login, requestPasswordReset } from "@/actions/auth";
import { LocalizedLink } from "@/lib/i18n/localized-link";
import { useLocale } from "@/lib/i18n/locale-context";
import { ArrowRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState, useLayoutEffect, useRef, useState } from "react";

const LOGIN_VIEWPORT_PADDING_PX = 16;

function LoginScaleFit({ children }: { children: React.ReactNode }) {
    const contentRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useLayoutEffect(() => {
        const node = contentRef.current;
        if (!node) return;

        const fitToViewport = () => {
            const availableHeight =
                (window.visualViewport?.height ?? window.innerHeight) -
                LOGIN_VIEWPORT_PADDING_PX;

            node.style.zoom = "1";
            const contentHeight = node.getBoundingClientRect().height;
            if (contentHeight <= 0) return;

            const nextScale = Math.min(1, availableHeight / contentHeight);
            node.style.zoom = String(nextScale);
            setScale(nextScale);
        };

        fitToViewport();

        const resizeObserver = new ResizeObserver(fitToViewport);
        resizeObserver.observe(node);

        window.visualViewport?.addEventListener("resize", fitToViewport);
        window.addEventListener("resize", fitToViewport);

        return () => {
            resizeObserver.disconnect();
            window.visualViewport?.removeEventListener("resize", fitToViewport);
            window.removeEventListener("resize", fitToViewport);
        };
    }, []);

    return (
        <div
            ref={contentRef}
            className="login-fit-content flex w-full max-w-[min(100%,28rem)] flex-col items-center"
            style={{ zoom: scale }}
        >
            {children}
        </div>
    );
}

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
    const { dict } = useLocale();
    const a = dict.auth;
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
                    className="absolute top-3.5 end-4 m-0 inline-flex size-9 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-xl leading-none text-[var(--text-hint)] appearance-none hover:text-[var(--text-mid)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)] focus-visible:ring-offset-2 [&::-moz-focus-inner]:border-0 [&::-moz-focus-inner]:p-0"
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
                            {a.checkEmail}
                        </h2>
                        <p className="text-[13px] leading-relaxed text-[#6a6a6a]">
                            {a.resetEmailSent}
                        </p>
                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="m-0 inline cursor-pointer border-0 bg-transparent p-0 font-inherit text-xs font-medium text-[var(--green)] appearance-none hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--green)] focus-visible:ring-offset-2 [&::-moz-focus-inner]:border-0"
                            >
                                {a.backToLogin}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <h2
                            id="forgot-title"
                            className="serif mb-1.5 text-[22px] text-[var(--text)]"
                        >
                            {a.resetTitle}
                        </h2>
                        <p className="mb-6 text-sm leading-relaxed text-[#6a6a6a]">
                            {a.resetSubtitle}
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
                                {a.emailAddress}
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
                                {isPending ? a.sending : a.sendResetLink}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}

function LoginFormCard({ onRequestForgot }: { onRequestForgot: () => void }) {
    const { dict } = useLocale();
    const a = dict.auth;
    const [showPassword, setShowPassword] = useState(false);
    const searchParams = useSearchParams();
    const next = searchParams.get("next") || "/";
    const deactivated = searchParams.get("deactivated") === "1";
    const schoolDeactivated = searchParams.get("schoolDeactivated") === "1";
    const [state, formAction, isPending] = useActionState(login, null);

    return (
        <div className="w-full rounded-[20px] border border-[var(--border-light)] bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:p-8 md:p-9">
            {/* Log in */}
            <h1 className="serif text-xl leading-tight text-[var(--text)] sm:text-[1.65rem] md:text-[1.75rem]">
                {a.welcomeBack}
            </h1>
            <p className="mt-1 text-xs text-[#6a6a6a] sm:mt-1.5 sm:text-sm">{a.logInSubtitle}</p>

            <form className="mt-4 space-y-3 sm:mt-6 sm:space-y-4" action={formAction}>
                <input name="next" type="hidden" value={next} />
                {schoolDeactivated ? (
                    <p
                        className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 sm:px-3 sm:py-2 sm:text-sm"
                        role="alert"
                    >
                        {a.schoolDeactivated}
                    </p>
                ) : deactivated ? (
                    <p
                        className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 sm:px-3 sm:py-2 sm:text-sm"
                        role="alert"
                    >
                        {a.accountDeactivated}
                    </p>
                ) : null}
                {state?.error ? (
                    <p
                        className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-800 sm:px-3 sm:py-2 sm:text-sm"
                        role="alert"
                    >
                        {String(state.error)}
                    </p>
                ) : null}
                <div>
                    <label
                        htmlFor="login-email"
                        className="mb-1 block text-xs font-semibold text-[var(--text-mid)] sm:mb-1.5"
                    >
                        {a.email}
                    </label>
                    <input
                        id="login-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder={a.emailPlaceholder}
                        className="m-0 box-border min-h-10 w-full max-w-full appearance-none rounded-xl border-[1.5px] border-[var(--border)] bg-white px-3.5 py-2 text-sm leading-normal text-[var(--text)] antialiased transition placeholder:text-[#c0bdb8] focus:border-[var(--green-light)] focus:outline-none focus:ring-0 focus:shadow-[0_0_0_4px_rgba(45,106,79,0.07)] sm:min-h-12 sm:px-4 sm:py-3"
                    />
                </div>

                <div>
                    <label
                        htmlFor="login-password"
                        className="mb-1 block text-xs font-semibold text-[var(--text-mid)] sm:mb-1.5"
                    >
                        {a.password}
                    </label>
                    <div className="relative">
                        <input
                            id="login-password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            required
                            placeholder="••••••••"
                            className="m-0 box-border min-h-10 w-full max-w-full appearance-none rounded-xl border-[1.5px] border-[var(--border)] bg-white py-2 pe-11 ps-3.5 text-sm leading-normal text-[var(--text)] antialiased transition placeholder:text-[#c0bdb8] focus:border-[var(--green-light)] focus:outline-none focus:ring-0 focus:shadow-[0_0_0_4px_rgba(45,106,79,0.07)] sm:min-h-12 sm:py-3 sm:pe-12 sm:ps-4"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            className="absolute top-1/2 end-3 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-1 text-[var(--text-hint)] hover:text-[var(--text-mid)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)] focus-visible:ring-offset-1"
                            aria-pressed={showPassword}
                            aria-label={showPassword ? a.hidePassword : a.showPassword}
                        >
                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={onRequestForgot}
                        className="m-0 cursor-pointer border-0 bg-transparent p-0 text-xs font-medium text-[var(--green)] hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--green)] focus-visible:ring-offset-2 sm:text-sm"
                    >
                        {a.forgotPassword}
                    </button>
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="m-0 box-border flex h-10 w-full max-w-full cursor-pointer items-center justify-center rounded-full border-0 border-transparent bg-[#2D634D] px-4 text-sm font-semibold leading-normal text-white antialiased shadow-[0_3px_14px_rgba(45,99,77,0.25)] transition hover:bg-[var(--green-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D634D] focus-visible:ring-offset-2 focus:ring-0 disabled:cursor-wait disabled:opacity-70 sm:h-12 sm:px-5"
                >
                    {isPending ? a.loggingIn : a.logIn}
                </button>
            </form>

            <div className="my-4 flex w-full items-center gap-2.5 sm:my-8 sm:gap-3">
                <div className="h-px min-w-0 flex-1 bg-[var(--border)]" />
                <span className="shrink-0 text-[11px] font-medium text-[#9a9a9a] sm:text-xs">{a.newHere}</span>
                <div className="h-px min-w-0 flex-1 bg-[var(--border)]" />
            </div>

            <h2 className="serif text-lg leading-tight text-[var(--text)] sm:text-[1.35rem] md:text-[1.45rem]">
                {a.startUniversityJourney}
            </h2>
            <p className="mt-1 text-xs text-[#6a6a6a] sm:mt-1.5 sm:text-sm">{a.createAccountSubtitle}</p>
            <LocalizedLink
                href="/signup"
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-[var(--border)] bg-white text-sm font-semibold text-[var(--text-mid)] antialiased transition hover:border-[#c8c4bc] hover:bg-[#faf9f7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)] focus-visible:ring-offset-2 sm:mt-5 sm:h-12"
            >
                {a.createAccount}
                <ArrowRight className="icon-directional size-4" strokeWidth={2} aria-hidden />
            </LocalizedLink>
        </div>
    );
}

function LoginPageContent() {
    const { dict } = useLocale();
    const [forgotOpen, setForgotOpen] = useState(false);
    const [forgotKey, setForgotKey] = useState(0);

    return (
        <div
            className="relative flex h-dvh items-center justify-center overflow-hidden bg-[#F4F9F4] before:pointer-events-none before:absolute before:-top-[180px] before:-end-[120px] before:h-[500px] before:w-[500px] before:rounded-full before:bg-[rgba(45,106,79,0.05)] before:content-[''] after:pointer-events-none after:absolute after:-bottom-[140px] after:-start-[100px] after:h-[380px] after:w-[380px] after:rounded-full after:bg-[rgba(45,106,79,0.04)] after:content-['']"
            data-page="login"
        >
            <div className="relative z-10 flex h-full w-full items-center justify-center px-4 py-2">
                <LoginScaleFit>
                    <LocalizedLink href="/" className="mb-4 flex items-center gap-2 sm:mb-6 sm:gap-2.5">
                        <div
                            className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#2D634D] sm:size-10 sm:rounded-[10px]"
                            aria-hidden
                        >
                            <LogoIcon />
                        </div>
                        <span className="text-base font-bold tracking-tight text-[var(--text)] sm:text-[1.15rem]">
                            {dict.common.brand}
                        </span>
                    </LocalizedLink>

                    <LoginFormCard
                        onRequestForgot={() => {
                            setForgotKey((k) => k + 1);
                            setForgotOpen(true);
                        }}
                    />
                </LoginScaleFit>
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
            className="relative flex h-dvh items-center justify-center overflow-hidden bg-[#F4F9F4] before:pointer-events-none before:absolute before:-top-[180px] before:-end-[120px] before:h-[500px] before:w-[500px] before:rounded-full before:bg-[rgba(45,106,79,0.05)] before:content-[''] after:pointer-events-none after:absolute after:-bottom-[140px] after:-start-[100px] after:h-[380px] after:w-[380px] after:rounded-full after:bg-[rgba(45,106,79,0.04)] after:content-['']"
            data-page="login"
        >
            <div className="relative z-10 flex h-full w-full items-center justify-center px-4 py-2">
                <div className="h-96 w-full max-w-[min(100%,28rem)] animate-pulse rounded-[20px] border border-[var(--border-light)] bg-white/80" />
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

import type { ReactNode } from "react";

function UniveeraLogo() {
  return (
    <div className="nav-logo pointer-events-none select-none text-[22px]">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[var(--green)]">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      Univeera
    </div>
  );
}

type PaymentRequestCheckoutShellProps = {
  children: ReactNode;
};

export function PaymentRequestCheckoutShell({
  children,
}: PaymentRequestCheckoutShellProps) {
  return (
    <div dir="ltr" className="flex min-h-screen flex-col bg-[#faf9f7] px-5 py-10">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center">
        <header className="mb-4 flex justify-center">
          <UniveeraLogo />
        </header>

        <main className="w-full">{children}</main>
      </div>
    </div>
  );
}

type PaymentRequestCheckoutErrorProps = {
  message: string;
};

export function PaymentRequestCheckoutError({
  message,
}: PaymentRequestCheckoutErrorProps) {
  return (
    <PaymentRequestCheckoutShell>
      <div className="rounded-[14px] border border-[var(--border-light)] bg-white px-6 py-8 text-center">
        <h1 className="text-lg font-semibold tracking-tight text-[var(--text)]">
          Payment unavailable
        </h1>
        <p className="mt-2 text-sm text-[var(--text-mid)]">{message}</p>
      </div>
    </PaymentRequestCheckoutShell>
  );
}

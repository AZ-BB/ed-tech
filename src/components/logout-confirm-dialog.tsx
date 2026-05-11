"use client";

import { logout } from "@/actions/auth";
import { useEffect, useTransition } from "react";

export type LogoutConfirmVariant = "student" | "school";

type LogoutConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  variant: LogoutConfirmVariant;
};

export function LogoutConfirmDialog({
  open,
  onClose,
  variant,
}: LogoutConfirmDialogProps) {
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, pending]);

  if (!open) return null;

  const onYes = () => {
    startTransition(() => {
      void logout();
    });
  };

  const cardClass =
    variant === "school"
      ? "w-full max-w-[400px] rounded-xl border border-white/10 bg-[#1B4332] p-6 text-white shadow-xl"
      : "w-full max-w-[400px] rounded-xl border border-[var(--border-light)] bg-white p-6 text-[var(--text)] shadow-xl";

  const noBtnClass =
    variant === "school"
      ? "rounded-lg border border-white/20 bg-transparent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
      : "rounded-lg border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--text-mid)] transition-colors hover:bg-[var(--sand)] disabled:opacity-50";

  const yesBtnClass =
    variant === "school"
      ? "rounded-lg bg-[#52B788] px-4 py-2.5 text-sm font-semibold text-[#1B4332] transition-colors hover:bg-[#74c69d] disabled:opacity-50"
      : "rounded-lg bg-[var(--green)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--green-dark)] disabled:opacity-50";

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="logout-confirm-title"
      aria-describedby="logout-confirm-desc"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default border-0 bg-black/45"
        onClick={pending ? undefined : onClose}
        aria-label="Cancel log out"
        disabled={pending}
      />
      <div className={`relative ${cardClass}`}>
        <h2
          id="logout-confirm-title"
          className="text-lg font-semibold tracking-tight"
        >
          Log out?
        </h2>
        <p
          id="logout-confirm-desc"
          className={
            variant === "school"
              ? "mt-2 text-sm text-white/80"
              : "mt-2 text-sm text-[var(--text-light)]"
          }
        >
          Are you sure you want to log out?
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className={noBtnClass}
            onClick={onClose}
            disabled={pending}
          >
            No
          </button>
          <button
            type="button"
            className={yesBtnClass}
            onClick={onYes}
            disabled={pending}
          >
            {pending ? "Logging out…" : "Yes"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { runAdminFormSubmit } from "@/app/(protected)/admin/users/_lib/run-admin-form-submit";
import {
  resendAdvisorLoginCredentials,
  sendAdvisorLoginCredentials,
} from "@/actions/admin-advisors";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type AdvisorCredentialsDialogMode = "send" | "resend";

type AdminSendAdvisorCredentialsDialogProps = {
  open: boolean;
  mode: AdvisorCredentialsDialogMode;
  advisorId: string;
  advisorEmail: string;
  onClose: () => void;
};

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const COPY_BY_MODE = {
  send: {
    title: "Send Login Credentials",
    description:
      "Set a temporary password and email login credentials to the advisor. The email includes a sign-in link to the login page.",
    submitIdle: "Send credentials",
    submitPending: "Sending…",
    success: "Login credentials were emailed successfully.",
  },
  resend: {
    title: "Resend new Credentials",
    description:
      "Set a new temporary password and email updated login credentials to the advisor. Their previous password will stop working.",
    submitIdle: "Resend credentials",
    submitPending: "Resending…",
    success: "New login credentials were emailed successfully.",
  },
} as const;

export function AdminSendAdvisorCredentialsDialog({
  open,
  mode,
  advisorId,
  advisorEmail,
  onClose,
}: AdminSendAdvisorCredentialsDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const copy = COPY_BY_MODE[mode];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const action =
      mode === "resend" ? resendAdvisorLoginCredentials : sendAdvisorLoginCredentials;

    await runAdminFormSubmit(
      {
        setSubmitting: setIsSubmitting,
        setError,
        onBeforeSubmit: () => setSuccess(false),
      },
      () => action(advisorId, new FormData(form)),
      () => {
        setSuccess(true);
        form.reset();
        router.refresh();
      },
    );
  }

  function handleClose() {
    setError(null);
    setSuccess(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-advisor-credentials-title"
        className="w-full max-w-lg rounded-[12px] border border-[#e0deda] bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="send-advisor-credentials-title"
          className="text-[18px] font-semibold text-[#1a1a1a]"
        >
          {copy.title}
        </h2>
        <p className="mt-2 text-[13px] text-[#666]">
          {copy.description} Credentials will be sent to{" "}
          <span className="font-medium text-[#1a1a1a]">{advisorEmail}</span>.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="send-advisor-credentials-password"
              className="mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]"
            >
              {mode === "resend" ? "New password" : "Password"}
            </label>
            <input
              id="send-advisor-credentials-password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClassName}
            />
          </div>

          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
          {success ? <p className="text-[13px] text-[#2D6A4F]">{copy.success}</p> : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a]"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? copy.submitPending : copy.submitIdle}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

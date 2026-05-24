"use client";

import {
  updateSchoolAdminProfileAction,
  updateSchoolSettingsAction,
} from "@/actions/school-settings";
import type { GeneralResponse } from "@/utils/response";
import { createSupabaseBrowserClient } from "@/utils/supabase-browser";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import type { StudentAllocationRow } from "../_lib/build-student-allocations";
import {
  SchoolSettingsCreditsPanel,
  type RechargeHistoryRow,
  type SchoolCreditsSummary,
  type StudentUsageRow,
} from "./school-settings-credits-panel";

const MIN_PASSWORD = 8;

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

function PasswordInput({
  id,
  label,
  inputRef,
  show,
  onToggleShow,
  autoComplete,
  placeholder,
  onInput,
  invalid,
}: {
  id: string;
  label: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  show: boolean;
  onToggleShow: () => void;
  autoComplete: string;
  placeholder: string;
  onInput?: () => void;
  invalid?: boolean;
}) {
  return (
    <div>
      <label className={labelClass()} htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type={show ? "text" : "password"}
          className={[
            fieldClass(),
            "pr-10",
            invalid ? "border-[#E74C3C] focus:border-[#E74C3C]" : "",
          ].join(" ")}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onInput={onInput}
        />
        <button
          type="button"
          className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded-md border-0 bg-transparent p-1 text-[var(--text-light)] hover:text-[var(--text-mid)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)] focus-visible:ring-offset-1"
          onClick={onToggleShow}
          aria-pressed={show}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

export type SchoolSettingsClientProps = {
  authEmail: string;
  profileEmail: string;
  initialPhone: string;
  initialFullName: string;
  initialSchoolName: string;
  initialSchoolCity: string;
  initialCountryCode: string;
  countries: { id: string; name: string }[];
  stats: {
    signedUpCount: number;
    inviteCount: number;
    counselorCount: number;
    seatsLimit: number | null;
  };
  credits: SchoolCreditsSummary;
  rechargeHistory: RechargeHistoryRow[];
  studentUsageHistory: StudentUsageRow[];
  studentAllocations: StudentAllocationRow[];
};

function fieldClass() {
  return [
    "w-full rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5",
    "font-[family-name:var(--font-dm-sans)] text-[13px] text-[var(--text)] outline-none",
    "transition-colors focus:border-[var(--green-light)]",
  ].join(" ");
}

function labelClass() {
  return "mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--text-mid)]";
}

function btnSecondaryClass() {
  return [
    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-[var(--border)]",
    "bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-[var(--text-mid)] transition-all",
    "hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]",
    "disabled:cursor-not-allowed disabled:opacity-55",
  ].join(" ");
}

function btnPrimaryClass() {
  return [
    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-[var(--green)]",
    "bg-[var(--green)] px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-all",
    "hover:border-[var(--green-dark)] hover:bg-[var(--green-dark)]",
    "disabled:cursor-not-allowed disabled:opacity-55",
  ].join(" ");
}

export function SchoolSettingsClient({
  authEmail,
  profileEmail,
  initialPhone,
  initialFullName,
  initialSchoolName,
  initialSchoolCity,
  initialCountryCode,
  countries,
  stats,
  credits,
  rechargeHistory,
  studentUsageHistory,
  studentAllocations,
}: SchoolSettingsClientProps) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pwOpen, setPwOpen] = useState(false);
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [pwNewValue, setPwNewValue] = useState("");
  const [pwConfirmValue, setPwConfirmValue] = useState("");
  const pwCurrentRef = useRef<HTMLInputElement>(null);
  const pwNewRef = useRef<HTMLInputElement>(null);
  const pwConfirmRef = useRef<HTMLInputElement>(null);

  const pwMismatch =
    pwConfirmValue.length > 0 && pwNewValue.length > 0 && pwNewValue !== pwConfirmValue;

  const [profileState, profileAction, profilePending] = useActionState(
    updateSchoolAdminProfileAction,
    null as GeneralResponse<null> | null,
  );
  const profilePrevPending = useRef(false);

  const [schoolState, schoolAction, schoolPending] = useActionState(
    updateSchoolSettingsAction,
    null as GeneralResponse<null> | null,
  );
  const schoolPrevPending = useRef(false);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    const done = profilePrevPending.current && !profilePending;
    if (done && profileState && profileState.error === null) {
      showToast("Account settings saved.");
      router.refresh();
    }
    profilePrevPending.current = profilePending;
  }, [profilePending, profileState, router]);

  useEffect(() => {
    const done = schoolPrevPending.current && !schoolPending;
    if (done && schoolState && schoolState.error === null) {
      showToast("School settings saved.");
      router.refresh();
    }
    schoolPrevPending.current = schoolPending;
  }, [schoolPending, schoolState, router]);

  useEffect(() => {
    if (!pwOpen) {
      setShowPwCurrent(false);
      setShowPwNew(false);
      setShowPwConfirm(false);
      setPwNewValue("");
      setPwConfirmValue("");
      return;
    }
    setPwError(null);
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pwSubmitting) setPwOpen(false);
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [pwOpen, pwSubmitting]);

  function syncPwNewValue() {
    setPwNewValue(pwNewRef.current?.value ?? "");
  }

  function syncPwConfirmValue() {
    setPwConfirmValue(pwConfirmRef.current?.value ?? "");
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    const current = pwCurrentRef.current?.value ?? "";
    const next = pwNewRef.current?.value ?? "";
    const confirm = pwConfirmRef.current?.value ?? "";
    const email = authEmail.trim();

    if (!email) {
      setPwError("Missing account email. Sign in again.");
      return;
    }
    if (!current || !next || !confirm) {
      setPwError("Fill in all password fields.");
      return;
    }
    if (next.length < MIN_PASSWORD) {
      setPwError(`New password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (next !== confirm) {
      setPwError("New passwords do not match.");
      return;
    }

    setPwSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (signErr) {
        setPwError("Current password is incorrect.");
        return;
      }
      const { error: updErr } = await supabase.auth.updateUser({
        password: next,
      });
      if (updErr) {
        setPwError(updErr.message || "Could not update password.");
        return;
      }
      if (pwCurrentRef.current) pwCurrentRef.current.value = "";
      if (pwNewRef.current) pwNewRef.current.value = "";
      if (pwConfirmRef.current) pwConfirmRef.current.value = "";
      setPwNewValue("");
      setPwConfirmValue("");
      setPwOpen(false);
      showToast("Password updated.");
    } finally {
      setPwSubmitting(false);
    }
  }

  return (
    <div className="space-y-[18px]">
      {toast ? (
        <div
          className="fixed bottom-6 right-6 z-[200] flex max-w-[min(100vw-2rem,420px)] items-center gap-2 rounded-[10px] bg-[var(--green-dark)] px-[18px] py-3 font-[family-name:var(--font-dm-sans)] text-[13px] font-medium text-white shadow-[0_12px_32px_rgba(15,30,20,.08)]"
          role="status"
        >
          <svg
            className="h-3.5 w-3.5 shrink-0 text-[var(--green-bright)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span>{toast}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
        {/* Account */}
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-light)] px-5 py-[18px]">
            <div>
              <div className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-[var(--text)]">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--green-bg)] text-[var(--green)] [&_svg]:h-[13px] [&_svg]:w-[13px]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                Account
              </div>
              <p className="mt-0.5 text-[12px] text-[var(--text-light)]">
                Your profile and login
              </p>
            </div>
          </div>
          <form action={profileAction} className="space-y-3.5 px-5 py-[18px]">
            <div>
              <label className={labelClass()} htmlFor="settings-full-name">
                Full name
              </label>
              <input
                id="settings-full-name"
                name="full_name"
                className={fieldClass()}
                defaultValue={initialFullName}
                autoComplete="name"
                required
              />
            </div>
            <div>
              <label className={labelClass()} htmlFor="settings-email">
                Email
              </label>
              <input
                id="settings-email"
                className={`${fieldClass()} cursor-not-allowed bg-[#faf9f4] text-[var(--text-light)]`}
                name="email_display"
                value={profileEmail}
                readOnly
                autoComplete="email"
                aria-readonly="true"
                title="Email cannot be changed here"
              />
            </div>
            <div>
              <label className={labelClass()} htmlFor="settings-phone">
                Phone (optional)
              </label>
              <input
                id="settings-phone"
                name="phone"
                className={fieldClass()}
                defaultValue={initialPhone}
                placeholder="+971 50 ..."
                autoComplete="tel"
                maxLength={64}
              />
            </div>
            <div>
              <span className={labelClass()}>Password</span>
              <button
                type="button"
                className={`${btnSecondaryClass()} w-full justify-center`}
                onClick={() => setPwOpen(true)}
              >
                Change password
              </button>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className={btnPrimaryClass()}
                disabled={profilePending}
              >
                {profilePending ? "Saving…" : "Save changes"}
              </button>
            </div>
            {profileState?.error ? (
              <p className="text-[12px] font-medium text-[#E74C3C]">
                {profileState.error}
              </p>
            ) : null}
          </form>
        </div>

        {/* School */}
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-light)] px-5 py-[18px]">
            <div>
              <div className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-[var(--text)]">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--green-bg)] text-[var(--green)] [&_svg]:h-[13px] [&_svg]:w-[13px]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </span>
                School
              </div>
              <p className="mt-0.5 text-[12px] text-[var(--text-light)]">
                Your school&apos;s information on Univeera
              </p>
            </div>
          </div>
          <form action={schoolAction} className="space-y-3.5 px-5 py-[18px]">
            <div>
              <label className={labelClass()} htmlFor="settings-school-name">
                School name
              </label>
              <input
                id="settings-school-name"
                name="school_name"
                className={fieldClass()}
                defaultValue={initialSchoolName}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className={labelClass()} htmlFor="settings-country">
                  Country
                </label>
                <select
                  id="settings-country"
                  name="country_code"
                  className={fieldClass()}
                  defaultValue={initialCountryCode}
                  required
                >
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass()} htmlFor="settings-city">
                  City
                </label>
                <input
                  id="settings-city"
                  name="school_city"
                  className={fieldClass()}
                  defaultValue={initialSchoolCity}
                  placeholder="e.g. Dubai"
                  autoComplete="address-level2"
                  maxLength={120}
                />
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-4 rounded-[10px] border border-[var(--border-light)] bg-[#faf9f4] px-3.5 py-3.5 lg:grid-cols-4">
              <div className="min-w-0">
                <div className="text-[11.5px] font-medium uppercase tracking-[0.05em] text-[var(--text-light)]">
                  Signed in
                </div>
                <div className="mt-1 font-[family-name:var(--font-dm-serif)] text-2xl leading-none text-[var(--text)]">
                  {stats.signedUpCount.toLocaleString()}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[11.5px] font-medium uppercase tracking-[0.05em] text-[var(--text-light)]">
                  Invites
                </div>
                <div className="mt-1 font-[family-name:var(--font-dm-serif)] text-2xl leading-none text-[var(--text)]">
                  {stats.inviteCount.toLocaleString()}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[11.5px] font-medium uppercase tracking-[0.05em] text-[var(--text-light)]">
                  Plan / seats
                </div>
                <div className="mt-1 font-[family-name:var(--font-dm-serif)] text-2xl leading-none text-[var(--text)]">
                  <span>
                    {(stats.signedUpCount + stats.inviteCount).toLocaleString()}
                  </span>
                  <span className="font-[family-name:var(--font-dm-sans)] text-sm font-normal text-[var(--text-light)]">
                    {" "}
                    /{" "}
                    {stats.seatsLimit != null
                      ? stats.seatsLimit.toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[11.5px] font-medium uppercase tracking-[0.05em] text-[var(--text-light)]">
                  Counselors
                </div>
                <div className="mt-1 font-[family-name:var(--font-dm-serif)] text-2xl leading-none text-[var(--text)]">
                  {stats.counselorCount.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className={btnPrimaryClass()}
                disabled={schoolPending}
              >
                {schoolPending ? "Saving…" : "Save changes"}
              </button>
            </div>
            {schoolState?.error ? (
              <p className="text-[12px] font-medium text-[#E74C3C]">
                {schoolState.error}
              </p>
            ) : null}
          </form>
        </div>
      </div>

      {/* Credits */}
      <SchoolSettingsCreditsPanel
        credits={credits}
        rechargeHistory={rechargeHistory}
        studentUsageHistory={studentUsageHistory}
        studentAllocations={studentAllocations}
      />

      {/* Change password modal */}
      {pwOpen ? (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(15,30,20,.5)] p-5"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pwSubmitting) setPwOpen(false);
          }}
        >
          <div
            className="w-full max-w-[480px] overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[0_12px_32px_rgba(15,30,20,.08)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pw-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-light)] px-[22px] py-[18px]">
              <h2
                id="pw-modal-title"
                className="font-[family-name:var(--font-dm-serif)] text-xl tracking-tight text-[var(--text)]"
              >
                Change password
              </h2>
              <button
                type="button"
                className="flex cursor-pointer rounded-md p-1.5 text-[var(--text-light)] hover:bg-[#faf9f4] hover:text-[var(--text)]"
                aria-label="Close"
                onClick={() => !pwSubmitting && setPwOpen(false)}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <div className="flex flex-col gap-3.5 px-[22px] py-[18px]">
                <PasswordInput
                  id="pw-current"
                  label="Current password"
                  inputRef={pwCurrentRef}
                  show={showPwCurrent}
                  onToggleShow={() => setShowPwCurrent((s) => !s)}
                  autoComplete="current-password"
                  placeholder="Enter current password"
                />
                <PasswordInput
                  id="pw-new"
                  label="New password"
                  inputRef={pwNewRef}
                  show={showPwNew}
                  onToggleShow={() => setShowPwNew((s) => !s)}
                  autoComplete="new-password"
                  placeholder={`At least ${MIN_PASSWORD} characters`}
                  onInput={syncPwNewValue}
                />
                <div>
                  <PasswordInput
                    id="pw-confirm"
                    label="Confirm new password"
                    inputRef={pwConfirmRef}
                    show={showPwConfirm}
                    onToggleShow={() => setShowPwConfirm((s) => !s)}
                    autoComplete="new-password"
                    placeholder="Re-enter new password"
                    onInput={syncPwConfirmValue}
                    invalid={pwMismatch}
                  />
                  {pwMismatch ? (
                    <p className="mt-1.5 text-[12px] font-medium text-[#E74C3C]">
                      New passwords do not match.
                    </p>
                  ) : null}
                </div>
                {pwError ? (
                  <p className="text-[12px] font-medium text-[#E74C3C]">{pwError}</p>
                ) : null}
              </div>
              <div className="flex justify-end gap-2 border-t border-[var(--border-light)] bg-[#faf9f4] px-[22px] py-3.5">
                <button
                  type="button"
                  className={btnSecondaryClass()}
                  disabled={pwSubmitting}
                  onClick={() => setPwOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={btnPrimaryClass()}
                  disabled={pwSubmitting || pwMismatch}
                >
                  {pwSubmitting ? "Updating…" : "Update password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

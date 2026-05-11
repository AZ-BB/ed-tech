"use client";

import { logout } from "@/actions/auth";
import {
  updateStudentNotificationPreferencesAction,
  updateStudentPersonalAction,
} from "@/actions/student-settings";
import type { GeneralResponse } from "@/utils/response";
import { createSupabaseBrowserClient } from "@/utils/supabase-browser";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

const MIN_PASSWORD = 8;

export type StudentSettingsInitial = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationalityCountryCode: string;
  nationalityName: string;
  notificationAppUpdates: boolean;
  notificationNewsPlatform: boolean;
  schoolName: string;
  schoolCountryName: string;
};

function fieldClass() {
  return [
    "w-full rounded-[10px] border-[1.5px] border-[var(--border)] bg-white px-4 py-2.5",
    "font-[family-name:var(--font-dm-sans)] text-sm text-[var(--text)] outline-none",
    "transition-[box-shadow,border-color] focus:border-[var(--green-light)] focus:shadow-[0_0_0_3px_rgba(45,106,79,.08)]",
  ].join(" ");
}

function labelClass() {
  return "mb-1.5 block text-xs font-semibold text-[var(--text-light)]";
}

function btnEditClass() {
  return [
    "inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] border-[1.5px] border-[#c8e6d0]",
    "bg-[var(--green-pale)] px-5 py-1.5 text-xs font-semibold text-[var(--green)] transition-all",
    "font-[family-name:var(--font-dm-sans)] hover:border-[var(--green-light)] hover:bg-[var(--green-bg)] hover:-translate-y-px",
  ].join(" ");
}

function btnSaveClass() {
  return [
    "inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] border-none",
    "bg-[var(--green)] px-5 py-1.5 text-xs font-semibold text-white transition-all",
    "font-[family-name:var(--font-dm-sans)] hover:bg-[var(--green-dark)] hover:-translate-y-px",
    "disabled:cursor-not-allowed disabled:opacity-55",
  ].join(" ");
}

function btnCancelClass() {
  return [
    "inline-flex cursor-pointer items-center rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border-light)]",
    "bg-white px-[18px] py-1.5 text-xs font-medium text-[var(--text-hint)] transition-all",
    "font-[family-name:var(--font-dm-sans)] hover:border-[var(--border)] hover:text-[var(--text-mid)]",
  ].join(" ");
}

function btnOutlineClass() {
  return [
    "inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)]",
    "bg-white px-[22px] py-2 text-xs font-semibold text-[var(--text-mid)] transition-all",
    "font-[family-name:var(--font-dm-sans)] hover:border-[var(--green)] hover:bg-[var(--green-pale)] hover:text-[var(--green)] hover:-translate-y-px",
  ].join(" ");
}

function roLabelClass() {
  return "text-[10px] font-semibold uppercase tracking-[0.6px] text-[var(--green-light)]";
}

function roValueClass() {
  return "text-[15px] font-medium tracking-tight text-[var(--text)]";
}

export function StudentSettingsClient({
  authEmail,
  lastSignInLabel,
  countries,
  initial,
}: {
  authEmail: string;
  lastSignInLabel: string;
  countries: { id: string; name: string }[];
  initial: StudentSettingsInitial;
}) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [editingPersonal, setEditingPersonal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalityCode, setNationalityCode] = useState("");

  const [appUpdates, setAppUpdates] = useState(initial.notificationAppUpdates);
  const [newsPlatform, setNewsPlatform] = useState(initial.notificationNewsPlatform);
  const [prefsPending, startPrefsTransition] = useTransition();

  const [pwOpen, setPwOpen] = useState(false);
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const pwCurrentRef = useRef<HTMLInputElement>(null);
  const pwNewRef = useRef<HTMLInputElement>(null);
  const pwConfirmRef = useRef<HTMLInputElement>(null);

  const [logoutOpen, setLogoutOpen] = useState(false);

  const [personalState, personalAction, personalPending] = useActionState(
    updateStudentPersonalAction,
    null as GeneralResponse<null> | null,
  );
  const personalPrevPending = useRef(false);

  const displayFullName = `${initial.firstName} ${initial.lastName}`.trim();

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (editingPersonal) return;
    setFullName(displayFullName);
    setPhone(initial.phone);
    setNationalityCode(initial.nationalityCountryCode);
  }, [displayFullName, editingPersonal, initial.phone, initial.nationalityCountryCode]);

  useEffect(() => {
    setAppUpdates(initial.notificationAppUpdates);
    setNewsPlatform(initial.notificationNewsPlatform);
  }, [initial.notificationAppUpdates, initial.notificationNewsPlatform]);

  useEffect(() => {
    const done = personalPrevPending.current && !personalPending;
    if (done && personalState && personalState.error === null) {
      showToast("Personal information saved.");
      setEditingPersonal(false);
      router.refresh();
    }
    personalPrevPending.current = personalPending;
  }, [personalPending, personalState, router]);

  const startEditPersonal = useCallback(() => {
    setFullName(displayFullName);
    setPhone(initial.phone);
    setNationalityCode(initial.nationalityCountryCode);
    setEditingPersonal(true);
  }, [displayFullName, initial.phone, initial.nationalityCountryCode]);

  const cancelEditPersonal = useCallback(() => {
    setFullName(displayFullName);
    setPhone(initial.phone);
    setNationalityCode(initial.nationalityCountryCode);
    setEditingPersonal(false);
  }, [displayFullName, initial.phone, initial.nationalityCountryCode]);

  const persistPrefs = useCallback(
    (nextApp: boolean, nextNews: boolean) => {
      startPrefsTransition(async () => {
        const fd = new FormData();
        fd.set("notification_app_updates", nextApp ? "true" : "false");
        fd.set("notification_news_platform", nextNews ? "true" : "false");
        const res = await updateStudentNotificationPreferencesAction(null, fd);
        if (res.error) {
          showToast(res.error);
          setAppUpdates(initial.notificationAppUpdates);
          setNewsPlatform(initial.notificationNewsPlatform);
          return;
        }
        showToast("Notification preference updated");
        router.refresh();
      });
    },
    [initial.notificationAppUpdates, initial.notificationNewsPlatform, router],
  );

  useEffect(() => {
    if (!pwOpen) return;
    setPwError(null);
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pwSubmitting) setPwOpen(false);
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [pwOpen, pwSubmitting]);

  useEffect(() => {
    if (!logoutOpen) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLogoutOpen(false);
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [logoutOpen]);

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
    if (current === next) {
      setPwError("New password must be different from your current password.");
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
      setPwOpen(false);
      showToast("Password updated successfully");
    } finally {
      setPwSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[960px] pb-14 font-[family-name:var(--font-dm-sans)]">
      {toast ? (
        <div
          className="fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--green-dark)] px-6 py-3 text-[13px] font-medium text-white shadow-[0_4px_20px_rgba(0,0,0,.15)]"
          role="status"
        >
          <svg
            className="h-3.5 w-3.5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span>{toast}</span>
        </div>
      ) : null}

      <header className="mb-7">
        <h1 className="font-[family-name:var(--font-dm-serif)] text-[26px] text-[var(--text)]">
          Account settings
        </h1>
        <p className="mt-1 text-sm text-[var(--text-light)]">
          Manage your account details, security, and preferences
        </p>
      </header>

      {/* Personal */}
      <section className="mb-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white shadow-[0_1px_4px_rgba(0,0,0,.02)] transition-shadow hover:shadow-[0_2px_10px_rgba(0,0,0,.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-light)] bg-gradient-to-b from-[#fafaf8] to-white px-6 py-[18px] sm:px-7">
          <div className="flex items-center gap-2 text-[15px] font-bold text-[var(--text)]">
            <span className="text-[var(--green-light)] [&_svg]:block">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden
              >
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            Personal Information
          </div>
          {!editingPersonal ? (
            <button type="button" className={btnEditClass()} onClick={startEditPersonal}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Edit
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={btnCancelClass()}
                disabled={personalPending}
                onClick={cancelEditPersonal}
              >
                Cancel
              </button>
              <button type="submit" form="student-personal-form" className={btnSaveClass()} disabled={personalPending}>
                {personalPending ? (
                  "Saving…"
                ) : (
                  <>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Save
                  </>
                )}
              </button>
            </div>
          )}
        </div>
        <div className="px-6 py-5 sm:px-7 sm:py-6">
          {!editingPersonal ? (
            <div className="grid grid-cols-1 sm:grid-cols-2">
              <div className="border-b border-[var(--border-light)] border-r-0 px-[18px] py-4 transition-colors sm:border-r sm:border-[var(--border-light)]">
                <div className={roLabelClass()}>Full name</div>
                <div className={roValueClass()}>{displayFullName || "—"}</div>
              </div>
              <div className="border-b border-[var(--border-light)] px-[18px] py-4">
                <div className={roLabelClass()}>Email</div>
                <div className={roValueClass()}>{initial.email}</div>
                <p className="mt-1 text-[11px] text-[var(--text-hint)]">
                  Used for login and important updates
                </p>
              </div>
              <div className="border-r-0 px-[18px] py-4 transition-colors sm:border-r sm:border-[var(--border-light)]">
                <div className={roLabelClass()}>Phone number</div>
                <div className={roValueClass()}>{initial.phone.trim() || "—"}</div>
              </div>
              <div className="px-[18px] py-4">
                <div className={roLabelClass()}>Nationality</div>
                <div className={roValueClass()}>{initial.nationalityName}</div>
              </div>
            </div>
          ) : (
            <form id="student-personal-form" action={personalAction} className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
              <div>
                <label className={labelClass()} htmlFor="ss-full-name">
                  Full name
                </label>
                <input
                  id="ss-full-name"
                  name="full_name"
                  className={fieldClass()}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                />
              </div>
              <div>
                <span className={labelClass()}>Email</span>
                <div
                  className={`${fieldClass()} cursor-not-allowed bg-[#faf9f4] text-[var(--text-light)]`}
                  title="Email cannot be changed here"
                >
                  {initial.email}
                </div>
                <p className="mt-1 text-[11px] text-[var(--text-hint)]">
                  Used for login and important updates
                </p>
              </div>
              <div>
                <label className={labelClass()} htmlFor="ss-phone">
                  Phone number
                </label>
                <input
                  id="ss-phone"
                  name="phone"
                  type="tel"
                  className={fieldClass()}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  autoComplete="tel"
                  maxLength={64}
                />
              </div>
              <div>
                <label className={labelClass()} htmlFor="ss-nationality">
                  Nationality
                </label>
                <select
                  id="ss-nationality"
                  name="nationality_country_code"
                  className={fieldClass()}
                  value={nationalityCode}
                  onChange={(e) => setNationalityCode(e.target.value)}
                  required
                >
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              {personalState?.error ? (
                <p className="text-sm font-medium text-[#E74C3C] sm:col-span-2">{personalState.error}</p>
              ) : null}
            </form>
          )}
        </div>
      </section>

      {/* School — read only */}
      <section className="mb-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white shadow-[0_1px_4px_rgba(0,0,0,.02)] transition-shadow hover:shadow-[0_2px_10px_rgba(0,0,0,.04)]">
        <div className="flex items-center justify-between border-b border-[var(--border-light)] bg-gradient-to-b from-[#fafaf8] to-white px-6 py-[18px] sm:px-7">
          <div className="flex items-center gap-2 text-[15px] font-bold text-[var(--text)]">
            <span className="text-[var(--green-light)] [&_svg]:block">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </span>
            School Information
          </div>
        </div>
        <div className="px-6 py-5 sm:px-7 sm:py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <div className="px-[18px] py-4 sm:border-r sm:border-[var(--border-light)]">
              <div className={roLabelClass()}>School name</div>
              <div className={roValueClass()}>{initial.schoolName}</div>
            </div>
            <div className="px-[18px] py-4">
              <div className={roLabelClass()}>Country your school is in</div>
              <div className={roValueClass()}>{initial.schoolCountryName}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="mb-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white shadow-[0_1px_4px_rgba(0,0,0,.02)]">
        <div className="border-b border-[var(--border-light)] bg-gradient-to-b from-[#fafaf8] to-white px-6 py-[18px] sm:px-7">
          <div className="flex items-center gap-2 text-[15px] font-bold text-[var(--text)]">
            <span className="text-[var(--green-light)] [&_svg]:block">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </span>
            Security
          </div>
        </div>
        <div className="px-6 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:py-1.5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-[#d5e8db] bg-[var(--green-pale)]">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#7a7a7a"
                  strokeWidth="1.8"
                  aria-hidden
                >
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.78 7.78 5.5 5.5 0 017.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text)]">Change password</h4>
                <p className="text-xs text-[var(--text-hint)]">Update your account password</p>
              </div>
            </div>
            <button type="button" className={`${btnOutlineClass()} shrink-0`} onClick={() => setPwOpen(true)}>
              Change password
            </button>
          </div>
          <p className="mt-3 border-t border-[var(--border-light)] pt-2.5 text-[11px] text-[var(--text-hint)]">
            {lastSignInLabel}
          </p>
        </div>
      </section>

      {/* Preferences */}
      <section className="mb-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white shadow-[0_1px_4px_rgba(0,0,0,.02)]">
        <div className="border-b border-[var(--border-light)] bg-gradient-to-b from-[#fafaf8] to-white px-6 py-[18px] sm:px-7">
          <div className="flex items-center gap-2 text-[15px] font-bold text-[var(--text)]">
            <span className="text-[var(--green-light)] [&_svg]:block">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden
              >
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </span>
            Preferences
          </div>
        </div>
        <div className="px-6 py-2 sm:px-7">
          <div className="flex flex-col gap-1 border-b border-[var(--border-light)] py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl pr-4">
              <h4 className="text-sm font-medium text-[var(--text)]">Application updates & reminders</h4>
              <p className="mt-0.5 text-xs text-[var(--text-hint)]">
                Receive updates about deadlines, scholarships, and application progress
              </p>
            </div>
            <label className="relative h-6 w-11 shrink-0 cursor-pointer">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={appUpdates}
                disabled={prefsPending}
                onChange={(e) => {
                  const v = e.target.checked;
                  setAppUpdates(v);
                  persistPrefs(v, newsPlatform);
                }}
              />
              <span className="pointer-events-none absolute inset-0 rounded-xl bg-[var(--border)] transition-colors peer-checked:bg-[var(--green)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--green)] peer-focus-visible:ring-offset-2" />
              <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
            </label>
          </div>
          <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl pr-4">
              <h4 className="text-sm font-medium text-[var(--text)]">New universities & platform updates</h4>
              <p className="mt-0.5 text-xs text-[var(--text-hint)]">
                Get notified about new universities, advisors, and features
              </p>
            </div>
            <label className="relative h-6 w-11 shrink-0 cursor-pointer">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={newsPlatform}
                disabled={prefsPending}
                onChange={(e) => {
                  const v = e.target.checked;
                  setNewsPlatform(v);
                  persistPrefs(appUpdates, v);
                }}
              />
              <span className="pointer-events-none absolute inset-0 rounded-xl bg-[var(--border)] transition-colors peer-checked:bg-[var(--green)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--green)] peer-focus-visible:ring-offset-2" />
              <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
            </label>
          </div>
        </div>
      </section>

      {/* Account */}
      <section className="mb-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white shadow-[0_1px_4px_rgba(0,0,0,.02)]">
        <div className="border-b border-[var(--border-light)] bg-gradient-to-b from-[#fafaf8] to-white px-6 py-[18px] sm:px-7">
          <div className="flex items-center gap-2 text-[15px] font-bold text-[var(--text)]">
            <span className="text-[var(--green-light)] [&_svg]:block">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden
              >
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
            </span>
            Account
          </div>
        </div>
        <div className="px-6 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:py-1.5">
            <div className="flex items-center gap-3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-hint)"
                strokeWidth="1.8"
                aria-hidden
              >
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              <div>
                <div className="text-sm font-medium text-[var(--text)]">Log out</div>
                <div className="text-xs text-[var(--text-hint)]">Sign out of your account on this device</div>
              </div>
            </div>
            <button type="button" className={`${btnOutlineClass()} shrink-0`} onClick={() => setLogoutOpen(true)}>
              Log out
            </button>
          </div>
        </div>
      </section>

      {/* Password modal */}
      {pwOpen ? (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(15,30,20,.5)] p-5"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pwSubmitting) setPwOpen(false);
          }}
        >
          <div
            className="w-full max-w-[440px] overflow-hidden rounded-[var(--radius-xl)] bg-white shadow-[0_16px_56px_rgba(0,0,0,.15)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-pw-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[var(--border-light)] px-6 pb-[18px] pt-6 sm:px-7">
              <div>
                <h2
                  id="student-pw-title"
                  className="font-[family-name:var(--font-dm-serif)] text-lg font-bold text-[var(--text)]"
                >
                  Change password
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-hint)]">
                  Enter your current password and choose a new one
                </p>
              </div>
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--border-light)] bg-[var(--sand)] transition-colors hover:bg-[var(--border-light)]"
                aria-label="Close"
                onClick={() => !pwSubmitting && setPwOpen(false)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a7a7a" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <div className="space-y-4 px-6 pb-7 pt-5 sm:px-7">
                <div>
                  <label className={labelClass()} htmlFor="student-pw-current">
                    Current password
                  </label>
                  <input
                    id="student-pw-current"
                    ref={pwCurrentRef}
                    type="password"
                    className={fieldClass()}
                    autoComplete="current-password"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className={labelClass()} htmlFor="student-pw-new">
                    New password
                  </label>
                  <input
                    id="student-pw-new"
                    ref={pwNewRef}
                    type="password"
                    className={fieldClass()}
                    autoComplete="new-password"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className={labelClass()} htmlFor="student-pw-confirm">
                    Confirm new password
                  </label>
                  <input
                    id="student-pw-confirm"
                    ref={pwConfirmRef}
                    type="password"
                    className={fieldClass()}
                    autoComplete="new-password"
                    placeholder="Confirm new password"
                  />
                </div>
                {pwError ? (
                  <div className="flex items-start gap-2 rounded-lg border border-[#f0c4c4] bg-[#FCEBEB] px-3.5 py-2.5 text-xs text-[#991b1b]">
                    <svg
                      className="mt-0.5 shrink-0"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                    <span>{pwError}</span>
                  </div>
                ) : null}
              </div>
              <div className="flex justify-end gap-2.5 border-t border-[var(--border-light)] px-6 py-4 sm:px-7">
                <button type="button" className={btnCancelClass()} disabled={pwSubmitting} onClick={() => setPwOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={btnSaveClass()} disabled={pwSubmitting}>
                  {pwSubmitting ? "Updating…" : "Update password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Log out confirm */}
      {logoutOpen ? (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(15,30,20,.5)] p-5"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLogoutOpen(false);
          }}
        >
          <div
            className="w-full max-w-[420px] overflow-hidden rounded-[var(--radius-xl)] bg-white shadow-[0_16px_56px_rgba(0,0,0,.15)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-logout-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[var(--border-light)] px-6 py-5 sm:px-7">
              <h2 id="student-logout-title" className="font-[family-name:var(--font-dm-serif)] text-xl tracking-tight text-[var(--text)]">
                Log out?
              </h2>
              <p className="mt-2 text-sm text-[var(--text-light)]">
                You will be signed out of your account on this device. You can sign in again anytime.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 px-6 py-4 sm:px-7">
              <button type="button" className={btnCancelClass()} onClick={() => setLogoutOpen(false)}>
                Cancel
              </button>
              <form action={logout} className="inline">
                <button type="submit" className={btnSaveClass()}>
                  Log out
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

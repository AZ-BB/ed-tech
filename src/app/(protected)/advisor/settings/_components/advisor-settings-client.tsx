"use client";

import { disconnectCalendlyAction, repairCalendlyWebhookAction } from "@/actions/advisor-calendly";
import { updateAdvisorProfileAction } from "@/actions/advisor-settings";
import type { AdvisorSettingsPagePayload } from "@/app/(protected)/advisor/settings/_lib/fetch-advisor-settings-page";
import { CountryMultiSelectAutocomplete } from "@/app/(protected)/admin/users/_components/country-multi-select-autocomplete";
import type { GeneralResponse } from "@/utils/response";
import { createSupabaseBrowserClient } from "@/utils/supabase-browser";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

const MIN_PASSWORD = 8;

type AdvisorSettingsClientProps = AdvisorSettingsPagePayload;

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
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

function SectionCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white">
      <div className="border-b border-[var(--border-light)] px-5 py-[18px]">
        <div className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-[var(--text)]">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--green-bg)] text-[var(--green)] [&_svg]:h-[13px] [&_svg]:w-[13px]">
            {icon}
          </span>
          {title}
        </div>
        <p className="mt-0.5 text-[12px] text-[var(--text-light)]">{subtitle}</p>
      </div>
      <div className="px-5 py-[18px]">{children}</div>
    </div>
  );
}

export function AdvisorSettingsClient({
  authEmail,
  profileEmail,
  calendlyConnected,
  calendlyConnectedAt,
  calendlyWebhookActive,
  defaults,
  countries,
}: AdvisorSettingsClientProps) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [calendlyDisconnecting, setCalendlyDisconnecting] = useState(false);
  const [calendlyConnecting, setCalendlyConnecting] = useState(false);
  const [calendlyRepairing, setCalendlyRepairing] = useState(false);
  const [calendlyError, setCalendlyError] = useState<string | null>(null);

  const [specializationCountryCodes, setSpecializationCountryCodes] = useState(
    defaults.specializationCountryCodes,
  );

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

  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [profileState, profileAction, profilePending] = useActionState(
    updateAdvisorProfileAction,
    null as GeneralResponse<null> | null,
  );
  const profilePrevPending = useRef(false);

  const avatarDisplayUrl = removeAvatar
    ? avatarPreviewUrl
    : (avatarPreviewUrl ?? defaults.avatarUrl);

  const profileInitials = (() => {
    const a = defaults.firstName.trim()[0] ?? "";
    const b = defaults.lastName.trim()[0] ?? "";
    const pair = `${a}${b}`.toUpperCase();
    return pair || "?";
  })();

  const canRemoveAvatar = Boolean(defaults.avatarUrl) && !removeAvatar && !avatarPreviewUrl;

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("calendly");
    if (!status) return;

    if (status === "connected" || status === "already_connected") {
      router.replace("/advisor/settings", { scroll: false });
      router.refresh();
    } else if (status === "error") {
      setCalendlyError("Could not connect Calendly. Please try again.");
      router.replace("/advisor/settings", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount for OAuth redirect
  }, []);

  useEffect(() => {
    const done = profilePrevPending.current && !profilePending;
    if (done && profileState && profileState.error === null) {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl(null);
      setRemoveAvatar(false);
      showToast("Account settings saved.");
      router.refresh();
    }
    profilePrevPending.current = profilePending;
  }, [profilePending, profileState, router, avatarPreviewUrl]);

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

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);

    if (!file) {
      setAvatarPreviewUrl(null);
      return;
    }

    setRemoveAvatar(false);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  }

  function handleRemoveAvatar() {
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarPreviewUrl(null);
    setRemoveAvatar(true);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  function syncPwNewValue() {
    setPwNewValue(pwNewRef.current?.value ?? "");
  }

  function syncPwConfirmValue() {
    setPwConfirmValue(pwConfirmRef.current?.value ?? "");
  }

  async function handleCalendlyRepairWebhook() {
    if (calendlyRepairing) return;

    setCalendlyError(null);
    setCalendlyRepairing(true);
    try {
      const result = await repairCalendlyWebhookAction();
      if (result.error) {
        setCalendlyError(
          typeof result.error === "string"
            ? result.error
            : "Could not repair Calendly webhook. Please try again.",
        );
        return;
      }
      router.refresh();
    } catch {
      setCalendlyError("Could not repair Calendly webhook. Please try again.");
    } finally {
      setCalendlyRepairing(false);
    }
  }

  async function handleCalendlyDisconnect() {
    if (calendlyDisconnecting) return;

    const confirmed = window.confirm(
      "Disconnect Calendly? Students will not be able to book sessions with you until you connect again.",
    );
    if (!confirmed) return;

    setCalendlyError(null);
    setCalendlyDisconnecting(true);
    try {
      const result = await disconnectCalendlyAction();
      if (result.error) {
        setCalendlyError(
          typeof result.error === "string"
            ? result.error
            : "Could not disconnect Calendly. Please try again.",
        );
        return;
      }
      router.refresh();
    } catch {
      setCalendlyError("Could not disconnect Calendly. Please try again.");
    } finally {
      setCalendlyDisconnecting(false);
    }
  }

  function handleCalendlyConnect() {
    if (calendlyConnecting) return;
    setCalendlyError(null);
    setCalendlyConnecting(true);
    window.location.href = "/api/integrations/calendly/setup";
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
    if (next === current) {
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
      const { error: updErr } = await supabase.auth.updateUser({ password: next });
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

      <form action={profileAction} className="space-y-[18px]">
        <input type="hidden" name="remove_avatar" value={removeAvatar ? "1" : "0"} />

        <SectionCard
          title="Account"
          subtitle="Your profile and login"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
        >
          <div className="space-y-3.5">
            <div>
              <span className={labelClass()}>Profile photo</span>
              <div className="flex flex-wrap items-center gap-4">
                {avatarDisplayUrl ? (
                  <img
                    src={avatarDisplayUrl}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-full border border-[var(--border-light)] object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] text-[18px] font-bold text-[var(--green-dark)]">
                    {profileInitials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <input
                    id="advisor-settings-avatar"
                    ref={avatarInputRef}
                    name="avatar"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleAvatarChange}
                    className={`${fieldClass()} cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-[var(--green-bg)] file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-[var(--green-dark)]`}
                  />
                  <p className="mt-1.5 text-[11px] text-[var(--text-light)]">
                    PNG, JPEG, WebP, or GIF. Max 5 MB. Shown in the sidebar when set.
                  </p>
                  {canRemoveAvatar ? (
                    <button
                      type="button"
                      className={`${btnSecondaryClass()} mt-2`}
                      onClick={handleRemoveAvatar}
                    >
                      Remove photo
                    </button>
                  ) : null}
                  {removeAvatar && !avatarPreviewUrl ? (
                    <p className="mt-2 text-[11px] font-medium text-[var(--text-mid)]">
                      Photo will be removed when you save changes.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className={labelClass()} htmlFor="advisor-first-name">
                  First name
                </label>
                <input
                  id="advisor-first-name"
                  name="firstName"
                  className={fieldClass()}
                  defaultValue={defaults.firstName}
                  autoComplete="given-name"
                  required
                />
              </div>
              <div>
                <label className={labelClass()} htmlFor="advisor-last-name">
                  Last name
                </label>
                <input
                  id="advisor-last-name"
                  name="lastName"
                  className={fieldClass()}
                  defaultValue={defaults.lastName}
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelClass()} htmlFor="advisor-email">
                Email
              </label>
              <input
                id="advisor-email"
                className={`${fieldClass()} cursor-not-allowed bg-[#faf9f4] text-[var(--text-light)]`}
                value={profileEmail}
                readOnly
                autoComplete="email"
                aria-readonly="true"
                title="Email cannot be changed here"
              />
            </div>

            <div>
              <label className={labelClass()} htmlFor="advisor-phone">
                Phone (optional)
              </label>
              <input
                id="advisor-phone"
                name="phone"
                className={fieldClass()}
                defaultValue={defaults.phone}
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
          </div>
        </SectionCard>

        <SectionCard
          title="Professional profile"
          subtitle="How students see you on Univeera"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
            </svg>
          }
        >
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className={labelClass()} htmlFor="advisor-nationality">
                  Nationality country
                </label>
                <select
                  id="advisor-nationality"
                  name="nationalityCountryCode"
                  defaultValue={defaults.nationalityCountryCode}
                  className={`${fieldClass()} cursor-pointer`}
                >
                  <option value="">Select country</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass()} htmlFor="advisor-experience">
                  Experience (years)
                </label>
                <input
                  id="advisor-experience"
                  name="experienceYears"
                  type="number"
                  min={0}
                  max={80}
                  className={fieldClass()}
                  defaultValue={defaults.experienceYears}
                />
              </div>
            </div>

            <CountryMultiSelectAutocomplete
              id="advisor-specializations"
              label="Specialization countries"
              options={countries}
              value={specializationCountryCodes}
              onChange={setSpecializationCountryCodes}
              labelClassName={labelClass()}
              inputClassName={fieldClass()}
            />

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className={labelClass()} htmlFor="advisor-title">
                  Title
                </label>
                <input
                  id="advisor-title"
                  name="title"
                  className={fieldClass()}
                  defaultValue={defaults.title}
                  placeholder="Senior Admissions Advisor"
                />
              </div>
              <div>
                <label className={labelClass()} htmlFor="advisor-languages">
                  Languages
                </label>
                <input
                  id="advisor-languages"
                  name="languages"
                  className={fieldClass()}
                  defaultValue={defaults.languages}
                  placeholder="Arabic, English, French"
                />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Public catalog copy"
          subtitle="Displayed on your advisor profile for students"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          }
        >
          <div className="space-y-3.5">
            <div>
              <label className={labelClass()} htmlFor="advisor-description">
                Description
              </label>
              <textarea
                id="advisor-description"
                name="description"
                rows={2}
                className={`${fieldClass()} resize-y`}
                defaultValue={defaults.description}
              />
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className={labelClass()} htmlFor="advisor-best-for">
                  Best for
                </label>
                <input
                  id="advisor-best-for"
                  name="bestFor"
                  className={fieldClass()}
                  defaultValue={defaults.bestFor}
                />
              </div>
              <div>
                <label className={labelClass()} htmlFor="advisor-session-for">
                  Session for
                </label>
                <input
                  id="advisor-session-for"
                  name="sessionFor"
                  className={fieldClass()}
                  defaultValue={defaults.sessionFor}
                />
              </div>
            </div>

            <div>
              <label className={labelClass()} htmlFor="advisor-session-coverage">
                Session coverage (one topic per line)
              </label>
              <textarea
                id="advisor-session-coverage"
                name="sessionCoverage"
                rows={3}
                className={`${fieldClass()} resize-y`}
                defaultValue={defaults.sessionCoverage}
              />
            </div>

            <div>
              <label className={labelClass()} htmlFor="advisor-about">
                About
              </label>
              <textarea
                id="advisor-about"
                name="about"
                rows={3}
                className={`${fieldClass()} resize-y`}
                defaultValue={defaults.about}
              />
            </div>

            <div>
              <label className={labelClass()} htmlFor="advisor-questions">
                Questions (one per line)
              </label>
              <textarea
                id="advisor-questions"
                name="questions"
                rows={3}
                className={`${fieldClass()} resize-y`}
                defaultValue={defaults.questions}
              />
            </div>

            <div>
              <label className={labelClass()} htmlFor="advisor-tags">
                Tags (comma-separated)
              </label>
              <input
                id="advisor-tags"
                name="tags"
                className={fieldClass()}
                defaultValue={defaults.tags}
                placeholder="Scholarships, Essays, Strategy"
              />
            </div>
          </div>
        </SectionCard>

        <div className="flex justify-end">
          <button type="submit" className={btnPrimaryClass()} disabled={profilePending}>
            {profilePending ? "Saving…" : "Save changes"}
          </button>
        </div>

        {profileState?.error ? (
          <p className="text-[12px] font-medium text-[#E74C3C]">{profileState.error}</p>
        ) : null}
      </form>

      <SectionCard
        title="Integrations"
        subtitle="Connect Calendly so students can book sessions with you"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[var(--text)]">Calendly</p>
            {calendlyConnected ? (
              <p className="mt-1 text-[12px] text-[var(--text-light)]">
                <span className="font-medium text-[var(--green-dark)]">Connected</span>
                {calendlyConnectedAt
                  ? ` · ${new Date(calendlyConnectedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}`
                  : ""}
                {calendlyWebhookActive ? (
                  <span className="block mt-0.5 text-[var(--green-dark)]">
                    Booking notifications are active.
                  </span>
                ) : (
                  <span className="block mt-0.5 text-[#b45309]">
                    Booking webhook is missing — student Calendly bookings will not sync until you
                    repair it.
                  </span>
                )}
                <span className="block mt-0.5">
                  You can disconnect to link a different Calendly account.
                </span>
              </p>
            ) : (
              <p className="mt-1 text-[12px] text-[var(--text-light)]">
                Link your Calendly account to enable student session booking.
              </p>
            )}
          </div>
          {calendlyConnected ? (
            <div className="flex flex-wrap items-center gap-2">
              {!calendlyWebhookActive ? (
                <button
                  type="button"
                  className={btnPrimaryClass()}
                  disabled={calendlyRepairing}
                  onClick={() => void handleCalendlyRepairWebhook()}
                  aria-busy={calendlyRepairing}
                >
                  {calendlyRepairing ? (
                    <>
                      <span
                        className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white"
                        aria-hidden
                      />
                      Repairing…
                    </>
                  ) : (
                    "Repair booking webhook"
                  )}
                </button>
              ) : null}
              <button
                type="button"
                className={btnSecondaryClass()}
                disabled={calendlyDisconnecting}
                onClick={handleCalendlyDisconnect}
                aria-busy={calendlyDisconnecting}
              >
                {calendlyDisconnecting ? (
                  <>
                    <span
                      className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--green)]"
                      aria-hidden
                    />
                    Disconnecting…
                  </>
                ) : (
                  "Disconnect"
                )}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={btnSecondaryClass()}
              disabled={calendlyConnecting}
              onClick={handleCalendlyConnect}
              aria-busy={calendlyConnecting}
            >
              {calendlyConnecting ? (
                <>
                  <span
                    className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--green)]"
                    aria-hidden
                  />
                  Connecting…
                </>
              ) : (
                "Connect Calendly"
              )}
            </button>
          )}
        </div>
        {calendlyError ? (
          <p className="mt-3 text-[12px] font-medium text-[#E74C3C]">{calendlyError}</p>
        ) : null}
      </SectionCard>

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
            aria-labelledby="advisor-pw-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-light)] px-[22px] py-[18px]">
              <h2
                id="advisor-pw-modal-title"
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <div className="flex flex-col gap-3.5 px-[22px] py-[18px]">
                <PasswordInput
                  id="advisor-pw-current"
                  label="Current password"
                  inputRef={pwCurrentRef}
                  show={showPwCurrent}
                  onToggleShow={() => setShowPwCurrent((s) => !s)}
                  autoComplete="current-password"
                  placeholder="Enter current password"
                />
                <PasswordInput
                  id="advisor-pw-new"
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
                    id="advisor-pw-confirm"
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

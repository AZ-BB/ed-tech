"use client";

import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { individualStudentSignUp } from "@/actions/auth";
import { CountryCombobox } from "@/components/auth/country-combobox";
import { LocalizedLink } from "@/lib/i18n/localized-link";
import { useLocale } from "@/lib/i18n/locale-context";
import type { Country } from "@/lib/countries";
import { STUDENT_SCHOOL_GRADE_OPTIONS } from "@/lib/school-portal-destination-options";

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

const fieldBase =
  "m-0 box-border min-h-12 w-full max-w-full appearance-none rounded-xl border-[1.5px] bg-white px-4 py-3 text-sm leading-normal text-[var(--text)] antialiased transition placeholder:text-[#c0bdb8] focus:outline-none focus:ring-0";

const fieldNormal = `${fieldBase} border-[var(--border)] focus:border-[var(--green-light)] focus:shadow-[0_0_0_4px_rgba(45,106,79,0.07)]`;
const fieldErr = `${fieldBase} border-red-500 shadow-[0_0_0_3px_rgba(229,57,53,0.08)]`;
const fieldOk = `${fieldBase} border-[var(--green-light)]`;

const btnPrimary =
  "m-0 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border-0 border-transparent bg-[#2D634D] px-8 py-3 text-sm font-semibold text-white antialiased shadow-[0_3px_12px_rgba(45,106,79,0.2)] transition hover:-translate-y-px hover:bg-[var(--green-dark)] hover:shadow-[0_5px_16px_rgba(45,106,79,0.25)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D634D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:translate-y-0";

const slHint = "text-sm leading-relaxed text-white/65 max-w-full sm:max-w-xs";

const feat = "flex items-center gap-2.5 text-[13px] text-white/80";
const featIcon =
  "flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/10";

const MIN_PASSWORD_STRENGTH = 3;

function getPasswordStrength(v: string): 0 | 1 | 2 | 3 | 4 {
  let s = 0;
  if (v.length >= 8) s++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
  if (/[0-9]/.test(v)) s++;
  if (/[^a-zA-Z0-9]/.test(v)) s++;
  return s as 0 | 1 | 2 | 3 | 4;
}

function strengthLabels(s: {
  strengthWeak: string;
  strengthFair: string;
  strengthGood: string;
  strengthStrong: string;
}) {
  return ["", s.strengthWeak, s.strengthFair, s.strengthGood, s.strengthStrong] as const;
}

type LegalSection = {
  heading: string;
  paragraphs: readonly string[];
  list?: readonly string[];
  afterList?: string;
};

type LegalDoc = {
  sections: readonly LegalSection[];
};

function LegalModalBody({ doc }: { doc: LegalDoc }) {
  return (
    <>
      {doc.sections.map((section) => (
        <div key={section.heading}>
          <h3>{section.heading}</h3>
          {section.paragraphs.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
          {"list" in section && section.list ? (
            <ul>
              {section.list.map((item) => (
                <li key={item.slice(0, 40)}>{item}</li>
              ))}
            </ul>
          ) : null}
          {"afterList" in section && section.afterList ? <p>{section.afterList}</p> : null}
        </div>
      ))}
    </>
  );
}

function SplitLayout({
  left,
  right,
  brand,
}: {
  left: ReactNode;
  right: ReactNode;
  brand: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:min-h-0 lg:flex-row">
      <div className="relative flex w-full shrink-0 flex-col justify-center overflow-hidden bg-gradient-to-br from-[#1B4332] from-0% via-[#2D6A4F] via-50% to-[#40916C] to-100% px-5 pb-8 pt-5 text-white sm:px-7 sm:pb-10 sm:pt-6 lg:w-[42%] lg:min-h-screen lg:px-12 lg:py-16">
        <div
          className="pointer-events-none absolute -top-24 -end-24 size-[300px] rounded-full bg-white/[0.04]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -start-16 size-[220px] rounded-full bg-white/[0.03]"
          aria-hidden
        />
        <div className="relative z-[1] mb-5 sm:mb-6 lg:mb-8">{brand}</div>
        <div className="relative z-[1]">{left}</div>
      </div>
      <div className="flex flex-1 items-start justify-center overflow-y-auto bg-[var(--sand)] px-4 py-7 sm:px-6 sm:py-9 lg:items-center lg:px-8">
        {right}
      </div>
    </div>
  );
}

export function IndividualSignupForm() {
  const uid = useId();
  const { dict } = useLocale();
  const a = dict.auth;
  const s = dict.signup;
  const strengthLabel = strengthLabels(s);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [grade, setGrade] = useState("");
  const [nationality, setNationality] = useState<Country | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [legal, setLegal] = useState<"terms" | "privacy" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [errors, setErrors] = useState({
    f: "",
    l: "",
    g: "",
    n: "",
    e: "",
    p: "",
    pw: "",
    c: "",
    t: "",
  });

  const pwStr = getPasswordStrength(password);
  const matchOk = confirmPassword.length > 0 && password === confirmPassword;

  useEffect(() => {
    if (legal) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [legal]);

  const validate = useCallback(() => {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const next = {
      f: !firstName.trim() ? s.errFirstName : "",
      l: !lastName.trim() ? s.errLastName : "",
      g: !grade ? s.errGrade : "",
      n: !nationality ? s.errNationality : "",
      e: !email.trim() || !emailValid ? s.errEmail : "",
      p: !phone.trim() ? s.errPhone : "",
      pw:
        getPasswordStrength(password) < MIN_PASSWORD_STRENGTH ? s.errPassword : "",
      c: !confirmPassword || password !== confirmPassword ? s.errPasswordMatch : "",
      t: !terms ? s.errTerms : "",
    };
    setErrors(next);
    return Object.values(next).every((value) => !value);
  }, [
    confirmPassword,
    email,
    firstName,
    grade,
    lastName,
    nationality,
    password,
    phone,
    s,
    terms,
  ]);

  const handleSubmit = async () => {
    setSubmitError("");
    if (!validate() || !nationality) return;

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("firstName", firstName.trim());
      fd.append("lastName", lastName.trim());
      fd.append("grade", grade);
      fd.append("email", email.trim());
      fd.append("nationalityCountryCode", nationality.alpha2);
      fd.append("phoneNumber", phone.trim());
      fd.append("password", password);

      const result = await individualStudentSignUp(fd);
      if (result.error) {
        setSubmitError(result.error);
      }
    } catch {
      setSubmitError(s.errCreateAccount);
    } finally {
      setIsSubmitting(false);
    }
  };

  const leftContent = (
    <>
      <h1 className="serif mb-2 text-[1.35rem] leading-snug sm:text-2xl lg:text-[28px]">
        {s.individualLeftTitle}
      </h1>
      <p className={slHint}>{s.individualLeftSub}</p>
      <ul className="mt-5 hidden list-none flex-col gap-2 sm:mt-7 sm:flex">
        <li className={feat}>
          <div className={featIcon} aria-hidden>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className="text-[#52B788]"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          {s.featureRecommendations}
        </li>
        <li className={feat}>
          <div className={featIcon} aria-hidden>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className="text-[#52B788]"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2l3 6.5L22 9l-5 4.9L18.2 21 12 17.3 5.8 21 7 13.9 2 9l7-0.5z" />
            </svg>
          </div>
          {s.featureScholarships}
        </li>
        <li className={feat}>
          <div className={featIcon} aria-hidden>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className="text-[#52B788]"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
            </svg>
          </div>
          {s.featureGuidance}
        </li>
      </ul>
    </>
  );

  const rightPanel = (
    <div className="w-full max-w-md pb-8 pt-1 sm:pt-0 lg:py-0">
      <h2 className="serif text-xl text-[var(--text)] sm:text-2xl">{s.individualFormTitle}</h2>
      <p className="mb-5 text-sm text-[var(--text-light)]">{s.individualFormSub}</p>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`${uid}-fn`}
              className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]"
            >
              {s.firstName}
            </label>
            <input
              id={`${uid}-fn`}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Noura"
              className={clsx(errors.f ? fieldErr : fieldNormal)}
            />
            {errors.f ? <p className="mt-1 text-[11px] text-red-600">{errors.f}</p> : null}
          </div>
          <div>
            <label
              htmlFor={`${uid}-ln`}
              className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]"
            >
              {s.lastName}
            </label>
            <input
              id={`${uid}-ln`}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Al-Mansoori"
              className={clsx(errors.l ? fieldErr : fieldNormal)}
            />
            {errors.l ? <p className="mt-1 text-[11px] text-red-600">{errors.l}</p> : null}
          </div>
        </div>

        <div>
          <label
            htmlFor={`${uid}-em`}
            className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]"
          >
            {a.email}
          </label>
          <input
            id={`${uid}-em`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            autoComplete="email"
            className={clsx(errors.e ? fieldErr : fieldNormal)}
          />
          {errors.e ? <p className="mt-1 text-[11px] text-red-600">{errors.e}</p> : null}
        </div>

        <div>
          <label
            htmlFor={`${uid}-ph`}
            className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]"
          >
            {s.phoneNumber}
          </label>
          <input
            id={`${uid}-ph`}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+971 XX XXX XXXX"
            className={clsx(errors.p ? fieldErr : fieldNormal)}
          />
          {errors.p ? <p className="mt-1 text-[11px] text-red-600">{errors.p}</p> : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`${uid}-grade`}
              className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]"
            >
              {s.grade}
            </label>
            <select
              id={`${uid}-grade`}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className={clsx(errors.g ? fieldErr : fieldNormal)}
            >
              <option value="">{s.selectGrade}</option>
              {STUDENT_SCHOOL_GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            {errors.g ? <p className="mt-1 text-[11px] text-red-600">{errors.g}</p> : null}
          </div>

          <CountryCombobox
            id={`${uid}-nat`}
            label={s.nationality}
            value={nationality}
            onChange={setNationality}
            placeholder={s.selectNationality}
            error={errors.n}
          />
        </div>

        <div>
          <label
            htmlFor={`${uid}-pw`}
            className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]"
          >
            {a.password}
          </label>
          <div className="relative">
            <input
              id={`${uid}-pw`}
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={s.createPassword}
              autoComplete="new-password"
              className={clsx(
                "m-0 box-border min-h-12 w-full max-w-full appearance-none rounded-xl py-3 pe-12 ps-4 text-sm leading-normal text-[var(--text)] antialiased transition focus:outline-none focus:ring-0",
                errors.pw
                  ? fieldErr
                  : getPasswordStrength(password) >= MIN_PASSWORD_STRENGTH
                    ? fieldOk
                    : fieldNormal,
              )}
            />
            <button
              type="button"
              className="absolute top-1/2 end-3 -translate-y-1/2 border-0 bg-transparent p-1 text-[var(--text-hint)] hover:text-[var(--text-mid)]"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? a.hidePassword : a.showPassword}
            >
              {showPw ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <div className="mt-2 flex gap-1">
            {([0, 1, 2, 3] as const).map((barIdx) => {
              const st = getPasswordStrength(password);
              const active = barIdx < st;
              const tier =
                st === 1
                  ? "bg-red-500"
                  : st === 2
                    ? "bg-amber-500"
                    : st === 3
                      ? "bg-green-500"
                      : st >= 4
                        ? "bg-[var(--green)]"
                        : "";
              return (
                <div
                  key={barIdx}
                  className={clsx(
                    "h-1 flex-1 rounded-sm bg-[var(--border-light)] transition-colors",
                    active && tier,
                  )}
                />
              );
            })}
          </div>
          <p className="mt-1 text-[10px] text-[var(--text-hint)]">
            {password ? strengthLabel[pwStr] : s.passwordHint}
          </p>
          {errors.pw ? <p className="mt-1 text-[11px] text-red-600">{errors.pw}</p> : null}
        </div>

        <div>
          <label
            htmlFor={`${uid}-cpw`}
            className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]"
          >
            {s.confirmPassword}
          </label>
          <div className="relative">
            <input
              id={`${uid}-cpw`}
              type={showCpw ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={s.confirmYourPassword}
              autoComplete="new-password"
              className={clsx(
                "m-0 box-border min-h-12 w-full max-w-full appearance-none rounded-xl py-3 pe-12 ps-4 text-sm leading-normal text-[var(--text)] antialiased transition focus:outline-none focus:ring-0",
                errors.c ? fieldErr : matchOk ? fieldOk : fieldNormal,
              )}
            />
            <button
              type="button"
              className="absolute top-1/2 end-3 -translate-y-1/2 border-0 bg-transparent p-1 text-[var(--text-hint)]"
              onClick={() => setShowCpw((v) => !v)}
              aria-label={showCpw ? a.hidePassword : a.showPassword}
            >
              {showCpw ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {errors.c ? <p className="mt-1 text-[11px] text-red-600">{errors.c}</p> : null}
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5 size-[18px] shrink-0 cursor-pointer rounded border-[1.5px] border-[var(--border)] accent-[var(--green)]"
            />
            <span className="text-xs leading-snug text-[var(--text-light)]">
              {s.agreePrefix}{" "}
              <button
                type="button"
                className="m-0 cursor-pointer border-0 bg-transparent p-0 font-medium text-[var(--green)] hover:underline"
                onClick={() => setLegal("terms")}
              >
                {s.termsLink}
              </button>{" "}
              {s.and}{" "}
              <button
                type="button"
                className="m-0 cursor-pointer border-0 bg-transparent p-0 font-medium text-[var(--green)] hover:underline"
                onClick={() => setLegal("privacy")}
              >
                {s.privacyLink}
              </button>
            </span>
          </label>
          {errors.t ? <p className="mt-1 text-[11px] text-red-600">{errors.t}</p> : null}
        </div>
      </div>

      {submitError ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-4">
        <button
          type="button"
          className={clsx(btnPrimary, "w-full sm:w-auto")}
          disabled={isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? (
            <>
              <span
                className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white"
                aria-hidden
              />
              {s.saving}
            </>
          ) : (
            <>
              {s.individualSubmit}
              <ArrowRight className="icon-directional size-3.5" strokeWidth={2.5} />
            </>
          )}
        </button>

        <p className="text-center text-sm text-[var(--text-light)]">
          {s.individualHasSchool}{" "}
          <LocalizedLink href="/signup" className="font-medium text-[var(--green)] hover:underline">
            {s.individualSchoolSignup}
          </LocalizedLink>
        </p>
      </div>
    </div>
  );

  const brandLink = (
    <LocalizedLink href="/" className="inline-flex items-center gap-2.5">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-white/15 ring-1 ring-white/20"
        aria-hidden
      >
        <LogoIcon />
      </div>
      <span className="text-[0.95rem] font-bold text-white">{dict.common.brand}</span>
    </LocalizedLink>
  );

  return (
    <div className="relative min-h-screen bg-[var(--sand)]" data-page="signup-individual">
      {legal ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 sm:p-8"
          role="dialog"
          aria-modal
          onClick={(e) => e.target === e.currentTarget && setLegal(null)}
        >
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_12px_48px_rgba(0,0,0,0.15)]">
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-light)] px-6 py-4 sm:px-7">
              <h2 className="serif text-xl text-[var(--text)]">
                {legal === "terms" ? dict.terms.title : dict.privacy.title}
              </h2>
              <button
                type="button"
                onClick={() => setLegal(null)}
                className="flex size-8 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--text)] hover:bg-[var(--sand)]"
                aria-label={s.close}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-[var(--text-mid)] sm:px-7 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-[var(--text)] [&_h3]:first:mt-0 [&_p]:mb-2 [&_ul]:my-1.5 [&_ul]:ms-4 [&_li]:mb-0.5">
              <LegalModalBody doc={legal === "terms" ? dict.terms : dict.privacy} />
            </div>
            <div className="shrink-0 border-t border-[var(--border-light)] px-6 py-3.5 text-right sm:px-7">
              <button
                type="button"
                onClick={() => setLegal(null)}
                className="m-0 inline-flex h-8 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--green)] px-5 text-sm font-semibold text-white"
              >
                {s.close}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <SplitLayout left={leftContent} right={rightPanel} brand={brandLink} />
    </div>
  );
}

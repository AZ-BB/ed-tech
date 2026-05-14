"use client";

import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { studentSignUp } from "@/actions/auth";
import { CountryCombobox } from "@/components/auth/country-combobox";
import type { Country } from "@/lib/countries";
import { GeneralResponse } from "@/utils/response";

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

/** “Yes, I have a code” path: any code with at least this many characters can continue. */
const MIN_SCHOOL_CODE_LENGTH = 4;

const fieldBase =
  "m-0 box-border min-h-12 w-full max-w-full appearance-none rounded-xl border-[1.5px] bg-white px-4 py-3 text-sm leading-normal text-[var(--text)] antialiased transition placeholder:text-[#c0bdb8] focus:outline-none focus:ring-0";

const fieldNormal = `${fieldBase} border-[var(--border)] focus:border-[var(--green-light)] focus:shadow-[0_0_0_4px_rgba(45,106,79,0.07)]`;
const fieldErr = `${fieldBase} border-red-500 shadow-[0_0_0_3px_rgba(229,57,53,0.08)]`;
const fieldOk = `${fieldBase} border-[var(--green-light)]`;

type Step = "profile" | "account" | "school";

function getPasswordStrength(
  v: string,
): 0 | 1 | 2 | 3 | 4 {
  let s = 0;
  if (v.length >= 8) s++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
  if (/[0-9]/.test(v)) s++;
  if (/[^a-zA-Z0-9]/.test(v)) s++;
  return s as 0 | 1 | 2 | 3 | 4;
}

const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"] as const;

/** Require Good (3) or Strong (4) — 8+ chars, upper & lower, and a number; special char optional. */
const MIN_PASSWORD_STRENGTH = 3;

type SplitProps = {
  left: ReactNode;
  right: ReactNode;
};

function SplitLayout({ left, right }: SplitProps) {
  return (
    <div className="flex min-h-screen flex-col lg:min-h-0 lg:flex-row">
      <div className="relative flex w-full flex-col justify-center overflow-hidden bg-gradient-to-br from-[#1B4332] from-0% via-[#2D6A4F] via-50% to-[#40916C] to-100% px-7 py-10 text-white lg:w-[42%] lg:min-h-screen lg:px-12 lg:py-16">
        <div
          className="pointer-events-none absolute -top-24 -right-24 size-[300px] rounded-full bg-white/[0.04]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-16 size-[220px] rounded-full bg-white/[0.03]"
          aria-hidden
        />
        <div className="relative z-[1]">{left}</div>
      </div>
      <div className="flex flex-1 items-start justify-center overflow-y-auto bg-[var(--sand)] px-4 py-7 sm:px-6 sm:py-9 lg:items-center lg:px-8">
        {right}
      </div>
    </div>
  );
}

function ProgressBar({ label, stepText, pct }: { label: string; stepText: string; pct: number }) {
  return (
    <div className="mb-6 w-full max-w-md">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-light)]">{label}</span>
        <span className="text-xs font-semibold text-[var(--green)]">{stepText}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border-light)]">
        <div
          className="h-full rounded-full bg-[var(--green)] transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const btnPrimary =
  "m-0 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border-0 border-transparent bg-[#2D634D] px-8 py-3 text-sm font-semibold text-white antialiased shadow-[0_3px_12px_rgba(45,106,79,0.2)] transition hover:-translate-y-px hover:bg-[var(--green-dark)] hover:shadow-[0_5px_16px_rgba(45,106,79,0.25)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D634D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:translate-y-0";

const btnBack =
  "m-0 cursor-pointer border-0 bg-transparent p-0 text-sm font-medium text-[var(--text-light)] transition hover:text-[var(--text)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--green)] focus-visible:ring-offset-2";

const slHint = "text-sm leading-relaxed text-white/65 max-w-xs";

const feat = "flex items-center gap-2.5 text-[13px] text-white/80";

const featIcon =
  "flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/10";

const LEGAL_TERMS_MODAL_HTML = `<h3>1. Introduction</h3>
<p>Welcome to our platform. By accessing or using our services, you agree to comply with and be bound by these Terms and Conditions.</p>
<h3>2. Services Provided</h3>
<p>We provide advisory, educational support, university application assistance, and ambassador-based consultation services. We do not guarantee admission, scholarships, or visa approvals.</p>
<h3>3. No Guarantee of Outcomes</h3>
<p>All guidance is advisory in nature. Final decisions are made by universities and third parties. We are not responsible for rejections, delays, or changes in admission policies.</p>
<h3>4. User Obligations</h3>
<p>Users must provide accurate and truthful information. Any false or misleading information may result in termination of services.</p>
<h3>5. Account Responsibility</h3>
<p>Users are responsible for maintaining confidentiality of login credentials. Any activity under the account is the user&apos;s responsibility.</p>
<h3>6. Payments and Refunds</h3>
<p>All payments are non-refundable unless explicitly stated. Missed sessions or cancellations may not be refunded.</p>
<h3>7. Session Booking Disclaimer</h3>
<p>Sessions are subject to availability. We reserve the right to reschedule or assign alternative advisors.</p>
<h3>8. Third-Party Services</h3>
<p>We may use third-party tools (e.g., Calendly, payment providers). We are not liable for their performance or failures.</p>
<h3>9. Limitation of Liability</h3>
<p>We are not liable for:</p>
<ul><li>Admission outcomes</li><li>Visa decisions</li><li>Financial losses</li><li>Indirect or consequential damages</li></ul>
<h3>10. Intellectual Property</h3>
<p>All platform content, branding, and materials are owned by the company and may not be reused without permission.</p>
<h3>11. Termination</h3>
<p>We reserve the right to suspend or terminate access at any time for violation of terms.</p>
<h3>12. Data Usage Consent</h3>
<p>By using the platform, you consent to collection and use of your data as outlined in our Privacy Policy.</p>
<h3>13. Governing Law</h3>
<p>These terms are governed by the laws of the United Arab Emirates.</p>
<h3>14. Modifications</h3>
<p>We may update these terms at any time. Continued use constitutes acceptance.</p>`;

const LEGAL_PRIVACY_MODAL_HTML = `<h3>1. Introduction</h3>
<p>We are committed to protecting your privacy and handling your data responsibly.</p>
<h3>2. Data We Collect</h3>
<p>We may collect:</p>
<ul><li>Name, email, phone number</li><li>Nationality and country of residence</li><li>Academic interests and preferences</li><li>Uploaded documents</li><li>Usage behavior and analytics</li></ul>
<h3>3. Purpose of Data</h3>
<p>We use data to:</p>
<ul><li>Provide personalized services</li><li>Match users with advisors/ambassadors</li><li>Improve platform functionality</li><li>Communicate updates and confirmations</li></ul>
<h3>4. Data Sharing</h3>
<p>We do not sell user data. Data may be shared with:</p>
<ul><li>Advisors or ambassadors (limited scope)</li><li>Payment processors</li><li>Service providers necessary to deliver services</li></ul>
<h3>5. Data Storage and Security</h3>
<p>We implement reasonable safeguards to protect user data. However, no system is 100% secure.</p>
<h3>6. User Rights</h3>
<p>Users may:</p>
<ul><li>Request access to their data</li><li>Request correction</li><li>Request deletion (subject to legal limitations)</li></ul>
<h3>7. Cookies</h3>
<p>We use cookies to improve experience and track analytics.</p>
<h3>8. Third-Party Links</h3>
<p>We are not responsible for third-party platforms linked from our services.</p>
<h3>9. Data Retention</h3>
<p>We retain data only as long as necessary to provide services or comply with legal obligations.</p>
<h3>10. Children&apos;s Data</h3>
<p>Our services are intended for students. Parental consent may be required depending on jurisdiction.</p>
<h3>11. Policy Updates</h3>
<p>We may update this policy at any time.</p>
<h3>12. Contact</h3>
<p>For any privacy concerns, contact support.</p>`;

export function SignupWizard() {
  const uid = useId();
  const router = useRouter();
  const [step, setStep] = useState<Step>("profile");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nationality, setNationality] = useState<Country | null>(null);
  const [residence, setResidence] = useState<Country | null>(null);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);

  const [schoolChoice, setSchoolChoice] = useState<"" | "yes">("");
  const [schoolCode, setSchoolCode] = useState("");

  const [legal, setLegal] = useState<"terms" | "privacy" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field-level errors (simple strings, empty = no error)
  const [pe, setPe] = useState({
    f: "",
    l: "",
    s: "",
    n: "",
    r: "",
  });
  const [ae, setAe] = useState({ e: "", p: "", pw: "", c: "", t: "" });
  const [se, setSe] = useState({ c: "" });

  const pwStr = getPasswordStrength(password);
  const matchOk = confirmPassword.length > 0 && password === confirmPassword;

  useEffect(() => {
    if (legal) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [legal]);

  const schoolCodeLongEnough =
    schoolCode.trim().length >= MIN_SCHOOL_CODE_LENGTH;

  function validateProfile() {
    const next = {
      f: !firstName.trim() ? "First name is required" : "",
      l: !lastName.trim() ? "Last name is required" : "",
      s: "",
      n: !nationality ? "Nationality is required" : "",
      r: !residence ? "Country of residence is required" : "",
    };
    setPe(next);
    return !next.f && !next.l && !next.n && !next.r;
  }

  const buildSignUpFormData = useCallback((): FormData | null => {
    if (!nationality || !residence) return null;
    const fd = new FormData();
    fd.append("firstName", firstName.trim());
    fd.append("lastName", lastName.trim());
    fd.append("email", email.trim());
    fd.append("nationalityCountryCode", nationality.alpha2);
    fd.append("residenceCountryCode", residence.alpha2);
    fd.append("phoneNumber", phone.trim());
    fd.append("password", password);
    fd.append("schoolAccessCode", schoolCode.trim());
    return fd;
  }, [
    firstName,
    lastName,
    email,
    nationality,
    residence,
    phone,
    password,
    schoolCode,
  ]);

  const submitSignUp = useCallback(async (): Promise<GeneralResponse<boolean>> => {
    const fd = buildSignUpFormData();
    if (!fd) {
      return {
        data: false,
        error: "Missing required profile or country data."
      };
    }
    return studentSignUp(fd);
  }, [buildSignUpFormData]);

  function validateAccount() {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const next = {
      e: !email.trim() || !emailValid ? "Valid email is required" : "",
      p: !phone.trim() ? "Phone number is required" : "",
      pw:
        getPasswordStrength(password) < MIN_PASSWORD_STRENGTH
          ? "Password must be Good or stronger: at least 8 characters with uppercase, lowercase, and a number"
          : "",
      c: !confirmPassword || password !== confirmPassword ? "Passwords do not match" : "",
      t: !terms
        ? "You must agree to the Terms & Conditions and Privacy Policy"
        : "",
    };
    setAe(next);
    return !next.e && !next.p && !next.pw && !next.c && !next.t;
  }

  async function handleSchoolNext() {
    if (schoolChoice !== "yes") return;
    const code = schoolCode.trim().toUpperCase();
    if (code.length < MIN_SCHOOL_CODE_LENGTH) return;

    setSe({ c: "" });
    setIsSubmitting(true);
    try {
      const result = await submitSignUp();
      if (result.error) {
        setSe({ c: result.error });
        return;
      }
    } catch {
      setSe({ c: "Could not create your account. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  const profileLeft = (
    <>
      <p className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-[var(--green-bright)] uppercase">
        Step 1 of 3
      </p>
      <h1 className="serif mb-2 text-2xl leading-snug sm:text-[28px]">Let&apos;s get to know you</h1>
      <p className={slHint}>
        We&apos;ll personalize your experience based on your background and goals. This only takes
        a minute.
      </p>
      <ul className="mt-7 flex list-none flex-col gap-2.5">
        <li className={feat}>
          <div className={featIcon} aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#52B788]" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          Personalized recommendations
        </li>
        <li className={feat}>
          <div className={featIcon} aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#52B788]" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3 6.5L22 9l-5 4.9L18.2 21 12 17.3 5.8 21 7 13.9 2 9l7-0.5z" />
            </svg>
          </div>
          Relevant scholarships
        </li>
        <li className={feat}>
          <div className={featIcon} aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#52B788]" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
            </svg>
          </div>
          Region-specific guidance
        </li>
      </ul>
    </>
  );

  const accountLeft = (
    <>
      <p className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-[var(--green-bright)] uppercase">
        Step 2 of 3
      </p>
      <h1 className="serif mb-2 text-2xl leading-snug sm:text-[28px]">Secure your account</h1>
      <p className={slHint}>
        This lets you save your progress, access your dashboard, and pick up where you left off.
      </p>
    </>
  );

  const schoolLeft = (
    <>
      <p className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-[var(--green-bright)] uppercase">
        Step 3 of 3
      </p>
      <h1 className="serif mb-2 text-2xl leading-snug sm:text-[28px]">How are you joining Univeera?</h1>
      <p className={slHint}>
        If your school is registered with Univeera, you&apos;ll have full access through your
        school&apos;s partnership — no payment needed.
      </p>
    </>
  );

  const leftContent =
    step === "profile" ? profileLeft : step === "account" ? accountLeft : schoolLeft;

  const rightPanel = (
    <div className="w-full max-w-md pb-8 lg:py-0">
      {step === "profile" && (
        <>
          <ProgressBar label="Profile" stepText="Step 1 of 3" pct={33} />
          <h2 className="serif text-2xl text-[var(--text)]">Tell us about you</h2>
          <p className="mb-5 text-sm text-[var(--text-light)]">This helps us personalize your experience</p>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={`${uid}-fn`} className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]">
                  First name
                </label>
                <input
                  id={`${uid}-fn`}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Noura"
                  className={clsx(pe.f ? fieldErr : fieldNormal)}
                />
                {pe.f ? <p className="mt-1 text-[11px] text-red-600">{pe.f}</p> : null}
              </div>
              <div>
                <label htmlFor={`${uid}-ln`} className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]">
                  Last name
                </label>
                <input
                  id={`${uid}-ln`}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Al-Mansoori"
                  className={clsx(pe.l ? fieldErr : fieldNormal)}
                />
                {pe.l ? <p className="mt-1 text-[11px] text-red-600">{pe.l}</p> : null}
              </div>
            </div>
            <CountryCombobox
              id={`${uid}-nat`}
              label="Nationality"
              value={nationality}
              onChange={setNationality}
              placeholder="Select nationality"
              error={pe.n}
            />
            <CountryCombobox
              id={`${uid}-res`}
              label="Country of residence"
              value={residence}
              onChange={setResidence}
              placeholder="Select country"
              error={pe.r}
            />
          </div>
          <div className="mt-6 flex items-center justify-between">
            <Link href="/login" className={btnBack}>
              Back
            </Link>
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                if (validateProfile()) setStep("account");
              }}
            >
              Next
              <ArrowRight className="size-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </>
      )}

      {step === "account" && (
        <>
          <ProgressBar label="Account setup" stepText="Step 2 of 3" pct={66} />
          <h2 className="serif text-2xl text-[var(--text)]">Create your account</h2>
          <p className="mb-5 text-sm text-[var(--text-light)]">Set up your login credentials</p>
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor={`${uid}-em`} className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]">
                Email
              </label>
              <input
                id={`${uid}-em`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                className={clsx(ae.e ? fieldErr : fieldNormal)}
              />
              {ae.e ? <p className="mt-1 text-[11px] text-red-600">{ae.e}</p> : null}
            </div>
            <div>
              <label htmlFor={`${uid}-ph`} className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]">
                Phone number
              </label>
              <input
                id={`${uid}-ph`}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+971 XX XXX XXXX"
                className={clsx(ae.p ? fieldErr : fieldNormal)}
              />
              {ae.p ? <p className="mt-1 text-[11px] text-red-600">{ae.p}</p> : null}
            </div>
            <div>
              <label htmlFor={`${uid}-pw`} className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]">
                Password
              </label>
              <div className="relative">
                <input
                  id={`${uid}-pw`}
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  className={clsx(
                    "m-0 box-border min-h-12 w-full max-w-full appearance-none rounded-xl py-3 pr-12 pl-4 text-sm leading-normal text-[var(--text)] antialiased transition focus:outline-none focus:ring-0",
                    ae.pw
                      ? fieldErr
                      : getPasswordStrength(password) >= MIN_PASSWORD_STRENGTH
                        ? fieldOk
                        : fieldNormal,
                  )}
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-3 -translate-y-1/2 border-0 bg-transparent p-1 text-[var(--text-hint)] hover:text-[var(--text-mid)]"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Hide password" : "Show password"}
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
                {password ? strengthLabel[pwStr] : "Enter at least 8 characters"}
              </p>
              {ae.pw ? <p className="mt-1 text-[11px] text-red-600">{ae.pw}</p> : null}
            </div>
            <div>
              <label htmlFor={`${uid}-cpw`} className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id={`${uid}-cpw`}
                  type={showCpw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  className={clsx(
                    "m-0 box-border min-h-12 w-full max-w-full appearance-none rounded-xl py-3 pr-12 pl-4 text-sm leading-normal text-[var(--text)] antialiased transition focus:outline-none focus:ring-0",
                    ae.c ? fieldErr : matchOk ? fieldOk : fieldNormal,
                  )}
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-3 -translate-y-1/2 border-0 bg-transparent p-1 text-[var(--text-hint)]"
                  onClick={() => setShowCpw((s) => !s)}
                  aria-label={showCpw ? "Hide password" : "Show password"}
                >
                  {showCpw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {ae.c ? <p className="mt-1 text-[11px] text-red-600">{ae.c}</p> : null}
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
                  I agree to the{" "}
                  <button
                    type="button"
                    className="m-0 cursor-pointer border-0 bg-transparent p-0 text-[var(--green)] font-medium hover:underline"
                    onClick={() => setLegal("terms")}
                  >
                    Terms & Conditions
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    className="m-0 cursor-pointer border-0 bg-transparent p-0 text-[var(--green)] font-medium hover:underline"
                    onClick={() => setLegal("privacy")}
                  >
                    Privacy Policy
                  </button>
                </span>
              </label>
              {ae.t ? <p className="mt-1 text-[11px] text-red-600">{ae.t}</p> : null}
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <button type="button" className={btnBack} onClick={() => setStep("profile")}>
              Back
            </button>
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                if (validateAccount()) setStep("school");
              }}
            >
              Next
              <ArrowRight className="size-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </>
      )}

      {step === "school" && (
        <>
          <ProgressBar label="Access type" stepText="Step 3 of 3" pct={100} />
          <h2 className="serif text-2xl text-[var(--text)]">Is your school registered with Univeera?</h2>
          <p className="mb-5 text-sm text-[var(--text-light)]">
            Schools that partner with us provide free access for their students
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setSchoolChoice("yes");
                setSchoolCode("");
                setSe({ c: "" });
              }}
              className={clsx(
                "flex cursor-pointer items-center gap-4 rounded-xl border-[1.5px] p-4 text-left transition",
                schoolChoice === "yes"
                  ? "border-[var(--green)] bg-[#f0f7f2]"
                  : "border-[var(--border)] hover:border-[#c8c4bc]",
              )}
            >
              <div
                className={clsx(
                  "flex size-[22px] shrink-0 items-center justify-center rounded-full border-2",
                  schoolChoice === "yes" ? "border-[var(--green)]" : "border-[var(--border)]",
                )}
                aria-hidden
              >
                <div
                  className={clsx("size-2.5 rounded-full bg-[var(--green)]", schoolChoice === "yes" ? "opacity-100" : "opacity-0")}
                />
              </div>
              <div>
                <div className="mb-0.5 text-[15px] font-semibold text-[var(--text)]">Yes — my school is registered</div>
                <div className="text-[13px] text-[var(--text-light)]">I have an access code from my school</div>
              </div>
            </button>
            <button
              type="button"
              disabled
              className="m-0 flex w-full cursor-not-allowed items-center gap-4 rounded-xl border-[1.5px] border-[var(--border-light)] bg-[#f7f6f3] p-4 text-left opacity-60"
              title="This option is not available right now"
            >
              <div
                className="flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 border-[var(--border)]"
                aria-hidden
              >
                <div className="size-2.5 rounded-full bg-[var(--green)] opacity-0" />
              </div>
              <div className="text-left">
                <div className="mb-0.5 text-[15px] font-semibold text-[var(--text)]">No — I&apos;m joining on my own</div>
                <div className="text-[13px] text-[var(--text-hint)]">Temporarily unavailable — please use your school access code</div>
              </div>
            </button>
          </div>
          {schoolChoice === "yes" ? (
            <div className="mt-4">
              <label htmlFor={`${uid}-scode`} className="mb-1.5 block text-xs font-semibold text-[var(--text-mid)]">
                School access code
              </label>
              <input
                id={`${uid}-scode`}
                value={schoolCode}
                onChange={(e) => {
                  setSchoolCode(e.target.value);
                  if (se.c) setSe({ c: "" });
                }}
                placeholder="Your school access code"
                className={clsx(
                  "font-semibold tracking-wide",
                  se.c ? fieldErr : schoolCodeLongEnough ? fieldOk : fieldNormal,
                )}
              />
              {se.c ? <p className="mt-1 text-[11px] text-red-600">{se.c}</p> : null}
              <p className="mt-2 text-[12px] leading-snug text-[var(--text-light)]">
                Use the same email address your school added to their approved student list.
              </p>
            </div>
          ) : null}
          <div className="mt-6 flex items-center justify-between">
            <button type="button" className={btnBack} onClick={() => setStep("account")}>
              Back
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={
                isSubmitting ||
                schoolChoice === "" ||
                (schoolChoice === "yes" && !schoolCodeLongEnough)
              }
              onClick={async () => {
                await handleSchoolNext();
              }}
            >
              {isSubmitting ? (
                <>
                  <span
                    className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white"
                    aria-hidden
                  />
                  Saving…
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="size-3.5" strokeWidth={2.5} />
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div
      className="relative min-h-screen bg-[var(--sand)]"
      data-page="signup"
    >
      <Link
        href="/"
        className="absolute top-4 left-4 z-20 flex items-center gap-2.5 sm:top-6 sm:left-6"
      >
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#2D634D]"
          aria-hidden
        >
          <LogoIcon />
        </div>
        <span className="text-[0.95rem] font-bold text-white">Univeera</span>
      </Link>
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
                {legal === "terms" ? "Terms & Conditions" : "Privacy Policy"}
              </h2>
              <button
                type="button"
                onClick={() => setLegal(null)}
                className="flex size-8 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--text)] hover:bg-[var(--sand)]"
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div
              className="min-h-0 flex-1 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-[var(--text-mid)] sm:px-7 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-[var(--text)] [&_h3]:first:mt-0 [&_p]:mb-2 [&_ul]:my-1.5 [&_ul]:ml-4 [&_li]:mb-0.5"
              dangerouslySetInnerHTML={{
                __html: legal === "terms" ? LEGAL_TERMS_MODAL_HTML : LEGAL_PRIVACY_MODAL_HTML,
              }}
            />
            <div className="shrink-0 border-t border-[var(--border-light)] px-6 py-3.5 text-right sm:px-7">
              <button
                type="button"
                onClick={() => setLegal(null)}
                className="m-0 inline-flex h-8 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--green)] px-5 text-sm font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <SplitLayout left={leftContent} right={rightPanel} />
    </div>
  );
}

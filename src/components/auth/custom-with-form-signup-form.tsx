"use client";

import { customWithFormStudentSignUp } from "@/actions/auth";
import { CalendlyInlineEmbed } from "@/components/calendly-inline-embed";
import { COUNTRIES, getLocalizedCountryName } from "@/lib/countries";
import {
  CUSTOM_WITH_FORM_FEATURE,
  CUSTOM_WITH_FORM_PHONE_COUNTRIES,
  CUSTOM_WITH_FORM_TZ_TO_COUNTRY,
  CUSTOM_WITH_FORM_WEBHOOK_URL,
  flagEmojiFromIso2,
} from "@/lib/custom-with-form";
import { CALENDLY_INFLUENCER_ADVISOR_URL } from "@/lib/calendly-scheduling";
import { localizePath } from "@/lib/i18n/config";
import { LocalizedLink } from "@/lib/i18n/localized-link";
import { useLocale } from "@/lib/i18n/locale-context";
import type { GeneralResponse } from "@/utils/response";
import { unstable_rethrow, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import styles from "./custom-with-form-signup.module.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type PhoneCountry = { code: string; dial: string; name: string };

const PHONE_COUNTRIES: PhoneCountry[] = CUSTOM_WITH_FORM_PHONE_COUNTRIES.map(
  ([code, dial, name]) => ({ code, dial, name }),
);

function guessCountryCode(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fromTz = CUSTOM_WITH_FORM_TZ_TO_COUNTRY[tz];
    if (fromTz) return fromTz;
  } catch {
    /* ignore */
  }
  try {
    const langs = navigator.languages?.length
      ? navigator.languages
      : [navigator.language || ""];
    for (const lang of langs) {
      const region = String(lang).split("-")[1]?.toUpperCase();
      if (region && PHONE_COUNTRIES.some((c) => c.code === region)) return region;
    }
  } catch {
    /* ignore */
  }
  return "AE";
}

export function CustomWithFormSignupForm({
  fontClassName,
  landingHref = "/custom-with-form",
  signUp = customWithFormStudentSignUp,
}: {
  fontClassName?: string;
  landingHref?: string;
  signUp?: (formData: FormData) => Promise<GeneralResponse<boolean>>;
}) {
  const { dict, locale } = useLocale();
  const router = useRouter();
  const copy = dict.customWithFormSignup;
  const isLtr = locale !== "ar";

  const handleCalendlyScheduled = useCallback(() => {
    router.push(localizePath("/student", locale));
  }, [locale, router]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nationality, setNationality] = useState("");
  const [grade, setGrade] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [advisory, setAdvisory] = useState("");
  const [dialCountry, setDialCountry] = useState("AE");
  const [ccOpen, setCcOpen] = useState(false);
  const [ccSearch, setCcSearch] = useState("");
  const [touchedCc, setTouchedCc] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [step, setStep] = useState<"form" | "booking" | "done">("form");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const phoneWrapRef = useRef<HTMLDivElement>(null);

  const nationalityOptions = useMemo(
    () =>
      COUNTRIES.map((country) => ({
        alpha2: country.alpha2,
        name: getLocalizedCountryName(country.alpha2, locale),
      })).sort((a, b) => a.name.localeCompare(b.name, locale === "ar" ? "ar" : "en")),
    [locale],
  );

  const currentDial = PHONE_COUNTRIES.find((c) => c.code === dialCountry) ?? PHONE_COUNTRIES[0]!;
  const filteredDialCountries = useMemo(() => {
    const term = ccSearch.trim().toLowerCase();
    if (!term) return PHONE_COUNTRIES;
    return PHONE_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.dial.replace("+", "").includes(term.replace("+", "")),
    );
  }, [ccSearch]);

  useEffect(() => {
    setDialCountry(guessCountryCode());
  }, []);

  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { country_code?: string } | null) => {
        const code = String(data?.country_code ?? "").toUpperCase();
        if (!code || touchedCc) return;
        if (PHONE_COUNTRIES.some((c) => c.code === code)) setDialCountry(code);
      })
      .catch(() => {});
  }, [touchedCc]);

  useEffect(() => {
    function onMouseDown(event: MouseEvent) {
      if (!ccOpen) return;
      const target = event.target as Node | null;
      if (target && phoneWrapRef.current?.contains(target)) return;
      setCcOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [ccOpen]);

  function setFieldError(name: string, message = "") {
    setErrors((prev) => {
      if (!message) {
        if (!prev[name]) return prev;
        const next = { ...prev };
        delete next[name];
        return next;
      }
      return { ...prev, [name]: message };
    });
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.firstName = copy.required;
    if (!lastName.trim()) next.lastName = copy.required;
    if (!email.trim()) next.email = copy.required;
    else if (!EMAIL_RE.test(email.trim())) next.email = copy.emailInvalid;
    if (!phone.trim()) next.phone = copy.required;
    else if (phone.replace(/[^0-9]/g, "").length < 6) next.phone = copy.phoneInvalid;
    if (!nationality.trim()) next.nationality = copy.pick;
    if (!grade.trim()) next.grade = copy.pick;
    if (!password) next.password = copy.required;
    else if (password.length < 8) next.password = copy.passwordShort;
    if (!confirmPassword) next.confirmPassword = copy.confirmRequired;
    else if (confirmPassword !== password) next.confirmPassword = copy.passwordMismatch;
    if (!advisory.trim()) next.advisory = copy.pick;
    return next;
  }

  function sendWebhook() {
    const gradeLabel =
      grade === "9"
        ? copy.grade9
        : grade === "10"
          ? copy.grade10
          : grade === "11"
            ? copy.grade11
            : grade === "12"
              ? copy.grade12
              : grade === "grad"
                ? copy.gradeGrad
                : grade === "other"
                  ? copy.gradeOther
                  : grade;
    const nationalityName =
      nationalityOptions.find((c) => c.alpha2 === nationality)?.name ?? nationality;
    const lead: Record<string, string> = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
      email: email.trim(),
      phone: `${currentDial.dial} ${phone.trim()}`.trim(),
      dialCode: currentDial.dial,
      nationality: nationalityName,
      nationalityCode: nationality,
      grade: gradeLabel,
      gradeValue: grade,
      advisory: advisory === "yes" ? "نعم" : advisory === "no" ? "لا" : "",
      advisoryValue: advisory,
      feature: CUSTOM_WITH_FORM_FEATURE,
      submittedAt: new Date().toISOString(),
      pageUrl: window.location.href,
    };
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(lead)) body.append(key, value);
    void fetch(CUSTOM_WITH_FORM_WEBHOOK_URL, {
      method: "POST",
      body,
      keepalive: true,
    }).catch(() => {});
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError("");
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("firstName", firstName.trim());
      fd.append("lastName", lastName.trim());
      fd.append("email", email.trim());
      fd.append("nationalityCountryCode", nationality);
      fd.append("phoneNumber", `${currentDial.dial} ${phone.trim()}`.trim());
      fd.append("password", password);
      fd.append("grade", grade);
      fd.append("advisory", advisory);

      const result = await signUp(fd);
      if (result.error) {
        setSubmitError(String(result.error));
        setIsSubmitting(false);
        return;
      }
      sendWebhook();
      setStep(advisory === "yes" ? "booking" : "done");
    } catch (error) {
      unstable_rethrow(error);
      setSubmitError(copy.saving);
    } finally {
      setIsSubmitting(false);
    }
  }

  const ctaLabel = advisory === "yes" ? copy.submitBook : copy.submit;

  return (
    <div className={`${styles.page} ${fontClassName ?? ""}`}>
      <div className={styles.root} data-ltr={isLtr ? "true" : undefined} dir={isLtr ? "ltr" : "rtl"}>
        <LocalizedLink href={landingHref} className={styles.back}>
          {copy.backToLanding}
        </LocalizedLink>
        <div className={styles.card}>
          {step === "done" ? (
            <div className={styles.done}>
              <div className={styles.disc}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="#2d6a4f"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>{copy.doneTitle}</h3>
              <p>{copy.doneBody}</p>
              <a href="/student" className={styles.portalLink}>
                {copy.goToPortal}
              </a>
            </div>
          ) : null}

          {step === "booking" ? (
            <div>
              <h2 className={styles.title}>{copy.bookingTitle}</h2>
              <p className={styles.lede}>{copy.bookingLede}</p>
              <div className={styles.cal}>
                <CalendlyInlineEmbed
                  url={CALENDLY_INFLUENCER_ADVISOR_URL}
                  title={copy.calendlyTitle}
                  prefill={{
                    name: `${firstName.trim()} ${lastName.trim()}`.trim(),
                    email: email.trim(),
                  }}
                  className="h-full min-h-[700px] w-full border-0 bg-white"
                  onEventScheduled={handleCalendlyScheduled}
                />
              </div>
              <a href="/student" className={styles.portalLink}>
                {copy.goToPortal}
              </a>
            </div>
          ) : null}

          {step === "form" ? (
            <form onSubmit={(event) => void handleSubmit(event)} noValidate>
              <h2 className={styles.title}>{copy.title}</h2>
              <p className={styles.lede}>{copy.lede}</p>
              {submitError ? <p className={styles.submitError}>{submitError}</p> : null}
              <div className={styles.grid}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="uvf-firstName">
                    {copy.firstName}
                    <span className={styles.req}>*</span>
                  </label>
                  <input
                    className={`${styles.input} ${errors.firstName ? styles.bad : ""}`}
                    id="uvf-firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    placeholder={copy.firstName}
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      setFieldError("firstName");
                    }}
                  />
                  {errors.firstName ? <div className={styles.err}>{errors.firstName}</div> : null}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="uvf-lastName">
                    {copy.lastName}
                    <span className={styles.req}>*</span>
                  </label>
                  <input
                    className={`${styles.input} ${errors.lastName ? styles.bad : ""}`}
                    id="uvf-lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    placeholder={copy.lastName}
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      setFieldError("lastName");
                    }}
                  />
                  {errors.lastName ? <div className={styles.err}>{errors.lastName}</div> : null}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="uvf-email">
                    {copy.email}
                    <span className={styles.req}>*</span>
                  </label>
                  <input
                    className={`${styles.input} ${errors.email ? styles.bad : ""}`}
                    id="uvf-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    dir="ltr"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFieldError("email");
                    }}
                  />
                  {errors.email ? <div className={styles.err}>{errors.email}</div> : null}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="uvf-phone">
                    {copy.phone}
                    <span className={styles.req}>*</span>
                  </label>
                  <div
                    ref={phoneWrapRef}
                    className={`${styles.phone} ${errors.phone ? styles.bad : ""}`}
                  >
                    <button
                      type="button"
                      className={styles.ccbtn}
                      aria-label={copy.countryAria}
                      onClick={() => {
                        setCcOpen((open) => !open);
                        setCcSearch("");
                      }}
                    >
                      <span className={styles.flag}>{flagEmojiFromIso2(currentDial.code)}</span>
                      <span className={styles.car}>▼</span>
                    </button>
                    <span className={styles.div} />
                    <span className={styles.dial}>{currentDial.dial}</span>
                    <input
                      className={styles.tel}
                      id="uvf-phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder={copy.phone}
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setFieldError("phone");
                      }}
                    />
                    <div className={`${styles.panel} ${ccOpen ? styles.panelOpen : ""}`}>
                      <div style={{ padding: 10 }}>
                        <input
                          className={styles.search}
                          type="text"
                          autoComplete="off"
                          spellCheck={false}
                          placeholder={copy.countrySearch}
                          aria-label={copy.countrySearch}
                          value={ccSearch}
                          onChange={(e) => setCcSearch(e.target.value)}
                        />
                      </div>
                      <div className={styles.list}>
                        {filteredDialCountries.length === 0 ? (
                          <div className={styles.empty}>{copy.noResults}</div>
                        ) : (
                          filteredDialCountries.map((country) => (
                            <button
                              type="button"
                              key={country.code}
                              className={styles.row}
                              onClick={() => {
                                setDialCountry(country.code);
                                setTouchedCc(true);
                                setCcOpen(false);
                              }}
                            >
                              <span className={styles.flag}>{flagEmojiFromIso2(country.code)}</span>
                              <span className={styles.nm}>{country.name}</span>
                              <span className={styles.dl}>{country.dial}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  {errors.phone ? <div className={styles.err}>{errors.phone}</div> : null}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="uvf-nationality">
                    {copy.nationality}
                    <span className={styles.req}>*</span>
                  </label>
                  <div className={styles.sel}>
                    <select
                      className={`${styles.input} ${styles.select} ${errors.nationality ? styles.bad : ""}`}
                      id="uvf-nationality"
                      name="nationality"
                      value={nationality}
                      onChange={(e) => {
                        setNationality(e.target.value);
                        setFieldError("nationality");
                      }}
                    >
                      <option value="">{copy.choose}</option>
                      {nationalityOptions.map((country) => (
                        <option key={country.alpha2} value={country.alpha2}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                    <span className={styles.chev}>▼</span>
                  </div>
                  {errors.nationality ? (
                    <div className={styles.err}>{errors.nationality}</div>
                  ) : null}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="uvf-grade">
                    {copy.grade}
                    <span className={styles.req}>*</span>
                  </label>
                  <div className={styles.sel}>
                    <select
                      className={`${styles.input} ${styles.select} ${errors.grade ? styles.bad : ""}`}
                      id="uvf-grade"
                      name="grade"
                      value={grade}
                      onChange={(e) => {
                        setGrade(e.target.value);
                        setFieldError("grade");
                      }}
                    >
                      <option value="">{copy.choose}</option>
                      <option value="9">{copy.grade9}</option>
                      <option value="10">{copy.grade10}</option>
                      <option value="11">{copy.grade11}</option>
                      <option value="12">{copy.grade12}</option>
                      <option value="grad">{copy.gradeGrad}</option>
                      <option value="other">{copy.gradeOther}</option>
                    </select>
                    <span className={styles.chev}>▼</span>
                  </div>
                  {errors.grade ? <div className={styles.err}>{errors.grade}</div> : null}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="uvf-password">
                    {copy.password}
                    <span className={styles.req}>*</span>
                  </label>
                  <input
                    className={`${styles.input} ${errors.password ? styles.bad : ""}`}
                    id="uvf-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    dir="ltr"
                    placeholder={copy.password}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFieldError("password");
                    }}
                  />
                  {errors.password ? <div className={styles.err}>{errors.password}</div> : null}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="uvf-confirmPassword">
                    {copy.confirmPassword}
                    <span className={styles.req}>*</span>
                  </label>
                  <input
                    className={`${styles.input} ${errors.confirmPassword ? styles.bad : ""}`}
                    id="uvf-confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    dir="ltr"
                    placeholder={copy.confirmPassword}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setFieldError("confirmPassword");
                    }}
                  />
                  {errors.confirmPassword ? (
                    <div className={styles.err}>{errors.confirmPassword}</div>
                  ) : null}
                </div>
                <div className={`${styles.field} ${styles.full}`}>
                  <label className={styles.label} htmlFor="uvf-advisory">
                    {copy.advisory}
                    <span className={styles.req}>*</span>
                  </label>
                  <div className={styles.sel}>
                    <select
                      className={`${styles.input} ${styles.select} ${errors.advisory ? styles.bad : ""}`}
                      id="uvf-advisory"
                      name="advisory"
                      value={advisory}
                      onChange={(e) => {
                        setAdvisory(e.target.value);
                        setFieldError("advisory");
                      }}
                    >
                      <option value="">{copy.choose}</option>
                      <option value="yes">{copy.advisoryYes}</option>
                      <option value="no">{copy.advisoryNo}</option>
                    </select>
                    <span className={styles.chev}>▼</span>
                  </div>
                  {errors.advisory ? <div className={styles.err}>{errors.advisory}</div> : null}
                </div>
              </div>
              <button type="submit" className={styles.cta} disabled={isSubmitting}>
                {isSubmitting ? copy.saving : ctaLabel}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

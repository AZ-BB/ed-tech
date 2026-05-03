"use client";

import { logAdvisorSessionsCatalogView } from "@/actions/advisor-sessions";
import type { AdvisorCatalogAdvisor } from "../_lib/advisor-catalog";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const SAVED_KEY = "saved_advisors";

const AVATAR_PALETTE: { bg: string; fg: string }[] = [
  { bg: "#E8F3EC", fg: "#2F5D50" },
  { bg: "#EEF0F4", fg: "#3D4A5C" },
  { bg: "#F5F0E8", fg: "#6B5B3E" },
  { bg: "#E8EFF8", fg: "#3B5998" },
  { bg: "#F3E8EE", fg: "#7A3B5B" },
];

const MENA_ALPHA2 = new Set([
  "AE",
  "SA",
  "KW",
  "BH",
  "QA",
  "OM",
  "YE",
  "IQ",
  "JO",
  "LB",
  "SY",
  "EG",
  "LY",
  "TN",
  "DZ",
  "MA",
  "SD",
  "PS",
  "MR",
  "DJ",
  "KM",
  "SO",
]);

const LANG_OPTIONS = [
  { value: "", label: "Language" },
  { value: "English", label: "English" },
  { value: "Arabic", label: "Arabic" },
] as const;

const BG_OPTIONS = [
  { value: "", label: "Advisor background" },
  { value: "Arab / MENA", label: "Arab / MENA" },
  { value: "International", label: "International" },
] as const;

function initials(first: string, last: string): string {
  const a = first.trim().charAt(0);
  const b = last.trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "?";
}

function paletteForId(id: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 997;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]!;
}

function readSavedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeSavedIds(ids: string[]) {
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

function advisorBackgroundLabel(a: AdvisorCatalogAdvisor): "Arab / MENA" | "International" {
  return MENA_ALPHA2.has(a.nationalityCode) ? "Arab / MENA" : "International";
}

/** `dest` is ISO alpha-2 from `public.countries.id`, matching advisor specialization country codes. */
function matchesDestination(a: AdvisorCatalogAdvisor, dest: string): boolean {
  if (!dest) return true;
  const code = dest.trim().toUpperCase();
  return a.countryCodes.includes(code);
}

function filterAdvisors(
  list: AdvisorCatalogAdvisor[],
  q: string,
  dest: string,
  lang: string,
  bg: string,
): AdvisorCatalogAdvisor[] {
  return list.filter((a) => {
      if (!matchesDestination(a, dest)) return false;
      if (lang && !(a.languages ?? "").toLowerCase().includes(lang.toLowerCase())) return false;
      if (bg && advisorBackgroundLabel(a) !== bg) return false;
      if (q) {
        if (!a.searchBlob.includes(q)) return false;
      }
      return true;
    });
}

type Props = {
  initialAdvisors: AdvisorCatalogAdvisor[];
  /** Rows from `public.countries` (`id` = alpha-2, `name` = display label). */
  catalogCountries: { id: string; name: string }[];
};

export function AdvisorSessionsClient({ initialAdvisors, catalogCountries }: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dest, setDest] = useState("");
  const [lang, setLang] = useState("");
  const [bg, setBg] = useState("");
  const [detail, setDetail] = useState<AdvisorCatalogAdvisor | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    setSavedIds(readSavedIds());
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 200);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    void logAdvisorSessionsCatalogView();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetail(null);
    };
    if (!detail) return;
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [detail]);

  const filtered = useMemo(
    () => filterAdvisors(initialAdvisors, debouncedSearch, dest, lang, bg),
    [initialAdvisors, debouncedSearch, dest, lang, bg],
  );

  const destLabelByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of catalogCountries) {
      m.set(c.id.trim().toUpperCase(), c.name);
    }
    return m;
  }, [catalogCountries]);

  const activeDestLabel = dest ? (destLabelByCode.get(dest.trim().toUpperCase()) ?? dest) : "";

  const anyFilter = Boolean(dest || lang || bg);

  const clearFilters = useCallback(() => {
    setDest("");
    setLang("");
    setBg("");
  }, []);

  const clearOne = useCallback((field: "dest" | "lang" | "bg") => {
    if (field === "dest") setDest("");
    if (field === "lang") setLang("");
    if (field === "bg") setBg("");
  }, []);

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      writeSavedIds(next);
      return next;
    });
  }, []);

  const yrsLabel = (n: number | null) => (n != null && n > 0 ? `${n}+` : "—");

  const baseCountry = (code: string) => getCountryNameByAlpha2(code) ?? code;

  return (
    <div className="mx-auto w-full pb-16">
      <div className="page-header mb-5 px-1">
        <h1 className="font-[family-name:var(--font-dm-serif)] text-[26px] text-[var(--text)] font-bold">
          Book a 1:1 advisor session before you apply
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-[var(--text-light)]">
          Get practical support on your destination, essays, scholarships, and next steps — tailored to your goals and
          profile.
        </p>
      </div>

      <div className="mb-3.5 flex items-center gap-2.5 rounded-2xl border border-[var(--border-light)] bg-white px-[18px] py-3">
        <svg className="shrink-0 text-[var(--text-hint)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          className="min-w-0 flex-1 border-0 bg-transparent font-[family-name:var(--font-dm-sans)] text-sm text-[var(--text)] outline-none placeholder:text-[#c0bdb8]"
          placeholder="Search by name, destination, or expertise (e.g. USA, UK, essays)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search advisors"
        />
        {search ? (
          <button
            type="button"
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--sand)] text-sm text-[var(--text-hint)] transition hover:bg-[var(--border)] hover:text-[var(--text-mid)]"
            onClick={() => setSearch("")}
            aria-label="Clear search"
          >
            ×
          </button>
        ) : null}
      </div>

      <div className="mb-5 overflow-hidden rounded-2xl border border-[var(--border-light)] bg-white">
        <div className="flex flex-wrap items-center gap-2.5 px-5 py-3.5">
          <select
            className={`cursor-pointer appearance-none rounded-[50px] border-[1.5px] border-[var(--border)] bg-white py-2 pl-3.5 pr-7 text-xs text-[var(--text-mid)] transition hover:border-[var(--text-hint)] focus:border-[var(--green-light)] focus:outline-none ${dest ? "border-[var(--green)] font-semibold text-[var(--green)]" : ""}`}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237a7a7a' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
            }}
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            aria-label="Target destination"
          >
            <option value="">Target destination</option>
            {catalogCountries.map((c) => {
              const value = c.id.trim().toUpperCase();
              return (
                <option key={value} value={value}>
                  {c.name}
                </option>
              );
            })}
          </select>
          <select
            className={`cursor-pointer appearance-none rounded-[50px] border-[1.5px] border-[var(--border)] bg-white py-2 pl-3.5 pr-7 text-xs text-[var(--text-mid)] transition hover:border-[var(--text-hint)] focus:border-[var(--green-light)] focus:outline-none ${lang ? "border-[var(--green)] font-semibold text-[var(--green)]" : ""}`}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237a7a7a' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
            }}
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label="Language"
          >
            {LANG_OPTIONS.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className={`cursor-pointer appearance-none rounded-[50px] border-[1.5px] border-[var(--border)] bg-white py-2 pl-3.5 pr-7 text-xs text-[var(--text-mid)] transition hover:border-[var(--text-hint)] focus:border-[var(--green-light)] focus:outline-none ${bg ? "border-[var(--green)] font-semibold text-[var(--green)]" : ""}`}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237a7a7a' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
            }}
            value={bg}
            onChange={(e) => setBg(e.target.value)}
            aria-label="Advisor background"
          >
            {BG_OPTIONS.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {anyFilter ? (
            <button
              type="button"
              className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-[50px] px-3 py-1.5 text-[11px] font-medium text-[var(--text-hint)] transition hover:bg-[var(--green-pale)] hover:text-[var(--green)]"
              onClick={clearFilters}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              Clear all
            </button>
          ) : null}
        </div>
        {anyFilter ? (
          <div className="flex flex-wrap gap-1.5 px-5 pb-2.5">
            {dest ? (
              <span className="inline-flex items-center gap-1.5 rounded-[50px] border border-[#d5e8db] bg-[var(--green-bg)] px-3 py-1 text-[11px] font-medium text-[var(--green)]">
                {activeDestLabel}
                <button
                  type="button"
                  className="cursor-pointer text-[13px] opacity-60 hover:opacity-100"
                  onClick={() => clearOne("dest")}
                  aria-label={`Remove ${activeDestLabel} filter`}
                >
                  ×
                </button>
              </span>
            ) : null}
            {lang ? (
              <span className="inline-flex items-center gap-1.5 rounded-[50px] border border-[#d5e8db] bg-[var(--green-bg)] px-3 py-1 text-[11px] font-medium text-[var(--green)]">
                {lang}
                <button type="button" className="cursor-pointer text-[13px] opacity-60 hover:opacity-100" onClick={() => clearOne("lang")} aria-label={`Remove ${lang} filter`}>
                  ×
                </button>
              </span>
            ) : null}
            {bg ? (
              <span className="inline-flex items-center gap-1.5 rounded-[50px] border border-[#d5e8db] bg-[var(--green-bg)] px-3 py-1 text-[11px] font-medium text-[var(--green)]">
                {bg}
                <button type="button" className="cursor-pointer text-[13px] opacity-60 hover:opacity-100" onClick={() => clearOne("bg")} aria-label={`Remove ${bg} filter`}>
                  ×
                </button>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mb-5 flex flex-wrap gap-2.5">
        <div className="flex cursor-default items-center gap-1.5 rounded-[50px] border-[1.5px] border-[#c8e6d0] bg-[var(--green-pale)] px-[18px] py-2 text-xs font-medium text-[#2F5D50] transition hover:-translate-y-px hover:border-[#a8d5b8] hover:bg-[var(--green-bg)] hover:shadow-[0_2px_8px_rgba(45,106,79,0.08)]">
          <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
            <circle cx="4" cy="4" r="4" fill="#52B788" />
          </svg>
          <strong className="font-bold text-[var(--green-dark)]">{initialAdvisors.length}</strong>
          <span>advisors available</span>
        </div>
        <div className="flex cursor-default items-center gap-1.5 rounded-[50px] border-[1.5px] border-[#c8e6d0] bg-[var(--green-pale)] px-[18px] py-2 text-xs font-medium text-[#2F5D50] transition hover:-translate-y-px hover:border-[#a8d5b8] hover:bg-[var(--green-bg)] hover:shadow-[0_2px_8px_rgba(45,106,79,0.08)]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5" aria-hidden>
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <strong className="font-bold text-[var(--green-dark)]">150+</strong>
          <span>sessions completed</span>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-[var(--border-light)] bg-white px-7 py-6 max-[700px]:px-5">
        <div className="font-[family-name:var(--font-dm-serif)] text-[17px] text-[var(--text)]">
          What you&apos;ll get from your session
        </div>
        <div className="mt-3.5 grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[520px]:grid-cols-1">
          {[
            {
              t: "Clear next steps based on your target destination",
              d: "M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3",
            },
            {
              t: "Personalized advice on applications and essays",
              d: "M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z",
            },
            {
              t: "Guidance on scholarships and deadlines",
              d: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
            },
            {
              t: "A chance to ask specific questions before you apply",
              d: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
            },
          ].map((item) => (
            <div key={item.t} className="flex items-start gap-2.5 text-[12.5px] leading-snug text-[var(--text-mid)]">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--green-bg)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" aria-hidden>
                  <path d={item.d} />
                </svg>
              </div>
              <span>{item.t}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 max-[700px]:grid-cols-1">
        {filtered.map((a) => {
          const pal = paletteForId(a.id);
          const ini = initials(a.firstName, a.lastName);
          const helps = a.helps.length > 0 ? a.helps.slice(0, 5) : (a.tags.length > 0 ? a.tags : ["General admissions guidance"]);
          return (
            <div
              key={a.id}
              role="button"
              tabIndex={0}
              className="cursor-pointer rounded-2xl border border-[var(--border-light)] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[var(--border)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)]"
              onClick={() => setDetail(a)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setDetail(a);
                }
              }}
            >
              <div className="mb-3.5 flex gap-3.5">
                <div
                  className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-base font-bold"
                  style={{ background: pal.bg, color: pal.fg }}
                >
                  {ini}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-[var(--text)]">
                    {a.firstName} {a.lastName}
                  </div>
                  <div className="text-xs text-[var(--text-light)]">{a.title ?? "Advisor"}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1 text-[11px] text-[var(--text-hint)]">
                    <span className="inline-flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      {yrsLabel(a.experienceYears)} years
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M2 12h20" />
                      </svg>
                      Based in {baseCountry(a.nationalityCode)}
                    </span>
                    {a.languages ? (
                      <span className="inline-flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                        </svg>
                        {a.languages}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              {a.description ? (
                <p className="mb-3 line-clamp-2 text-[12.5px] leading-relaxed text-[var(--text-mid)]">{a.description}</p>
              ) : null}
              {a.bestFor ? (
                <div className="mb-2.5 rounded-lg border border-[#e0eddf] bg-[var(--green-pale)] px-3 py-2.5 text-[11.5px] leading-snug text-[var(--text-mid)]">
                  <strong className="mb-0.5 block text-[10.5px] font-semibold uppercase tracking-wide text-[var(--green-dark)]">
                    Best for
                  </strong>
                  {a.bestFor}
                </div>
              ) : null}
              <div className="mb-3 flex flex-wrap gap-1">
                {helps.map((c) => (
                  <span key={c} className="rounded-md border border-[var(--border-light)] bg-white px-2.5 py-0.5 text-[10.5px] text-[var(--text-mid)]">
                    {c}
                  </span>
                ))}
              </div>
              <div className="mb-3.5 flex flex-wrap gap-1.5">
                {a.tags.slice(0, 8).map((t) => (
                  <span key={t} className="rounded-[50px] border border-[var(--border-light)] bg-[var(--sand)] px-3 py-1 text-[10.5px] font-medium text-[var(--text-mid)]">
                    {t}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-[var(--border-light)] pt-3">
                <button
                  type="button"
                  className={`flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-white transition hover:bg-[var(--sand)] ${savedIds.includes(a.id) ? "border-[#d5e8db] bg-[var(--green-bg)] [&_path]:fill-[var(--green)] [&_path]:stroke-[var(--green)]" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSave(a.id);
                  }}
                  aria-label={savedIds.includes(a.id) ? "Remove from saved" : "Save advisor"}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a7a7a" strokeWidth="1.8" aria-hidden>
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
                  </svg>
                </button>
                <Link
                  href={`/student/advisor-sessions/${a.id}/book`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-[50px] bg-[var(--green)] px-5 py-2 text-xs font-semibold !text-white no-underline transition hover:bg-[var(--green-dark)] hover:!text-white [&_svg]:shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  Book session
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" aria-hidden>
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                  </svg>
                </Link>
              </div>
              <p className="mt-2.5 text-center text-[10.5px] text-[var(--text-hint)]">
                Opens booking in a new tab — your details are saved to your advisor session request.
              </p>
            </div>
          );
        })}
      </div>

      <p className="flex items-center justify-center gap-1.5 py-4 text-center text-xs text-[var(--text-hint)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a0a0a0" strokeWidth="1.8" aria-hidden>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        Trusted by students across the Middle East · Book early to secure your preferred time
      </p>

      {filtered.length === 0 ? (
        <div className="py-10 text-center">
          <h3 className="font-[family-name:var(--font-dm-serif)] text-xl text-[var(--text)]">No advisors found</h3>
          <p className="mt-1.5 text-[13px] text-[var(--text-light)]">Try searching by destination, advisor name, or area of support</p>
          <button
            type="button"
            className="mt-4 cursor-pointer rounded-[50px] border-[1.5px] border-[var(--border)] bg-white px-5 py-2 text-xs font-semibold text-[var(--text-mid)] transition hover:border-[var(--green)] hover:text-[var(--green)]"
            onClick={() => {
              setSearch("");
              clearFilters();
            }}
          >
            Clear search
          </button>
        </div>
      ) : null}

      {detail ? (
        <div
          role="presentation"
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/30 px-5 py-10"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetail(null);
          }}
        >
          <div className="relative mx-auto max-w-[620px] rounded-[var(--radius-xl)] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
            <button
              type="button"
              className="absolute right-4 top-4 z-[5] flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-white hover:bg-[var(--sand)]"
              onClick={() => setDetail(null)}
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            {(() => {
              const pal = paletteForId(detail.id);
              const ini = initials(detail.firstName, detail.lastName);
              const dmHelps =
                detail.helps.length > 0
                  ? detail.helps
                  : ["Applications and timelines", "Essays and personal statements", "Scholarships and funding"];
              return (
                <>
                  <div className="flex gap-4 px-7 pb-5 pt-7">
                    <div
                      className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full text-xl font-bold"
                      style={{ background: pal.bg, color: pal.fg }}
                    >
                      {ini}
                    </div>
                    <div className="min-w-0 flex-1 pr-8">
                      <div className="font-[family-name:var(--font-dm-serif)] text-xl text-[var(--text)]">
                        {detail.firstName} {detail.lastName}
                      </div>
                      <div className="text-[13px] text-[var(--text-light)]">{detail.title ?? "Advisor"}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-[50px] border border-[#d5e8db] bg-[var(--green-bg)] px-2.5 py-0.5 text-[10.5px] font-medium text-[var(--green)]">
                          {yrsLabel(detail.experienceYears)} years experience
                        </span>
                        <span className="rounded-[50px] border border-[var(--border-light)] bg-[var(--sand)] px-2.5 py-0.5 text-[10.5px] font-medium text-[var(--text-mid)]">
                          Based in {baseCountry(detail.nationalityCode)}
                        </span>
                        {detail.languages ? (
                          <span className="rounded-[50px] border border-[var(--border-light)] bg-[var(--sand)] px-2.5 py-0.5 text-[10.5px] font-medium text-[var(--text-mid)]">
                            {detail.languages}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="px-7 pb-7">
                    {detail.bestFor || detail.sessionFor ? (
                      <div className="mb-5">
                        <div className="mb-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text)] [&>svg]:opacity-40">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          Who is this session for?
                        </div>
                        <p className="text-[13px] leading-relaxed text-[var(--text-mid)]">{detail.bestFor ?? detail.sessionFor}</p>
                      </div>
                    ) : null}
                    <div className="mb-5">
                      <div className="mb-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text)] [&>svg]:opacity-40">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                          <path d="M22 4L12 14.01l-3-3" />
                        </svg>
                        What you can cover in this session
                      </div>
                      <ul className="flex flex-col gap-2">
                        {dmHelps.map((x) => (
                          <li key={x} className="flex items-start gap-2 text-[12.5px] text-[var(--text-mid)]">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--green)]" />
                            {x}
                          </li>
                        ))}
                        <li className="flex items-start gap-2 text-[12.5px] text-[var(--text-mid)]">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--green)]" />
                          Deadlines and next steps
                        </li>
                      </ul>
                    </div>
                    {detail.about ? (
                      <div className="mb-5">
                        <div className="mb-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text)] [&>svg]:opacity-40">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4M12 8h.01" />
                          </svg>
                          About {detail.firstName}
                        </div>
                        <p className="text-[13px] leading-relaxed text-[var(--text-mid)]">{detail.about}</p>
                      </div>
                    ) : null}
                    <div className="mb-5 rounded-xl border border-[var(--border-light)] bg-[var(--sand)] px-[18px] py-4">
                      <div className="mb-2.5 text-xs font-semibold text-[var(--text)]">How it works</div>
                      <div className="flex flex-col gap-2">
                        {["Tell us about your goals", "Confirm your booking", "Choose a time that works for you"].map((label, i) => (
                          <div key={label} className="flex items-center gap-2.5 text-xs text-[var(--text-mid)]">
                            <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] text-[10px] font-bold text-[var(--green)]">
                              {i + 1}
                            </span>
                            {label}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-center">
                      <Link
                        href={`/student/advisor-sessions/${detail.id}/book`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-[50px] bg-[var(--green)] px-7 py-3 text-[13px] font-semibold !text-white no-underline shadow-[0_2px_10px_rgba(45,106,79,0.2)] transition hover:bg-[var(--green-dark)] hover:!text-white [&_svg]:shrink-0"
                        onClick={() => setDetail(null)}
                      >
                        Book session
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" aria-hidden>
                          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                        </svg>
                      </Link>
                      <p className="mt-2 text-[10.5px] text-[var(--text-hint)]">
                        Opens in a new tab to complete your advisor session request.
                      </p>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : null}
    </div>
  );
}

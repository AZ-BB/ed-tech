"use client";

import { logAmbassadorsCatalogView } from "@/actions/ambassador-sessions";
import type { AmbassadorCatalogEntry } from "../_lib/ambassador-catalog";
import { CountryFlag } from "@/components/country-flag";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AmbassadorProfileModal } from "./ambassador-profile-modal";
import { RequestSpecificAmbassadorCta } from "./request-specific-ambassador-cta";
import {
  RequestSpecificAmbassadorModal,
  type StudentContactDefaults,
} from "./request-specific-ambassador-modal";

const selectChevronStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237a7a7a' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat" as const,
  backgroundPosition: "right 10px center",
};

const AVATAR_PALETTE: { bg: string; fg: string }[] = [
  { bg: "#E8F3EC", fg: "#2F5D50" },
  { bg: "#EEF0F4", fg: "#3D4A5C" },
  { bg: "#F5F0E8", fg: "#6B5B3E" },
  { bg: "#E8EFF8", fg: "#3B5998" },
  { bg: "#F3E8EE", fg: "#7A3B5B" },
];

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

function formatHeadlineSubtitle(a: AmbassadorCatalogEntry): string {
  const status = a.isCurrentStudent ? "Student" : "Graduate";
  const majorPart = a.major?.trim();
  const yearPart = a.isCurrentStudent
    ? null
    : a.graduationYear != null
      ? String(a.graduationYear)
      : a.startYear != null
        ? String(a.startYear)
        : null;

  if (majorPart && yearPart) return `${majorPart} ${status} — ${yearPart}`;
  if (majorPart) return `${majorPart} ${status}`;
  if (yearPart) return `${status} — ${yearPart}`;
  return status;
}

function statusPillLabel(a: AmbassadorCatalogEntry): string {
  if (a.isCurrentStudent) return "Current student";
  const year =
    a.graduationYear != null
      ? String(a.graduationYear)
      : a.startYear != null
        ? String(a.startYear)
        : null;
  return year ? `Graduate — ${year}` : "Graduate";
}

function filterAmbassadors(
  list: AmbassadorCatalogEntry[],
  q: string,
  dest: string,
  nat: string,
  major: string,
  status: string,
): AmbassadorCatalogEntry[] {
  return list.filter((a) => {
    if (dest && a.destinationCode !== dest.trim().toUpperCase()) return false;
    if (nat && a.nationalityCode !== nat.trim().toUpperCase()) return false;
    if (major) {
      const m = (a.major ?? "").toLowerCase();
      if (!m || m !== major.toLowerCase()) return false;
    }
    if (status === "current" && !a.isCurrentStudent) return false;
    if (status === "graduate" && a.isCurrentStudent) return false;
    if (q && !a.searchBlob.includes(q)) return false;
    return true;
  });
}

type Props = {
  initialAmbassadors: AmbassadorCatalogEntry[];
  catalogCountries: { id: string; name: string }[];
  studentDefaults?: StudentContactDefaults;
  openAmbassadorId?: string;
};

export function AmbassadorsClient({
  initialAmbassadors,
  catalogCountries,
  studentDefaults,
  openAmbassadorId,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dest, setDest] = useState("");
  const [nat, setNat] = useState("");
  const [major, setMajor] = useState("");
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState<AmbassadorCatalogEntry | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const deepLinkHandled = useRef(false);

  useEffect(() => {
    if (!openAmbassadorId || deepLinkHandled.current) return;
    deepLinkHandled.current = true;

    const entry = initialAmbassadors.find((a) => a.id === openAmbassadorId);
    if (entry) {
      setDetail(entry);
    } else {
      setToast("Ambassador no longer available in the catalog.");
    }
    router.replace("/student/ambassadors");
  }, [openAmbassadorId, initialAmbassadors, router]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 200);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    void logAmbassadorsCatalogView();
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

  const majorOptions = useMemo(() => {
    const s = new Set<string>();
    for (const a of initialAmbassadors) {
      const m = a.major?.trim();
      if (m) s.add(m);
    }
    return [...s].sort((a, b) => a.localeCompare(b, "en"));
  }, [initialAmbassadors]);

  const filtered = useMemo(
    () => filterAmbassadors(initialAmbassadors, debouncedSearch, dest, nat, major, status),
    [initialAmbassadors, debouncedSearch, dest, nat, major, status],
  );

  const anyFilter = Boolean(dest || nat || major || status);

  const clearFilters = useCallback(() => {
    setDest("");
    setNat("");
    setMajor("");
    setStatus("");
  }, []);

  const stats = useMemo(() => {
    const dc = new Set(initialAmbassadors.map((a) => a.destinationCode)).size;
    const nc = new Set(initialAmbassadors.map((a) => a.nationalityCode)).size;
    const uc = new Set(initialAmbassadors.map((a) => a.displayUniversity)).size;
    return { dc, nc, uc };
  }, [initialAmbassadors]);

  const pillSelect =
    "min-w-0 flex-1 basis-0 cursor-pointer appearance-none rounded-[50px] border-[1.5px] border-[var(--border)] bg-white py-2 pl-3.5 pr-7 text-xs whitespace-nowrap text-[var(--text-mid)] transition hover:border-[var(--text-hint)] focus:border-[var(--green-light)] focus:outline-none";

  return (
    <div className="mx-auto w-full max-w-7xl pb-16">
      {toast ? (
        <div
          role="status"
          className="fixed bottom-8 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-[var(--green-dark)] px-6 py-2.5 text-[12.5px] font-medium text-white shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
        >
          {toast}
        </div>
      ) : null}

      <div className="page-header mb-5 px-4">
        <h1 className="font-[family-name:var(--font-dm-serif)] text-[26px] font-bold text-[var(--text)]">
          Talk to someone who&apos;s been there
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-[var(--text-light)]">
          Connect with students who have already studied at your target university — and learn from their real experience.
        </p>
      </div>

      <div className="mb-3.5 flex items-center gap-2.5 rounded-2xl border border-[var(--border-light)] bg-white px-[18px] py-3">
        <svg className="shrink-0 text-[var(--text-hint)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          className="min-w-0 flex-1 border-0 bg-transparent font-[family-name:var(--font-dm-sans)] text-sm text-[var(--text)] outline-none placeholder:text-[#c0bdb8]"
          placeholder="Search by university, country, or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search ambassadors"
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
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2.5 px-5 py-3.5">
          <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2.5 overflow-x-auto">
          <select
            className={`${pillSelect} ${dest ? "border-[var(--green)] font-semibold text-[var(--green)]" : ""}`}
            style={selectChevronStyle}
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            aria-label="Study destination"
          >
            <option value="">Study destination</option>
            {catalogCountries.map((c) => {
              const v = c.id.trim().toUpperCase();
              return (
                <option key={v} value={v}>
                  {c.name}
                </option>
              );
            })}
          </select>
          <select
            className={`${pillSelect} ${nat ? "border-[var(--green)] font-semibold text-[var(--green)]" : ""}`}
            style={selectChevronStyle}
            value={nat}
            onChange={(e) => setNat(e.target.value)}
            aria-label="Ambassador nationality"
          >
            <option value="">Ambassador nationality</option>
            {catalogCountries.map((c) => {
              const v = c.id.trim().toUpperCase();
              return (
                <option key={`n-${v}`} value={v}>
                  {c.name}
                </option>
              );
            })}
          </select>
          <select
            className={`${pillSelect} ${major ? "border-[var(--green)] font-semibold text-[var(--green)]" : ""}`}
            style={selectChevronStyle}
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            aria-label="Field of study"
          >
            <option value="">Field of study</option>
            {majorOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            className={`${pillSelect} ${status ? "border-[var(--green)] font-semibold text-[var(--green)]" : ""}`}
            style={selectChevronStyle}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Status"
          >
            <option value="">Status</option>
            <option value="current">Current student</option>
            <option value="graduate">Graduate</option>
          </select>
          </div>
          {anyFilter ? (
            <button
              type="button"
              className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-[50px] px-3 py-1.5 text-[11px] font-medium text-[var(--text-hint)] transition hover:bg-[var(--green-pale)] hover:text-[var(--green)]"
              onClick={clearFilters}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5 rounded-[50px] border border-[var(--border-light)] bg-white px-4 py-2 text-xs font-medium text-[var(--text-mid)]">
          <strong className="text-[var(--green)]">{stats.dc}+</strong>
          <span>countries covered</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-[50px] border border-[var(--border-light)] bg-white px-4 py-2 text-xs font-medium text-[var(--text-mid)]">
          <strong className="text-[var(--green)]">{stats.nc}+</strong>
          <span>nationalities represented</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-[50px] border border-[var(--border-light)] bg-white px-4 py-2 text-xs font-medium text-[var(--text-mid)]">
          <strong className="text-[var(--green)]">{stats.uc}+</strong>
          <span>universities represented</span>
        </div>
      </div>

      <RequestSpecificAmbassadorCta onOpen={() => setRequestOpen(true)} />

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {filtered.map((a) => {
          const pal = paletteForId(a.id);
          const ini = initials(a.firstName, a.lastName);
          return (
            <div
              key={a.id}
              role="button"
              tabIndex={0}
              className="flex h-full cursor-pointer flex-col rounded-2xl border border-[var(--border-light)] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[var(--border)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)]"
              onClick={() => setDetail(a)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setDetail(a);
                }
              }}
            >
              <div className="mb-3 flex gap-3.5">
                <div
                  className="flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-full text-base font-bold"
                  style={{ background: pal.bg, color: pal.fg }}
                >
                  {a.avatarUrl ? (
                    <img src={a.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    ini
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-[var(--text)]">
                    {a.firstName} {a.lastName}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-[var(--text-mid)]">
                    <CountryFlag code={a.destinationCode} size={18} />
                    <span className="truncate">{a.displayUniversity}</span>
                  </div>
                  <p className="mt-1 text-[12px] text-[var(--text-light)]">{formatHeadlineSubtitle(a)}</p>
                </div>
              </div>
              {a.about ? (
                <p className="mb-3 line-clamp-2 text-[12.5px] leading-relaxed text-[var(--text-mid)]">{a.about}</p>
              ) : null}
              {a.tags.length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {a.tags.slice(0, 6).map((t) => (
                    <span
                      key={t}
                      className="rounded-[50px] border border-[var(--border-light)] bg-[var(--sand)] px-3 py-1 text-[10.5px] font-medium text-[var(--text-mid)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-auto pt-3">
                <div className="flex items-center justify-between border-t border-[var(--border-light)] pt-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-[50px] px-3 py-1 text-[10.5px] font-medium ${
                      a.isCurrentStudent ? "bg-[var(--green-bg)] text-[var(--green)]" : "border border-[var(--border-light)] bg-[var(--sand)] text-[var(--text-mid)]"
                    }`}
                  >
                    {statusPillLabel(a)}
                  </span>
                  <Link
                    href={`/student/ambassadors/${a.id}/book`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-[50px] bg-[var(--green)] px-5 py-2 text-xs font-semibold !text-white no-underline transition hover:bg-[var(--green-dark)] hover:!text-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Book a call
                  </Link>
                </div>
                <p className="mt-2 text-center text-[10px] leading-snug text-[var(--text-hint)]">
                  Submit a booking request and we&apos;ll confirm your session within 24 hours.
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <h3 className="font-[family-name:var(--font-dm-serif)] text-xl text-[var(--text)]">No ambassadors found</h3>
          <p className="mt-2 text-[13px] text-[var(--text-light)]">Try adjusting filters or search by university or country.</p>
          <button
            type="button"
            className="mt-4 cursor-pointer rounded-[50px] border-[1.5px] border-[var(--border)] bg-white px-5 py-2 text-xs font-semibold text-[var(--text-mid)] transition hover:border-[var(--green)] hover:text-[var(--green)]"
            onClick={() => {
              setSearch("");
              clearFilters();
            }}
          >
            Clear search & filters
          </button>
        </div>
      ) : null}

      {detail ? (
        <AmbassadorProfileModal ambassador={detail} onClose={() => setDetail(null)} />
      ) : null}

      <RequestSpecificAmbassadorModal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        studentDefaults={studentDefaults}
      />
    </div>
  );
}

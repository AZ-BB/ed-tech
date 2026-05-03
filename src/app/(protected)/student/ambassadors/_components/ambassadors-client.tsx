"use client";

import { logAmbassadorsCatalogView } from "@/actions/ambassador-sessions";
import type { AmbassadorCatalogEntry } from "../_lib/ambassador-catalog";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

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
};

export function AmbassadorsClient({ initialAmbassadors, catalogCountries }: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dest, setDest] = useState("");
  const [nat, setNat] = useState("");
  const [major, setMajor] = useState("");
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState<AmbassadorCatalogEntry | null>(null);

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

  const clearOne = useCallback((field: "dest" | "nat" | "major" | "status") => {
    if (field === "dest") setDest("");
    if (field === "nat") setNat("");
    if (field === "major") setMajor("");
    if (field === "status") setStatus("");
  }, []);

  const destLabelByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of catalogCountries) {
      m.set(c.id.trim().toUpperCase(), c.name);
    }
    return m;
  }, [catalogCountries]);

  const activeDestLabel = dest ? (destLabelByCode.get(dest.trim().toUpperCase()) ?? dest) : "";
  const activeNatLabel = nat ? (destLabelByCode.get(nat.trim().toUpperCase()) ?? nat) : "";

  const stats = useMemo(() => {
    const dc = new Set(initialAmbassadors.map((a) => a.destinationCode)).size;
    const nc = new Set(initialAmbassadors.map((a) => a.nationalityCode)).size;
    const uc = new Set(initialAmbassadors.map((a) => a.displayUniversity)).size;
    return { dc, nc, uc };
  }, [initialAmbassadors]);

  const pillSelect =
    "cursor-pointer appearance-none rounded-[50px] border-[1.5px] border-[var(--border)] bg-white py-2 pl-3.5 pr-7 text-xs text-[var(--text-mid)] transition hover:border-[var(--text-hint)] focus:border-[var(--green-light)] focus:outline-none";

  return (
    <div className="mx-auto w-full pb-16">
      

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
        <div className="flex flex-wrap items-center gap-2.5 px-5 py-3.5">
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
          {anyFilter ? (
            <button
              type="button"
              className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-[50px] px-3 py-1.5 text-[11px] font-medium text-[var(--text-hint)] transition hover:bg-[var(--green-pale)] hover:text-[var(--green)]"
              onClick={clearFilters}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              Clear filters
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
                  aria-label="Remove destination filter"
                >
                  ×
                </button>
              </span>
            ) : null}
            {nat ? (
              <span className="inline-flex items-center gap-1.5 rounded-[50px] border border-[#d5e8db] bg-[var(--green-bg)] px-3 py-1 text-[11px] font-medium text-[var(--green)]">
                {activeNatLabel}
                <button
                  type="button"
                  className="cursor-pointer text-[13px] opacity-60 hover:opacity-100"
                  onClick={() => clearOne("nat")}
                  aria-label="Remove nationality filter"
                >
                  ×
                </button>
              </span>
            ) : null}
            {major ? (
              <span className="inline-flex items-center gap-1.5 rounded-[50px] border border-[#d5e8db] bg-[var(--green-bg)] px-3 py-1 text-[11px] font-medium text-[var(--green)]">
                {major}
                <button
                  type="button"
                  className="cursor-pointer text-[13px] opacity-60 hover:opacity-100"
                  onClick={() => clearOne("major")}
                  aria-label="Remove field of study filter"
                >
                  ×
                </button>
              </span>
            ) : null}
            {status ? (
              <span className="inline-flex items-center gap-1.5 rounded-[50px] border border-[#d5e8db] bg-[var(--green-bg)] px-3 py-1 text-[11px] font-medium text-[var(--green)]">
                {status === "current" ? "Current student" : "Graduate"}
                <button
                  type="button"
                  className="cursor-pointer text-[13px] opacity-60 hover:opacity-100"
                  onClick={() => clearOne("status")}
                  aria-label="Remove status filter"
                >
                  ×
                </button>
              </span>
            ) : null}
          </div>
        ) : null}
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

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {filtered.map((a) => {
          const pal = paletteForId(a.id);
          const ini = initials(a.firstName, a.lastName);
          const destLabel = getCountryNameByAlpha2(a.destinationCode) ?? a.destinationCode;
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
                  <div className="mt-0.5 flex items-center gap-1 text-[13px] text-[var(--text-mid)]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                    </svg>
                    <span className="truncate">{a.displayUniversity}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[var(--text-light)]">
                    <span>{destLabel}</span>
                    {a.major ? <span>· {a.major}</span> : null}
                  </div>
                </div>
              </div>
              {a.about ? (
                <p className="mb-3 line-clamp-2 text-[12.5px] leading-relaxed text-[var(--text-mid)]">{a.about}</p>
              ) : null}
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
              <div className="flex items-center justify-between border-t border-[var(--border-light)] pt-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-0.5 text-[10px] font-semibold ${
                    a.isCurrentStudent ? "bg-[var(--green-bg)] text-[var(--green)]" : "border border-[var(--border-light)] bg-[var(--sand)] text-[var(--text-mid)]"
                  }`}
                >
                  {a.isCurrentStudent ? "Current student" : "Graduate"}
                </span>
                <Link
                  href={`/student/ambassadors/${a.id}/book`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-[50px] bg-[var(--green)] px-4 py-2 text-xs font-semibold !text-white no-underline transition hover:bg-[var(--green-dark)] hover:!text-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  Book session
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" aria-hidden>
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                  </svg>
                </Link>
              </div>
              <p className="mt-2 text-center text-[10px] leading-snug text-[var(--text-hint)]">
                Opens booking in a new tab — your request is saved to ambassador sessions.
              </p>
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
        <div
          role="presentation"
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/30 px-5 py-10"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetail(null);
          }}
        >
          <div className="relative mx-auto max-w-[600px] rounded-[var(--radius-xl)] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
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
              const helps =
                detail.helps.length > 0
                  ? detail.helps
                  : ["Campus life and culture", "Application experience", "Scholarships and housing"];
              return (
                <>
                  <div className="flex gap-4 rounded-t-[var(--radius-xl)] bg-[var(--green-pale)] px-7 pb-5 pt-7">
                    <div
                      className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-white text-xl font-bold shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                      style={{ background: pal.bg, color: pal.fg }}
                    >
                      {detail.avatarUrl ? (
                        <img src={detail.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        ini
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pr-8">
                      <div className="font-[family-name:var(--font-dm-serif)] text-xl text-[var(--text)]">
                        {detail.firstName} {detail.lastName}
                      </div>
                      <div className="text-[13px] text-[var(--text-mid)]">{detail.displayUniversity}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[12px] text-[var(--text-light)]">
                        <span>{getCountryNameByAlpha2(detail.destinationCode) ?? detail.destinationCode}</span>
                        {detail.major ? <span>· {detail.major}</span> : null}
                        <span>· {detail.isCurrentStudent ? "Current student" : "Graduate"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="px-7 pb-2 pt-6">
                    {detail.about ? (
                      <div className="mb-5">
                        <div className="mb-2.5 text-[13px] font-semibold text-[var(--text)]">About</div>
                        <p className="text-[13px] leading-relaxed text-[var(--text-mid)]">{detail.about}</p>
                      </div>
                    ) : null}
                    <div className="mb-6">
                      <div className="mb-2.5 text-[13px] font-semibold text-[var(--text)]">Can help with</div>
                      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {helps.map((x) => (
                          <li key={x} className="flex items-center gap-2 text-[12.5px] text-[var(--text-mid)]">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--green)]" />
                            {x}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="px-7 pb-7 text-center">
                    <Link
                      href={`/student/ambassadors/${detail.id}/book`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-[50px] bg-[var(--green)] px-7 py-3 text-[13px] font-semibold !text-white no-underline shadow-[0_2px_10px_rgba(45,106,79,0.2)] transition hover:bg-[var(--green-dark)] hover:!text-white"
                      onClick={() => setDetail(null)}
                    >
                      Book a session
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" aria-hidden>
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                      </svg>
                    </Link>
                    <p className="mt-2 text-[10.5px] leading-snug text-[var(--text-hint)]">Opens in a new tab</p>
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

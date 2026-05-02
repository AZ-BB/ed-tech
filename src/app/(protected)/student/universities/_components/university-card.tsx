"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";

/** Slim row shape for the card — only fields the UI reads. */
export type UniversityCardUniversity = {
    id: string;
    name: string;
    city: string;
    state: string | null;
    country_code: string;
    country_name: string;
    is_public: boolean;
    description: string | null;
    logo_url: string | null;
    tuition_per_year: number | null;
    deadline_date: string | null;
    is_priority: boolean;
    ielts_min_score: number | null;
    sat_policy: string | null;
    acceptance_rate: number | null;
};

const tuitionFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
});

function formatTuition(value: number | null): string {
    if (value == null || Number.isNaN(value)) return "—";
    return `${tuitionFormatter.format(value)}/yr`;
}

function formatDeadline(iso: string | null, isPriority: boolean): string {
    if (!iso) return "—";
    const d = new Date(iso + (iso.includes("T") ? "" : "T12:00:00"));
    if (Number.isNaN(d.getTime())) return "—";
    const base = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
    return isPriority ? `${base} (priority)` : base;
}

function formatAcceptance(rate: number | null): string {
    if (rate == null) return "—";
    return `~${rate}%`;
}

function acceptanceTone(rate: number | null): string {
    if (rate == null) return "text-[#1a1a1a]";
    if (rate < 40) return "text-[#C0392B]";
    if (rate < 70) return "text-[#E65100]";
    return "text-[#2D6A4F]";
}

function formatLocation(u: UniversityCardUniversity): string {
    const country = u.country_name || u.country_code;
    if (u.state) return `${u.city}, ${u.state}, ${country}`;
    return `${u.city}, ${country}`;
}

function formatIelts(score: number | null): string {
    if (score == null) return "—";
    return Number.isInteger(score) ? String(score) : String(score);
}

function CrestSvg() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2D6A4F"
            strokeWidth="1.8"
            aria-hidden
        >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
        </svg>
    );
}

function UniversityCrest({ logoUrl }: { logoUrl: string | null }) {
    const [broken, setBroken] = useState(false);
    const showImg = Boolean(logoUrl && !broken);

    return (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#ece9e4] bg-[#E8F5EE] p-1.5">
            {showImg && logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote logos; domains vary
                <img
                    src={logoUrl}
                    alt=""
                    className="h-full w-full object-contain"
                    onError={() => setBroken(true)}
                />
            ) : (
                <CrestSvg />
            )}
        </div>
    );
}

function IconTuition() {
    return (
        <svg
            width="9"
            height="9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
        >
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
    );
}

function IconCalendar() {
    return (
        <svg
            width="9"
            height="9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
        >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
    );
}

function IconStar() {
    return (
        <svg
            width="9"
            height="9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
        >
            <path d="M12 2l3 6.5L22 9l-5 4.9L18.2 21 12 17.3 5.8 21 7 13.9 2 9l7-0.5z" />
        </svg>
    );
}

function TagIconChat() {
    return (
        <svg
            width="8"
            height="8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden
        >
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
    );
}

function TagIconShield() {
    return (
        <svg
            width="8"
            height="8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden
        >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    );
}

function Stat({
    label,
    icon,
    value,
    valueClassName,
}: {
    label: string;
    icon: ReactNode;
    value: string;
    valueClassName?: string;
}) {
    return (
        <div className="flex min-h-9 flex-1 flex-col items-center justify-center px-1 py-0.5 text-center [&:not(:last-child)]:border-r [&:not(:last-child)]:border-[#ece9e4]">
            <div className="mb-0.5 flex items-center justify-center gap-0.5 text-[9.5px] font-medium tracking-[0.3px] text-[#a0a0a0] uppercase">
                {icon}
                {label}
            </div>
            <div
                className={`text-[11.5px] leading-tight font-semibold ${valueClassName ?? "text-[#1a1a1a]"}`}
            >
                {value}
            </div>
        </div>
    );
}

export function UniversityCard({ university: u }: { university: UniversityCardUniversity }) {
    const desc = u.description?.trim() || "";

    return (
        <article
            className="flex h-full cursor-pointer flex-col rounded-[16px] border border-[#ece9e4] bg-white p-6 transition-all hover:-translate-y-[3px] hover:border-[#e0deda] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)]"
            aria-labelledby={`uni-${u.id}-title`}
        >
            <div className="mb-3 flex items-start gap-3">
                <UniversityCrest logoUrl={u.logo_url} />
                <div className="min-w-0 flex-1">
                    <h2
                        id={`uni-${u.id}-title`}
                        className="serif mb-0.5 text-[15px] leading-snug font-bold text-[#1a1a1a]"
                    >
                        {u.name}
                    </h2>
                    <p className="text-[11.5px] text-[#7a7a7a]">{formatLocation(u)}</p>
                </div>
                <span className="mt-0.5 shrink-0 self-start rounded-[50px] border border-[#ece9e4] bg-[#f4f3f0] px-3 py-1 text-[10px] font-semibold tracking-[0.2px] text-[#4a4a4a] whitespace-nowrap">
                    {u.is_public ? "Public" : "Private"}
                </span>
            </div>

            <p className="mb-4 line-clamp-2 min-h-[38px] text-xs leading-relaxed text-[#7a7a7a]">
                {desc || "\u00A0"}
            </p>

            <div className="mb-3 flex border-y border-[#ece9e4] py-2.5">
                <Stat
                    label="Tuition"
                    icon={<IconTuition />}
                    value={formatTuition(u.tuition_per_year)}
                />
                <Stat
                    label="Deadline"
                    icon={<IconCalendar />}
                    value={formatDeadline(u.deadline_date, u.is_priority)}
                />
                <Stat
                    label="Acceptance"
                    icon={<IconStar />}
                    value={formatAcceptance(u.acceptance_rate)}
                    valueClassName={acceptanceTone(u.acceptance_rate)}
                />
            </div>

            <div className="mb-4 flex flex-wrap gap-1.5">
                <span className="flex items-center gap-1 rounded-[50px] border border-[#ece9e4] bg-[#f4f3f0] px-2.5 py-1 text-[10px] font-medium text-[#4a4a4a]">
                    <TagIconChat />
                    IELTS: {formatIelts(u.ielts_min_score)}
                </span>
                <span className="flex items-center gap-1 rounded-[50px] border border-[#ece9e4] bg-[#f4f3f0] px-2.5 py-1 text-[10px] font-medium text-[#4a4a4a]">
                    <TagIconShield />
                    SAT: {u.sat_policy?.trim() || "—"}
                </span>
            </div>

            <footer className="mt-auto flex items-center justify-end gap-2 border-t border-[#ece9e4] pt-4">
                <button
                    type="button"
                    className="cursor-pointer rounded-[50px] border-[1.5px] border-[#e0deda] bg-white px-4 py-2 text-[11px] font-medium text-[#4a4a4a] transition-colors hover:border-[#2D6A4F] hover:bg-[#f0f7f2] hover:text-[#2D6A4F]"
                    onClick={(e) => e.stopPropagation()}
                >
                    Add to shortlist
                </button>
                <Link
                    href={`/student/universities/${u.id}`}
                    className="inline-flex cursor-pointer items-center justify-center rounded-[50px] border-0 bg-[#2D6A4F] px-5 py-2 text-[11px] !font-semibold !text-white no-underline transition-colors hover:bg-[#1B4332]"
                    onClick={(e) => e.stopPropagation()}
                >
                    View details
                </Link>
            </footer>
        </article>
    );
}

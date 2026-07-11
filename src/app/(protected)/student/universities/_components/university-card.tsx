"use client";

import { addUniversityToFavourites, addUniversityToShortlist, removeUniversityFromFavourites, removeUniversityFromShortlist } from "@/actions/universities";
import { useLocale } from "@/lib/i18n/locale-context";
import { tuitionCardLabel } from "@/lib/university-cost-display";
import Link from "next/link";
import { UniversityLocation } from "./university-location";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useOptimistic, useState, useTransition } from "react";

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
    tuition_display: string | null;
    deadline_date: string | null;
    is_priority: boolean;
    ielts_min_score: number | null;
    sat_policy: string | null;
    acceptance_rate: number | null;
    /** True when the logged-in student has a `student_activities` row with type `shortlist` for this university. */
    is_shortlisted: boolean;
    /** True when the student has a `student_activities` row with type `save` (favourite) for this university. */
    is_favourite: boolean;
};

function formatDeadline(
    iso: string | null,
    isPriority: boolean,
    emDash: string,
    prioritySuffix: string,
): string {
    if (!iso) return emDash;
    const d = new Date(iso + (iso.includes("T") ? "" : "T12:00:00"));
    if (Number.isNaN(d.getTime())) return emDash;
    const base = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
    return isPriority ? `${base} ${prioritySuffix}` : base;
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

function IconStarOutline() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 2l3 6.5L22 9l-5 4.9L18.2 21 12 17.3 5.8 21 7 13.9 2 9l7-0.5z" />
        </svg>
    );
}

function IconStarFilled() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.2" aria-hidden>
            <path d="M12 2l3 6.5L22 9l-5 4.9L18.2 21 12 17.3 5.8 21 7 13.9 2 9l7-0.5z" />
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
        <div className="flex min-h-9 min-w-0 flex-1 flex-col items-center justify-center px-0.5 py-0.5 text-center sm:px-1 [&:not(:last-child)]:border-r [&:not(:last-child)]:border-[#ece9e4]">
            <div className="mb-0.5 flex items-center justify-center gap-0.5 text-[8.5px] font-medium tracking-[0.3px] text-[#a0a0a0] uppercase sm:text-[9.5px]">
                {icon}
                {label}
            </div>
            <div
                className={`text-[10.5px] leading-tight font-semibold break-words sm:text-[11.5px] ${valueClassName ?? "text-[#1a1a1a]"}`}
            >
                {value}
            </div>
        </div>
    );
}

export function UniversityCard({ university: u }: { university: UniversityCardUniversity }) {
    const { dict } = useLocale();
    const t = dict.student.universities;
    const desc = u.description?.trim() || "";
    const router = useRouter();
    const [, startTransition] = useTransition();
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [optimisticListed, setOptimisticListed] = useOptimistic(
        u.is_shortlisted,
        (_current, next: boolean) => next,
    );
    const [optimisticFavourite, setOptimisticFavourite] = useOptimistic(
        u.is_favourite,
        (_current, next: boolean) => next,
    );

    const flushMessage = () => setActionMessage(null);

    const addFavourite = () => {
        flushMessage();
        startTransition(async () => {
            setOptimisticFavourite(true);
            const res = await addUniversityToFavourites(u.id);
            if (res.error) {
                const msg = typeof res.error === "string" ? res.error : t.somethingWentWrong;
                setActionMessage(msg);
                throw new Error(msg);
            }
            router.refresh();
        });
    };

    const removeFavourite = () => {
        flushMessage();
        startTransition(async () => {
            setOptimisticFavourite(false);
            const res = await removeUniversityFromFavourites(u.id);
            if (res.error) {
                const msg = typeof res.error === "string" ? res.error : t.somethingWentWrong;
                setActionMessage(msg);
                throw new Error(msg);
            }
            router.refresh();
        });
    };

    const addShortlist = () => {
        flushMessage();
        startTransition(async () => {
            setOptimisticListed(true);
            const res = await addUniversityToShortlist(u.id);
            if (res.error) {
                const msg = typeof res.error === "string" ? res.error : t.somethingWentWrong;
                setActionMessage(msg);
                throw new Error(msg);
            }
            router.refresh();
        });
    };

    const removeShortlist = () => {
        flushMessage();
        startTransition(async () => {
            setOptimisticListed(false);
            const res = await removeUniversityFromShortlist(u.id);
            if (res.error) {
                const msg = typeof res.error === "string" ? res.error : t.somethingWentWrong;
                setActionMessage(msg);
                throw new Error(msg);
            }
            router.refresh();
        });
    };

    const detailHref = `/student/universities/${u.id}`;

    return (
        <article
            dir="ltr"
            className="university-card-ltr relative flex h-full flex-col rounded-[16px] border border-[#ece9e4] bg-white p-4 text-left transition-all hover:-translate-y-[3px] hover:border-[#e0deda] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] sm:p-6"
        >
            <Link
                href={detailHref}
                className="absolute inset-0 z-0 cursor-pointer rounded-[16px] outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2"
                aria-labelledby={`uni-${u.id}-title`}
            />
            <div className="relative z-10 flex min-h-0 flex-1 flex-col pointer-events-none">
            <div className="mb-3 flex flex-wrap items-start gap-x-3 gap-y-2">
                <UniversityCrest logoUrl={u.logo_url} />
                <div className="min-w-0 flex-1 basis-[calc(100%-3.75rem)] sm:basis-auto">
                    <h2
                        id={`uni-${u.id}-title`}
                        className="serif mb-0.5 text-[15px] leading-snug font-bold text-[#1a1a1a] break-words"
                    >
                        {u.name}
                    </h2>
                    <p className="text-[11.5px] text-[#7a7a7a] break-words">
                        <UniversityLocation
                            city={u.city}
                            state={u.state}
                            countryName={u.country_name}
                            countryCode={u.country_code}
                            flagSize={16}
                        />
                    </p>
                </div>
                <div className="shrink-0">
                    <span className="inline-block rounded-[50px] border border-[#ece9e4] bg-[#f4f3f0] px-3 py-1 text-[10px] font-semibold tracking-[0.2px] text-[#4a4a4a] whitespace-nowrap">
                        {u.is_public ? t.public : t.private}
                    </span>
                </div>
            </div>

            <p className="mb-4 line-clamp-2 min-h-[38px] text-xs leading-relaxed text-[#7a7a7a]">
                {desc || "\u00A0"}
            </p>

            <div className="mb-3 flex border-y border-[#ece9e4] py-2.5">
                <Stat
                    label={t.tuition}
                    icon={<IconTuition />}
                    value={tuitionCardLabel(u.tuition_display, u.tuition_per_year)}
                />
                <Stat
                    label={t.deadline}
                    icon={<IconCalendar />}
                    value={formatDeadline(u.deadline_date, u.is_priority, t.emDash, t.prioritySuffix)}
                />
                <Stat
                    label={t.acceptance}
                    icon={<IconStar />}
                    value={formatAcceptance(u.acceptance_rate)}
                    valueClassName={acceptanceTone(u.acceptance_rate)}
                />
            </div>

            <div className="mb-4 flex flex-wrap gap-1.5">
                <span className="flex items-center gap-1 rounded-[50px] border border-[#ece9e4] bg-[#f4f3f0] px-2.5 py-1 text-[10px] font-medium text-[#4a4a4a]">
                    <TagIconChat />
                    {t.ielts}: {formatIelts(u.ielts_min_score)}
                </span>
                <span className="flex items-center gap-1 rounded-[50px] border border-[#ece9e4] bg-[#f4f3f0] px-2.5 py-1 text-[10px] font-medium text-[#4a4a4a]">
                    <TagIconShield />
                    {t.sat}: {u.sat_policy?.trim() || t.emDash}
                </span>
            </div>

            {actionMessage ? (
                <p className="mb-3 text-[11px] leading-snug text-[#C0392B]" role="status">
                    {actionMessage}
                </p>
            ) : null}

            <footer className="relative z-10 mt-auto flex flex-col gap-2 border-t border-[#ece9e4] pt-4 pointer-events-none sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center">
                {optimisticFavourite ? (
                    <button
                        type="button"
                        aria-label={t.removeFromFavourites}
                        title={t.removeFromFavourites}
                        className="pointer-events-auto inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[50px] border-[1.5px] border-[#c9a227] bg-[#fffbeb] text-[#b8860b] transition-colors hover:border-[#942e2e] hover:bg-[#fdecea] hover:text-[#942e2e]"
                        onClick={(e) => {
                            e.preventDefault();
                            removeFavourite();
                        }}
                    >
                        <IconStarFilled />
                    </button>
                ) : (
                    <button
                        type="button"
                        aria-label={t.addToFavourites}
                        title={t.addToFavourites}
                        className="pointer-events-auto inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[50px] border-[1.5px] border-[#e0deda] bg-white text-[#7a7a7a] transition-colors hover:border-[#c9a227] hover:bg-[#fffbeb] hover:text-[#b8860b]"
                        onClick={(e) => {
                            e.preventDefault();
                            addFavourite();
                        }}
                    >
                        <IconStarOutline />
                    </button>
                )}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                {optimisticListed ? (
                    <button
                        type="button"
                        aria-label={t.removeFromShortlist}
                        title={t.removeFromShortlistTitle}
                        className="pointer-events-auto inline-flex min-h-9 shrink-0 cursor-pointer items-center justify-center rounded-[50px] border-[1.5px] border-[#b7dcc6] bg-[#f0faf3] px-4 py-2 text-[11px] font-medium text-[#2D6A4F] transition-colors hover:border-[#c0392ba6] hover:bg-[#fdecea] hover:text-[#942e2e]"
                        onClick={(e) => {
                            e.preventDefault();
                            removeShortlist();
                        }}
                    >
                        {t.shortlisted}
                    </button>
                ) : (
                    <button
                        type="button"
                        title={t.addToShortlistTitle}
                        className="pointer-events-auto inline-flex min-h-9 shrink-0 cursor-pointer items-center rounded-[50px] border-[1.5px] border-[#e0deda] bg-white px-4 py-2 text-[11px] font-medium text-[#4a4a4a] transition-colors hover:border-[#2D6A4F] hover:bg-[#f0f7f2] hover:text-[#2D6A4F]"
                        onClick={(e) => {
                            e.preventDefault();
                            addShortlist();
                        }}
                    >
                        {t.addToShortlist}
                    </button>
                )}
                <Link
                    href={detailHref}
                    className="pointer-events-auto flex w-full cursor-pointer items-center justify-center rounded-[50px] border-0 bg-[#2D6A4F] px-5 py-2.5 text-[11px] !font-semibold !text-white no-underline transition-colors hover:bg-[#1B4332] sm:inline-flex sm:w-auto sm:py-2"
                >
                    {t.viewDetails}
                </Link>
                </div>
            </footer>
            </div>
        </article>
    );
}

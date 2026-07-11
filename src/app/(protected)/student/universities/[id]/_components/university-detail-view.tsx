"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowBackIcon } from "../../../_components/directional-icons";
import { UniversityLocation } from "../../_components/university-location";
import { UniversityDetailSectionTabs } from "./university-detail-section-tabs";
import {
    DetailHeaderFavouriteButton,
    DetailSidebarActivityButtons,
    UniversityDetailStudentActivityProvider,
} from "./university-detail-student-activities";

export type MajorProgramBlock = {
    majorName: string;
    programs: string[];
};

export type UniversityDetailModel = {
    id: string;
    name: string;
    city: string;
    state: string | null;
    countryName: string;
    countryCode: string;
    isPublic: boolean;
    logoUrl: string | null;
    coverImageUrl: string | null;
    description: string | null;
    topMajorNames: string[];
    tuitionDisplay: string;
    tuitionSentence: string;
    deadlineFormatted: string;
    ieltsFormatted: string;
    satPolicy: string | null;
    satBadge: "optional" | "required" | "neutral";
    toeflFormatted: string | null;
    methodFormatted: string;
    feeFormatted: string;
    intakesFormatted: string;
    livingFormatted: string;
    scholarshipsAvailable: boolean;
    scholarshipNote: string | null;
    acceptanceFormatted: string;
    rankingFormatted: string | null;
    intlStudentsFormatted: string | null;
    difficultyLabel: string | null;
    websiteUrl: string | null;
    admissionUrl: string | null;
    email: string | null;
    documents: string[];
    majorBlocks: MajorProgramBlock[];
    totalPrograms: number;
    is_shortlisted: boolean;
    is_favourite: boolean;
};

function CrestSvg({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            width="24"
            height="24"
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

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
    return (
        <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-[#1a1a1a]">
            <span className="text-[#4a4a4a] [&_svg]:opacity-50">{icon}</span>
            {children}
        </div>
    );
}

function DocDot() {
    return (
        <div
            className="mt-[7px] h-[5px] min-w-[5px] rounded-full bg-[#40916C]"
            aria-hidden
        />
    );
}

function IconGlobe({ className }: { className?: string }) {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden
        >
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
    );
}

const bannerPatternSvg =
    "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23ffffff' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")";

export function UniversityDetailView({ uni }: { uni: UniversityDetailModel }) {
    const { dict } = useLocale();
    const t = dict.student.universities;
    const desc =
        uni.description?.trim() ||
        t.noDescription;

    let satMiddle: ReactNode = uni.satPolicy?.trim() || t.emDash;
    if (uni.satBadge === "optional") {
        satMiddle = (
            <span className="inline-block rounded-xl bg-[#FFF3E0] px-2.5 py-0.5 text-[11px] font-semibold text-[#E65100]">
                {t.optional}
            </span>
        );
    } else if (uni.satBadge === "required") {
        satMiddle = <span className="font-semibold">{t.required}</span>;
    }

    return (
        <UniversityDetailStudentActivityProvider
            universityId={uni.id}
            initialShortlisted={uni.is_shortlisted}
            initialFavourite={uni.is_favourite}
        >
        <div className="mx-auto py-4 pb-[60px] sm:py-6">
            <Link
                href="/student/universities"
                className="mb-4 inline-flex items-center gap-1.5 rounded-[50px] border border-[#ece9e4] bg-white px-4 py-2 text-xs font-medium text-[#4a4a4a] transition-colors hover:border-[#2D6A4F] hover:bg-[#f0f7f2] hover:text-[#2D6A4F] sm:px-[18px]"
            >
                <ArrowBackIcon />
                {t.backToSearch}
            </Link>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#ece9e4] bg-white px-4 py-3 sm:gap-4 sm:px-5 sm:py-3.5">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#E8F5EE] p-1">
                        {uni.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- remote logos; domains vary
                            <img
                                src={uni.logoUrl}
                                alt=""
                                className="h-full w-full object-contain"
                            />
                        ) : (
                            <CrestSvg className="h-[18px] w-[18px]" />
                        )}
                    </div>
                    <span className="bidi-ltr min-w-0 truncate text-sm font-semibold text-[#1a1a1a] sm:text-base" dir="ltr">{uni.name}</span>
                </div>
                <div className="flex gap-2">
                    <DetailHeaderFavouriteButton />
                    <button
                        type="button"
                        aria-label={t.remindersComingSoon}
                        className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-xl border border-[#e0deda] bg-white transition-colors hover:bg-[#f4f3f0]"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7a7a7a" strokeWidth="1.8">
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <path d="M16 2v4M8 2v4M3 10h18" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
                <div className="min-w-0 flex-1">
                    <div className="relative mb-4 overflow-visible rounded-[12px] border border-[#ece9e4] bg-white">
                        <div className="relative h-[150px] overflow-visible rounded-t-[12px] sm:h-[190px]">
                            {uni.coverImageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element -- remote cover images; domains vary
                                <img
                                    src={uni.coverImageUrl}
                                    alt=""
                                    className="absolute inset-0 h-full w-full rounded-t-[12px] object-cover"
                                />
                            ) : (
                                <div
                                    className="absolute inset-0 rounded-t-[12px]"
                                    style={{
                                        background:
                                            "linear-gradient(135deg, #1B4332 0%, #2D6A4F 35%, #40916C 70%, #52B788 100%)",
                                    }}
                                />
                            )}
                            <div
                                className="pointer-events-none absolute inset-0 rounded-t-[12px]"
                                style={{
                                    background:
                                        "linear-gradient(to bottom, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.15) 100%)",
                                }}
                            />
                            {!uni.coverImageUrl ? (
                                <div
                                    className="pointer-events-none absolute inset-0 rounded-t-[12px] opacity-30"
                                    style={{ backgroundImage: bannerPatternSvg }}
                                />
                            ) : null}

                            <div className="absolute -bottom-7 left-4 z-[5] flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-white bg-white shadow-[0_2px_12px_rgba(0,0,0,0.1)] sm:-bottom-8 sm:left-6 sm:h-16 sm:w-16">
                                <div className="flex h-[46px] w-[46px] items-center justify-center overflow-hidden rounded-xl bg-[#E8F5EE] p-2 sm:h-[52px] sm:w-[52px]">
                                    {uni.logoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={uni.logoUrl}
                                            alt=""
                                            className="h-full w-full object-contain"
                                        />
                                    ) : (
                                        <CrestSvg />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="px-4 pb-4 pt-10 sm:px-6 sm:pt-12">
                            <h1 className="serif bidi-ltr mb-0.5 text-[19px] font-bold leading-tight text-[#1a1a1a] break-words sm:text-[22px]" dir="ltr">
                                {uni.name}
                            </h1>
                            <p className="bidi-ltr mb-2.5 text-sm text-[#7a7a7a]" dir="ltr">
                                <UniversityLocation
                                    city={uni.city}
                                    state={uni.state}
                                    countryName={uni.countryName}
                                    countryCode={uni.countryCode}
                                    flagSize={20}
                                />
                            </p>
                            <span className="inline-block rounded-[20px] bg-[#E8F5EE] px-3 py-1 text-xs font-medium text-[#2D6A4F]">
                                {uni.isPublic ? t.publicUniversity : t.privateUniversity}
                            </span>
                        </div>

                        <UniversityDetailSectionTabs />

                        <section
                            id="d-overview"
                            className="scroll-mt-28 border-b border-[#ece9e4] px-4 py-4 sm:px-6 sm:py-5"
                        >
                            <SectionTitle
                                icon={
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 16v-4M12 8h.01" />
                                    </svg>
                                }
                            >
                                {t.overview}
                            </SectionTitle>
                            <p className="bidi-ltr mb-4 text-[13.5px] leading-[1.65] text-[#4a4a4a]" dir="ltr">{desc}</p>

                            <div className="mb-2 text-[13px] font-semibold text-[#1a1a1a]">
                                {t.admissionProfile}
                            </div>
                            <div className="mb-5 flex flex-wrap gap-2">
                                {uni.difficultyLabel ? (
                                    <span className="inline-flex items-center rounded-[20px] border border-[#E8F5EE] bg-[#E8F5EE] px-3 py-1.5 text-xs font-semibold capitalize text-[#2D6A4F]">
                                        {t.difficulty}: <span className="bidi-ltr" dir="ltr">{uni.difficultyLabel}</span>
                                    </span>
                                ) : null}
                                <span className="inline-flex items-center rounded-[20px] border border-[#e0deda] bg-[#f4f3f0] px-3 py-1.5 text-xs font-medium text-[#4a4a4a]">
                                    {t.acceptance} <span className="bidi-ltr" dir="ltr">{uni.acceptanceFormatted}</span>
                                </span>
                            </div>

                            <div className="mb-2 text-[13px] font-semibold text-[#1a1a1a]">{t.featuredMajors}</div>
                            <div className="mb-5 flex flex-wrap gap-2">
                                {uni.topMajorNames.length > 0 ? (
                                    uni.topMajorNames.map((m) => (
                                        <span
                                            key={m}
                                            className="bidi-ltr inline-flex items-center rounded-[20px] border border-[#E8F5EE] bg-[#E8F5EE] px-3 py-1.5 text-xs font-semibold text-[#2D6A4F]"
                                            dir="ltr"
                                        >
                                            {m}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-[13px] text-[#7a7a7a]">{t.emDash}</span>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-[#1a1a1a]">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.8" className="shrink-0">
                                    <line x1="12" y1="1" x2="12" y2="23" />
                                    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                                </svg>
                                <span>{t.tuitionLabel}: <span className="bidi-ltr break-words" dir="ltr">{uni.tuitionSentence}</span></span>
                            </div>
                        </section>

                        <section
                            id="d-requirements"
                            className="scroll-mt-28 border-b border-[#ece9e4] px-4 py-4 sm:px-6 sm:py-5"
                        >
                            <SectionTitle
                                icon={
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                                    </svg>
                                }
                            >
                                {t.requirements}
                            </SectionTitle>
                            <div className="flex flex-col gap-1 border-b border-[#ece9e4] py-2 text-[13.5px] sm:flex-row sm:items-center sm:gap-2.5">
                                <span className="shrink-0 font-medium text-[#7a7a7a] sm:w-[100px] sm:min-w-[100px]">{t.gpa}</span>
                                <span className="min-w-0 font-semibold text-[#1a1a1a] break-words">
                                    {t.competitiveAcademic}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1 border-b border-[#ece9e4] py-2 text-[13.5px] sm:flex-row sm:items-center sm:gap-2.5">
                                <span className="shrink-0 font-medium text-[#7a7a7a] sm:w-[100px] sm:min-w-[100px]">{t.satAct}</span>
                                <span className="bidi-ltr min-w-0 font-semibold text-[#1a1a1a] break-words" dir="ltr">{satMiddle}</span>
                            </div>
                            <div className="flex flex-col gap-1 border-b border-[#ece9e4] py-2 text-[13.5px] sm:flex-row sm:items-center sm:gap-2.5">
                                <span className="shrink-0 font-medium text-[#7a7a7a] sm:w-[100px] sm:min-w-[100px]">{t.ielts}</span>
                                <span className="bidi-ltr min-w-0 font-semibold text-[#1a1a1a] break-words" dir="ltr">{t.ieltsMinimum} {uni.ieltsFormatted}</span>
                            </div>
                            {uni.toeflFormatted ? (
                                <div className="flex flex-col gap-1 border-b border-[#ece9e4] py-2 text-[13.5px] sm:flex-row sm:items-center sm:gap-2.5">
                                    <span className="shrink-0 font-medium text-[#7a7a7a] sm:w-[100px] sm:min-w-[100px]">{t.toefl}</span>
                                    <span className="bidi-ltr min-w-0 font-semibold text-[#1a1a1a] break-words" dir="ltr">{t.ieltsMinimum} {uni.toeflFormatted}</span>
                                </div>
                            ) : null}
                            <div className="mb-3 mt-4 text-[13px] font-semibold text-[#1a1a1a]">
                                {t.documentsNeeded}
                            </div>
                            <ul className="list-none space-y-1">
                                {uni.documents.map((doc) => (
                                    <li key={doc} className="flex items-start gap-2 text-[13px] text-[#4a4a4a]">
                                        <DocDot />
                                        <span className="bidi-ltr" dir="ltr">{doc}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section
                            id="d-application"
                            className="scroll-mt-28 border-b border-[#ece9e4] px-4 py-4 sm:px-6 sm:py-5"
                        >
                            <SectionTitle
                                icon={
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <rect x="3" y="4" width="18" height="18" rx="2" />
                                        <path d="M16 2v4M8 2v4M3 10h18" />
                                    </svg>
                                }
                            >
                                {t.applicationInfo}
                            </SectionTitle>
                            <div className="grid grid-cols-1 gap-2.5 min-[460px]:grid-cols-2">
                                <div className="rounded-[8px] border border-[#ece9e4] bg-[#f4f3f0] px-3.5 py-3">
                                    <div className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.5px] text-[#a0a0a0]">
                                        {t.deadline}
                                    </div>
                                    <div className="bidi-ltr text-[15px] font-semibold" dir="ltr">{uni.deadlineFormatted}</div>
                                </div>
                                <div className="rounded-[8px] border border-[#ece9e4] bg-[#f4f3f0] px-3.5 py-3">
                                    <div className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.5px] text-[#a0a0a0]">
                                        {t.method}
                                    </div>
                                    <div className="bidi-ltr text-[15px] font-semibold" dir="ltr">{uni.methodFormatted}</div>
                                </div>
                                <div className="rounded-[8px] border border-[#ece9e4] bg-[#f4f3f0] px-3.5 py-3">
                                    <div className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.5px] text-[#a0a0a0]">
                                        {t.applicationFee}
                                    </div>
                                    <div className="bidi-ltr text-[15px] font-semibold" dir="ltr">{uni.feeFormatted}</div>
                                </div>
                                <div className="rounded-[8px] border border-[#ece9e4] bg-[#f4f3f0] px-3.5 py-3">
                                    <div className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.5px] text-[#a0a0a0]">
                                        {t.intakes}
                                    </div>
                                    <div className="bidi-ltr text-[15px] font-semibold" dir="ltr">{uni.intakesFormatted}</div>
                                </div>
                            </div>
                        </section>

                        <section
                            id="d-costs"
                            className="scroll-mt-28 border-b border-[#ece9e4] px-4 py-4 sm:px-6 sm:py-5"
                        >
                            <SectionTitle
                                icon={
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <line x1="12" y1="1" x2="12" y2="23" />
                                        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                                    </svg>
                                }
                            >
                                {t.costsScholarships}
                            </SectionTitle>
                            <div className="flex flex-col gap-1 border-b border-[#ece9e4] py-2.5 text-[13.5px] sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                <span className="text-[#7a7a7a]">{t.tuitionPerYear}</span>
                                <span className="bidi-ltr font-semibold break-words" dir="ltr">{uni.tuitionDisplay}</span>
                            </div>
                            <div className="flex flex-col gap-1 border-b border-[#ece9e4] py-2.5 text-[13.5px] sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                <span className="text-[#7a7a7a]">{t.estimatedLiving}</span>
                                <span className="bidi-ltr font-semibold break-words" dir="ltr">{uni.livingFormatted}</span>
                            </div>
                            <div className="flex flex-col gap-2 py-2.5 text-[13.5px] sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                <span className="text-[#7a7a7a]">{t.scholarshipsAvailable}</span>
                                {uni.scholarshipsAvailable ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#E8F5EE] px-3 py-0.5 text-xs font-semibold text-[#2D6A4F]">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5">
                                            <path d="M20 6L9 17l-5-5" />
                                        </svg>
                                        {t.yes}
                                    </span>
                                ) : (
                                    <span className="font-semibold text-[#4a4a4a]">{t.notListed}</span>
                                )}
                            </div>
                            {uni.scholarshipNote ? (
                                <p className="bidi-ltr mt-2.5 rounded-[8px] border border-[#ece9e4] border-l-[3px] border-l-[#40916C] bg-[#f4f3f0] px-3.5 py-2.5 text-[12.5px] leading-normal text-[#7a7a7a]" dir="ltr">
                                    {uni.scholarshipNote}
                                </p>
                            ) : null}
                        </section>

                        <section
                            id="d-majors"
                            className="scroll-mt-28 border-b border-[#ece9e4] px-4 py-4 sm:px-6 sm:py-5"
                        >
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                <div className="flex min-w-0 flex-1 items-center gap-2 text-[15px] font-semibold text-[#1a1a1a]">
                                    <span className="text-[#4a4a4a] [&_svg]:opacity-50">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                            <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                                            <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                                        </svg>
                                    </span>
                                    {t.allMajorsPrograms}
                                </div>
                                <span className="shrink-0 text-[11px] font-normal text-[#a0a0a0]">
                                    {t.programsCount.replace("{count}", String(uni.totalPrograms))}
                                </span>
                            </div>
                            <div className="scrollbar-thin max-h-[340px] overflow-y-auto rounded-[8px] border border-[#ece9e4]">
                                {uni.majorBlocks.length === 0 ? (
                                    <p className="p-4 text-[13px] text-[#7a7a7a]">
                                        {t.programsNotListed}
                                    </p>
                                ) : (
                                    uni.majorBlocks.map((block, i) => (
                                        <details
                                            key={`${block.majorName}-${i}`}
                                            className="group border-b border-[#ece9e4] last:border-b-0"
                                        >
                                            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-[13.5px] font-semibold transition-colors hover:bg-[#f4f3f0] [&::-webkit-details-marker]:hidden">
                                                <span className="flex min-w-0 items-center gap-2">
                                                    <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-[#E8F5EE]">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.8">
                                                            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                                                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                                                        </svg>
                                                    </span>
                                                    <span className="bidi-ltr truncate" dir="ltr">{block.majorName}</span>
                                                </span>
                                                <span className="flex shrink-0 items-center gap-2">
                                                    <span className="rounded-[10px] bg-[#f4f3f0] px-2 py-0.5 text-[11px] text-[#a0a0a0]">
                                                        {block.programs.length}
                                                    </span>
                                                    <span className="text-[#a0a0a0] transition-transform group-open:rotate-180">
                                                        ▾
                                                    </span>
                                                </span>
                                            </summary>
                                            <div className="space-y-1.5 border-t border-[#ece9e4] px-4 py-3 pl-4 sm:pl-[56px]">
                                                {block.programs.map((p) => (
                                                    <div
                                                        key={p}
                                                        className="flex items-start gap-2 text-[12.5px] text-[#4a4a4a]"
                                                    >
                                                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#e0deda]" />
                                                        <span className="bidi-ltr" dir="ltr">{p}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    ))
                                )}
                            </div>
                        </section>

                        <section id="d-alumni" className="relative scroll-mt-28 overflow-hidden px-4 py-4 sm:px-6 sm:py-5">
                            <div
                                aria-hidden
                                className="pointer-events-none absolute top-5 right-[-32px] z-[3] rotate-[35deg] bg-[#2D6A4F] px-10 py-1 text-[11px] font-bold tracking-wide text-white shadow-[0_2px_6px_rgba(0,0,0,0.15)]"
                            >
                                {t.comingSoon}
                            </div>
                            <div className="opacity-55">
                                <SectionTitle
                                    icon={
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                                        </svg>
                                    }
                                >
                                    {t.speakToAlumni}
                                </SectionTitle>
                                <p className="text-[13px] text-[#7a7a7a]">
                                    {t.alumniDesc}
                                </p>
                            </div>
                        </section>
                    </div>
                </div>

                <aside className="w-full shrink-0 lg:w-[220px] lg:min-w-[220px]">
                    <div className="rounded-[12px] border border-[#ece9e4] bg-white p-4 sm:p-5 lg:sticky lg:top-6">
                        <div className="mb-3.5 text-sm font-semibold text-[#1a1a1a]">{t.yourActions}</div>
                        <DetailSidebarActivityButtons />
                        {uni.websiteUrl ? (
                            <a
                                href={uni.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mb-2 flex w-full items-center gap-2.5 rounded-[10px] border border-[#2D6A4F] bg-[#2D6A4F] px-3.5 py-2.5 text-left text-[13px] !font-semibold !text-white no-underline transition-colors hover:bg-[#1B4332]"
                            >
                                <IconGlobe className="shrink-0" />
                                {t.visitWebsite}
                            </a>
                        ) : null}
                        {uni.admissionUrl ? (
                            <a
                                href={uni.admissionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mb-2 flex w-full items-center gap-2.5 rounded-[10px] border border-[#e0deda] bg-white px-3.5 py-2.5 text-left text-[13px] font-medium text-[#1a1a1a] transition-colors hover:bg-[#f4f3f0]"
                            >
                                <IconGlobe className="shrink-0 text-[#4a4a4a]" />
                                {t.admissionsPage}
                            </a>
                        ) : null}

                        <div className="my-3.5 border-t border-[#ece9e4]" />
                        <div className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.5px] text-[#a0a0a0]">
                            {t.atAGlance}
                        </div>
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between gap-2 py-1">
                                <span className="text-[#7a7a7a]">{t.acceptance}</span>
                                <span className="bidi-ltr font-semibold text-[#1a1a1a]" dir="ltr">{uni.acceptanceFormatted}</span>
                            </div>
                            <div className="flex justify-between gap-2 py-1">
                                <span className="text-[#7a7a7a]">{t.ranking}</span>
                                <span className="bidi-ltr font-semibold text-[#1a1a1a]" dir="ltr">{uni.rankingFormatted ?? t.emDash}</span>
                            </div>
                            <div className="flex justify-between gap-2 py-1">
                                <span className="text-[#7a7a7a]">{t.intlStudents}</span>
                                <span
                                    className={`bidi-ltr font-semibold ${uni.intlStudentsFormatted ? "text-[#E65100]" : "text-[#1a1a1a]"}`}
                                    dir="ltr"
                                >
                                    {uni.intlStudentsFormatted ?? t.emDash}
                                </span>
                            </div>
                        </div>

                        {uni.email ? (
                            <p className="mt-3 text-[11px] leading-relaxed text-[#a0a0a0]">
                                {t.contact}:{" "}
                                <a href={`mailto:${uni.email}`} className="bidi-ltr font-medium text-[#2D6A4F] hover:underline" dir="ltr">
                                    {uni.email}
                                </a>
                            </p>
                        ) : null}
                    </div>
                </aside>
            </div>
        </div>
        </UniversityDetailStudentActivityProvider>
    );
}

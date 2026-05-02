import Link from "next/link";
import type { ReactNode } from "react";
import { UniversityDetailSectionTabs } from "./university-detail-section-tabs";

export type MajorProgramBlock = {
    majorName: string;
    programs: string[];
};

export type UniversityDetailModel = {
    id: string;
    name: string;
    locationLine: string;
    isPublic: boolean;
    logoUrl: string | null;
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
    const desc =
        uni.description?.trim() ||
        "No description is available yet. Visit the institution’s website or contact admissions for the latest information.";

    let satMiddle: ReactNode = uni.satPolicy?.trim() || "—";
    if (uni.satBadge === "optional") {
        satMiddle = (
            <span className="inline-block rounded-xl bg-[#FFF3E0] px-2.5 py-0.5 text-[11px] font-semibold text-[#E65100]">
                Optional
            </span>
        );
    } else if (uni.satBadge === "required") {
        satMiddle = <span className="font-semibold">Required</span>;
    }

    return (
        <div className="mx-auto px-5 py-6 pb-[60px]">
            <Link
                href="/student/universities"
                className="mb-4 inline-flex items-center gap-1.5 rounded-[50px] border border-[#ece9e4] bg-white px-[18px] py-2 text-xs font-medium text-[#4a4a4a] transition-colors hover:border-[#2D6A4F] hover:bg-[#f0f7f2] hover:text-[#2D6A4F]"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to search
            </Link>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-[#ece9e4] bg-white px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
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
                    <span className="truncate text-base font-semibold text-[#1a1a1a]">{uni.name}</span>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        aria-label="Save (coming soon)"
                        className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-xl border border-[#e0deda] bg-white transition-colors hover:bg-[#f4f3f0]"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7a7a7a" strokeWidth="1.8">
                            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        aria-label="Reminders (coming soon)"
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
                        <div
                            className="relative h-[190px] overflow-hidden rounded-t-[12px]"
                            style={{
                                background:
                                    "linear-gradient(135deg, #1B4332 0%, #2D6A4F 35%, #40916C 70%, #52B788 100%)",
                            }}
                        >
                            <div
                                className="pointer-events-none absolute inset-0"
                                style={{
                                    background:
                                        "linear-gradient(to bottom, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.15) 100%)",
                                }}
                            />
                            <div
                                className="pointer-events-none absolute inset-0 opacity-30"
                                style={{ backgroundImage: bannerPatternSvg }}
                            />
                        </div>

                        <div className="absolute top-[162px] left-6 z-[5] flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] border-white bg-white shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
                            <div className="flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-xl bg-[#E8F5EE] p-2">
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

                        <div className="px-6 pb-4 pt-[40px]">
                            <h1 className="serif mb-0.5 text-[22px] font-bold leading-tight text-[#1a1a1a]">
                                {uni.name}
                            </h1>
                            <p className="mb-2.5 text-sm text-[#7a7a7a]">{uni.locationLine}</p>
                            <span className="inline-block rounded-[20px] bg-[#E8F5EE] px-3 py-1 text-xs font-medium text-[#2D6A4F]">
                                {uni.isPublic ? "Public" : "Private"} university
                            </span>
                        </div>

                        <UniversityDetailSectionTabs />

                        <section
                            id="d-overview"
                            className="scroll-mt-28 border-b border-[#ece9e4] px-6 py-5"
                        >
                            <SectionTitle
                                icon={
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 16v-4M12 8h.01" />
                                    </svg>
                                }
                            >
                                Overview
                            </SectionTitle>
                            <p className="mb-4 text-[13.5px] leading-[1.65] text-[#4a4a4a]">{desc}</p>

                            <div className="mb-2 text-[13px] font-semibold text-[#1a1a1a]">
                                Admission profile
                            </div>
                            <div className="mb-5 flex flex-wrap gap-2">
                                {uni.difficultyLabel ? (
                                    <span className="inline-flex items-center rounded-[20px] border border-[#E8F5EE] bg-[#E8F5EE] px-3 py-1.5 text-xs font-semibold capitalize text-[#2D6A4F]">
                                        Difficulty: {uni.difficultyLabel}
                                    </span>
                                ) : null}
                                <span className="inline-flex items-center rounded-[20px] border border-[#e0deda] bg-[#f4f3f0] px-3 py-1.5 text-xs font-medium text-[#4a4a4a]">
                                    Acceptance {uni.acceptanceFormatted}
                                </span>
                            </div>

                            <div className="mb-2 text-[13px] font-semibold text-[#1a1a1a]">Featured majors</div>
                            <div className="mb-5 flex flex-wrap gap-2">
                                {uni.topMajorNames.length > 0 ? (
                                    uni.topMajorNames.map((m) => (
                                        <span
                                            key={m}
                                            className="inline-flex items-center rounded-[20px] border border-[#E8F5EE] bg-[#E8F5EE] px-3 py-1.5 text-xs font-semibold text-[#2D6A4F]"
                                        >
                                            {m}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-[13px] text-[#7a7a7a]">—</span>
                                )}
                            </div>

                            <div className="flex items-center gap-2 text-sm font-medium text-[#1a1a1a]">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.8">
                                    <line x1="12" y1="1" x2="12" y2="23" />
                                    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                                </svg>
                                Tuition: {uni.tuitionSentence}
                            </div>
                        </section>

                        <section
                            id="d-requirements"
                            className="scroll-mt-28 border-b border-[#ece9e4] px-6 py-5"
                        >
                            <SectionTitle
                                icon={
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                                    </svg>
                                }
                            >
                                Requirements
                            </SectionTitle>
                            <div className="flex items-center gap-2.5 border-b border-[#ece9e4] py-2 text-[13.5px]">
                                <span className="w-[100px] min-w-[100px] font-medium text-[#7a7a7a]">GPA</span>
                                <span className="font-semibold text-[#1a1a1a]">
                                    Competitive academic record recommended
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5 border-b border-[#ece9e4] py-2 text-[13.5px]">
                                <span className="w-[100px] min-w-[100px] font-medium text-[#7a7a7a]">SAT / ACT</span>
                                <span className="font-semibold text-[#1a1a1a]">{satMiddle}</span>
                            </div>
                            <div className="flex items-center gap-2.5 border-b border-[#ece9e4] py-2 text-[13.5px]">
                                <span className="w-[100px] min-w-[100px] font-medium text-[#7a7a7a]">IELTS</span>
                                <span className="font-semibold text-[#1a1a1a]">Minimum {uni.ieltsFormatted}</span>
                            </div>
                            {uni.toeflFormatted ? (
                                <div className="flex items-center gap-2.5 border-b border-[#ece9e4] py-2 text-[13.5px]">
                                    <span className="w-[100px] min-w-[100px] font-medium text-[#7a7a7a]">TOEFL</span>
                                    <span className="font-semibold text-[#1a1a1a]">Minimum {uni.toeflFormatted}</span>
                                </div>
                            ) : null}
                            <div className="mb-3 mt-4 text-[13px] font-semibold text-[#1a1a1a]">
                                Documents needed
                            </div>
                            <ul className="list-none space-y-1">
                                {uni.documents.map((doc) => (
                                    <li key={doc} className="flex items-start gap-2 text-[13px] text-[#4a4a4a]">
                                        <DocDot />
                                        <span>{doc}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section
                            id="d-application"
                            className="scroll-mt-28 border-b border-[#ece9e4] px-6 py-5"
                        >
                            <SectionTitle
                                icon={
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <rect x="3" y="4" width="18" height="18" rx="2" />
                                        <path d="M16 2v4M8 2v4M3 10h18" />
                                    </svg>
                                }
                            >
                                Application info
                            </SectionTitle>
                            <div className="grid grid-cols-1 gap-2.5 min-[460px]:grid-cols-2">
                                <div className="rounded-[8px] border border-[#ece9e4] bg-[#f4f3f0] px-3.5 py-3">
                                    <div className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.5px] text-[#a0a0a0]">
                                        Deadline
                                    </div>
                                    <div className="text-[15px] font-semibold">{uni.deadlineFormatted}</div>
                                </div>
                                <div className="rounded-[8px] border border-[#ece9e4] bg-[#f4f3f0] px-3.5 py-3">
                                    <div className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.5px] text-[#a0a0a0]">
                                        Method
                                    </div>
                                    <div className="text-[15px] font-semibold">{uni.methodFormatted}</div>
                                </div>
                                <div className="rounded-[8px] border border-[#ece9e4] bg-[#f4f3f0] px-3.5 py-3">
                                    <div className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.5px] text-[#a0a0a0]">
                                        Application fee
                                    </div>
                                    <div className="text-[15px] font-semibold">{uni.feeFormatted}</div>
                                </div>
                                <div className="rounded-[8px] border border-[#ece9e4] bg-[#f4f3f0] px-3.5 py-3">
                                    <div className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.5px] text-[#a0a0a0]">
                                        Intakes
                                    </div>
                                    <div className="text-[15px] font-semibold">{uni.intakesFormatted}</div>
                                </div>
                            </div>
                        </section>

                        <section
                            id="d-costs"
                            className="scroll-mt-28 border-b border-[#ece9e4] px-6 py-5"
                        >
                            <SectionTitle
                                icon={
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <line x1="12" y1="1" x2="12" y2="23" />
                                        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                                    </svg>
                                }
                            >
                                Costs & scholarships
                            </SectionTitle>
                            <div className="flex items-center justify-between border-b border-[#ece9e4] py-2.5 text-[13.5px]">
                                <span className="text-[#7a7a7a]">Tuition per year</span>
                                <span className="font-semibold">{uni.tuitionDisplay}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-[#ece9e4] py-2.5 text-[13.5px]">
                                <span className="text-[#7a7a7a]">Estimated living cost</span>
                                <span className="font-semibold">{uni.livingFormatted}</span>
                            </div>
                            <div className="flex items-center justify-between py-2.5 text-[13.5px]">
                                <span className="text-[#7a7a7a]">Scholarships available</span>
                                {uni.scholarshipsAvailable ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#E8F5EE] px-3 py-0.5 text-xs font-semibold text-[#2D6A4F]">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5">
                                            <path d="M20 6L9 17l-5-5" />
                                        </svg>
                                        Yes
                                    </span>
                                ) : (
                                    <span className="font-semibold text-[#4a4a4a]">Not listed</span>
                                )}
                            </div>
                            {uni.scholarshipNote ? (
                                <p className="mt-2.5 rounded-[8px] border border-[#ece9e4] border-l-[3px] border-l-[#40916C] bg-[#f4f3f0] px-3.5 py-2.5 text-[12.5px] leading-normal text-[#7a7a7a]">
                                    {uni.scholarshipNote}
                                </p>
                            ) : null}
                        </section>

                        <section
                            id="d-majors"
                            className="scroll-mt-28 border-b border-[#ece9e4] px-6 py-5"
                        >
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                <div className="flex min-w-0 flex-1 items-center gap-2 text-[15px] font-semibold text-[#1a1a1a]">
                                    <span className="text-[#4a4a4a] [&_svg]:opacity-50">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                            <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                                            <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                                        </svg>
                                    </span>
                                    All majors & programs
                                </div>
                                <span className="shrink-0 text-[11px] font-normal text-[#a0a0a0]">
                                    {uni.totalPrograms} programs
                                </span>
                            </div>
                            <div className="scrollbar-thin max-h-[340px] overflow-y-auto rounded-[8px] border border-[#ece9e4]">
                                {uni.majorBlocks.length === 0 ? (
                                    <p className="p-4 text-[13px] text-[#7a7a7a]">
                                        Programs for this university are not listed yet.
                                    </p>
                                ) : (
                                    uni.majorBlocks.map((block, i) => (
                                        <details
                                            key={`${block.majorName}-${i}`}
                                            open={i === 0}
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
                                                    <span className="truncate">{block.majorName}</span>
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
                                            <div className="space-y-1.5 border-t border-[#ece9e4] px-4 py-3 pl-[56px]">
                                                {block.programs.map((p) => (
                                                    <div
                                                        key={p}
                                                        className="flex items-start gap-2 text-[12.5px] text-[#4a4a4a]"
                                                    >
                                                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#e0deda]" />
                                                        <span>{p}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    ))
                                )}
                            </div>
                        </section>

                        <section id="d-alumni" className="relative scroll-mt-28 overflow-hidden px-6 py-5">
                            <div
                                aria-hidden
                                className="pointer-events-none absolute top-5 right-[-32px] z-[3] rotate-[35deg] bg-[#2D6A4F] px-10 py-1 text-[11px] font-bold tracking-wide text-white shadow-[0_2px_6px_rgba(0,0,0,0.15)]"
                            >
                                COMING SOON
                            </div>
                            <div className="opacity-55">
                                <SectionTitle
                                    icon={
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                                        </svg>
                                    }
                                >
                                    Speak to an alumni
                                </SectionTitle>
                                <p className="text-[13px] text-[#7a7a7a]">
                                    Connect with graduates who studied here and learn from their experience.
                                </p>
                            </div>
                        </section>
                    </div>
                </div>

                <aside className="w-full shrink-0 lg:w-[220px] lg:min-w-[220px]">
                    <div className="sticky top-6 rounded-[12px] border border-[#ece9e4] bg-white p-5">
                        <div className="mb-3.5 text-sm font-semibold text-[#1a1a1a]">Your actions</div>
                        <button
                            type="button"
                            className="mb-2 flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] border border-[#e0deda] bg-white px-3.5 py-2.5 text-left text-[13px] font-medium text-[#1a1a1a] transition-colors hover:border-[#a0a0a0] hover:bg-[#f4f3f0]"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
                            </svg>
                            Save university
                        </button>
                        <button
                            type="button"
                            className="mb-2 flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] border border-[#e0deda] bg-white px-3.5 py-2.5 text-left text-[13px] font-medium text-[#1a1a1a] transition-colors hover:border-[#a0a0a0] hover:bg-[#f4f3f0]"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M12 2l2.4 7.4H22l-6 4.6L18.3 21 12 16.4 5.7 21l2.3-7L2 9.4h7.6z" />
                            </svg>
                            Add to shortlist
                        </button>
                        {uni.websiteUrl ? (
                            <a
                                href={uni.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mb-2 flex w-full items-center gap-2.5 rounded-[10px] border border-[#2D6A4F] bg-[#2D6A4F] px-3.5 py-2.5 text-left text-[13px] !font-semibold !text-white no-underline transition-colors hover:bg-[#1B4332]"
                            >
                                <IconGlobe className="shrink-0" />
                                Visit website
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
                                Admissions page
                            </a>
                        ) : null}

                        <div className="my-3.5 border-t border-[#ece9e4]" />
                        <div className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.5px] text-[#a0a0a0]">
                            At a glance
                        </div>
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between gap-2 py-1">
                                <span className="text-[#7a7a7a]">Acceptance</span>
                                <span className="font-semibold text-[#1a1a1a]">{uni.acceptanceFormatted}</span>
                            </div>
                            <div className="flex justify-between gap-2 py-1">
                                <span className="text-[#7a7a7a]">Ranking</span>
                                <span className="font-semibold text-[#1a1a1a]">{uni.rankingFormatted ?? "—"}</span>
                            </div>
                            <div className="flex justify-between gap-2 py-1">
                                <span className="text-[#7a7a7a]">Intl students</span>
                                <span
                                    className={`font-semibold ${uni.intlStudentsFormatted ? "text-[#E65100]" : "text-[#1a1a1a]"}`}
                                >
                                    {uni.intlStudentsFormatted ?? "—"}
                                </span>
                            </div>
                        </div>

                        {uni.email ? (
                            <p className="mt-3 text-[11px] leading-relaxed text-[#a0a0a0]">
                                Contact:{" "}
                                <a href={`mailto:${uni.email}`} className="font-medium text-[#2D6A4F] hover:underline">
                                    {uni.email}
                                </a>
                            </p>
                        ) : null}
                    </div>
                </aside>
            </div>
        </div>
    );
}

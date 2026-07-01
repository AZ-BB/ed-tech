"use client";

import clsx from "clsx";
import { useLocale } from "@/lib/i18n/locale-context";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SECTION_TAB_IDS = [
    { id: "d-overview", key: "overview" },
    { id: "d-requirements", key: "requirements" },
    { id: "d-application", key: "application" },
    { id: "d-costs", key: "costs" },
    { id: "d-majors", key: "majors" },
    { id: "d-alumni", key: "alumni" },
] as const;

type SectionId = (typeof SECTION_TAB_IDS)[number]["id"];

const SECTION_IDS: readonly SectionId[] = SECTION_TAB_IDS.map((t) => t.id);

/**
 * Matches `university_search_page.html`: smooth scroll with tab-bar offset,
 * scroll-spy highlighting (tabBar height + 60px breakpoint).
 */
export function UniversityDetailSectionTabs() {
    const { dict } = useLocale();
    const t = dict.student.universities;
    const sectionTabs = useMemo(
        () =>
            SECTION_TAB_IDS.map((tab) => ({
                id: tab.id,
                label: t[tab.key],
            })),
        [t],
    );
    const barRef = useRef<HTMLDivElement>(null);
    const [activeId, setActiveId] = useState<SectionId>(SECTION_IDS[0]);

    const scrollToSection = useCallback((id: string) => {
        const el = document.getElementById(id);
        if (!el) return;
        const barH = barRef.current?.offsetHeight ?? 50;
        const top = el.getBoundingClientRect().top + window.scrollY - (barH + 8);
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }, []);

    useEffect(() => {
        function detailScrollSpy() {
            const tabBar = barRef.current;
            if (!tabBar) return;
            const offset = tabBar.offsetHeight + 60;
            let activeIdx = 0;
            for (let i = SECTION_IDS.length - 1; i >= 0; i--) {
                const sec = document.getElementById(SECTION_IDS[i]);
                if (sec && sec.getBoundingClientRect().top <= offset) {
                    activeIdx = i;
                    break;
                }
            }
            setActiveId(SECTION_IDS[activeIdx]);
        }

        window.addEventListener("scroll", detailScrollSpy, { passive: true });
        window.addEventListener("resize", detailScrollSpy);
        detailScrollSpy();
        return () => {
            window.removeEventListener("scroll", detailScrollSpy);
            window.removeEventListener("resize", detailScrollSpy);
        };
    }, []);

    return (
        <nav
            id="detail-tabs"
            className="sticky top-0 z-10 border-b border-[#ece9e4] bg-white px-3 sm:px-4 min-[460px]:px-6"
            aria-label={t.sectionNav}
        >
            {/* Inner row scrolls; `-mb-px` + `border-b-2` on tabs overlaps the nav 1px rule so active green sits on top. */}
            <div
                ref={barRef}
                className="scrollbar-thin flex min-w-0 snap-x snap-mandatory gap-x-0 gap-y-0 overflow-x-auto [-webkit-overflow-scrolling:touch]"
            >
                {sectionTabs.map(({ id, label }) => {
                    const active = activeId === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => scrollToSection(id)}
                            className={clsx(
                                "relative -mb-px shrink-0 snap-start cursor-pointer border-x-0 border-t-0 border-b-2 border-solid border-transparent bg-white px-3 py-3 text-[12px] font-medium text-[#7a7a7a] transition-[color,border-color,font-weight] duration-150 focus-visible:z-3 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:px-[18px] sm:text-[13px]",
                                active
                                    ? "z-2 border-b-[#2D6A4F] font-semibold text-[#1B4332]"
                                    : "hover:border-b-[#e0deda]/80 hover:text-[#4a4a4a]",
                            )}
                            aria-current={active ? "true" : undefined}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

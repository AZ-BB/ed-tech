"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n/locale-context";

import type { StudentWebinarCard } from "../_lib/fetch-student-webinars";
import {
  fontSans,
  fontSerif,
  sectionDescClass,
  sectionEyebrowClass,
  sectionTitleClass,
  HERO_FEATURE_ICONS,
  TOPIC_ICONS,
  type WebinarPageMode,
} from "./webinar-constants";
import { ChevronIcon } from "./webinar-ui";

type WebinarHeroProps = {
  featuredWebinar?: StudentWebinarCard | null;
  onRegisterFeatured?: (webinar: StudentWebinarCard) => void;
  primaryCtaHref?: string;
  primaryCtaLabel?: string;
};

export function WebinarHero({
  featuredWebinar,
  onRegisterFeatured,
  primaryCtaHref = "#upcoming-webinars",
  primaryCtaLabel,
}: WebinarHeroProps) {
  const { dict } = useLocale();
  const w = dict.webinars;

  return (
    <section className="relative mb-8 min-w-0 overflow-x-clip rounded-[20px] border border-[var(--border-light)] bg-gradient-to-br from-[#fffefb] to-[var(--green-pale)] px-5 py-8 sm:mb-10 sm:rounded-[24px] sm:px-8 sm:py-10 md:mb-12 md:px-11 md:py-[60px]">
      <div
        className={`relative z-[1] mb-4 inline-flex max-w-full items-center gap-1.5 rounded-full border border-[rgba(45,106,79,0.15)] bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[1.2px] text-[var(--green)] sm:mb-[18px] sm:px-3.5 sm:text-[11px] ${fontSans}`}
      >
        <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[var(--green)]" />
        {w.heroBadge}
      </div>
      <h1
        className={`relative z-[1] mb-3 max-w-[760px] break-words ${fontSerif} text-[26px] leading-[1.08] tracking-[-0.5px] text-[var(--text)] sm:text-[34px] md:text-[42px] lg:text-[48px]`}
      >
        {w.heroTitle}{" "}
        <em className="italic text-[var(--green)]">{w.heroTitleEmphasis}</em>.
      </h1>
      <p className="relative z-[1] mb-6 max-w-[600px] text-[14px] leading-[1.6] text-[var(--text-mid)] break-words sm:mb-8 sm:text-[16px]">
        {w.heroSubtitle}
      </p>
      <div className="relative z-[1] mb-6 flex min-w-0 flex-col gap-2.5 sm:mb-8 sm:flex-row sm:flex-wrap">
        <a
          href={primaryCtaHref}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--green)] px-5 py-3 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(45,106,79,0.2)] transition hover:bg-[var(--green-dark)] sm:w-auto sm:px-[22px] sm:py-3.5 sm:text-[14px] ${fontSans}`}
        >
          {primaryCtaLabel ?? w.heroCtaViewUpcoming}
        </a>
        {featuredWebinar && onRegisterFeatured ? (
          <button
            type="button"
            onClick={() => onRegisterFeatured(featuredWebinar)}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-white px-5 py-3 text-[13px] font-semibold text-[var(--text)] transition hover:border-[var(--green)] hover:text-[var(--green)] sm:w-auto sm:px-[22px] sm:py-3.5 sm:text-[14px] ${fontSans}`}
          >
            {w.heroCtaRegisterNext}
          </button>
        ) : null}
      </div>
      <div className="relative z-[1] flex flex-wrap gap-2">
        {HERO_FEATURE_ICONS.map((Icon, index) => (
          <div
            key={w.heroFeatures[index]}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[var(--text)] sm:px-3.5 sm:py-2 sm:text-[12.5px]"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--text-mid)]" strokeWidth={1.75} aria-hidden />
            {w.heroFeatures[index]}
          </div>
        ))}
      </div>
      <p className="relative z-[1] mt-3 text-[11.5px] italic text-[var(--text-light)] break-words sm:mt-3.5 sm:text-[12px]">
        {w.heroFootnote}
      </p>
    </section>
  );
}

export function WebinarTopicsSection() {
  const { dict } = useLocale();
  const w = dict.webinars;

  return (
    <section className="mb-10 min-w-0 md:mb-[60px]">
      <p className={sectionEyebrowClass}>
        {w.topicsSectionLabel}
      </p>
      <h2 className={sectionTitleClass}>{w.topicsTitle}</h2>
      <p className={sectionDescClass}>
        {w.topicsSubtitle}
      </p>
      <div className="grid min-w-0 grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
        {w.topics.map((topic, index) => {
          const Icon = TOPIC_ICONS[index];
          return (
            <div
              key={topic.title}
              className="group relative flex min-w-0 cursor-pointer flex-col gap-2 overflow-hidden rounded-[18px] border border-[var(--border-light)] bg-white p-4 transition-all duration-200 before:pointer-events-none before:absolute before:right-0 before:top-0 before:h-20 before:w-20 before:translate-x-5 before:-translate-y-5 before:rounded-full before:bg-[radial-gradient(circle,rgba(45,106,79,0.05)_0%,transparent_70%)] before:content-[''] hover:-translate-y-0.5 hover:border-[var(--green-light)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] sm:gap-2.5 sm:p-6"
            >
              <div className="relative z-[1] mb-1.5 flex h-[42px] w-[42px] items-center justify-center rounded-[11px] bg-[var(--green-pale)] text-[var(--green)]">
                <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
              </div>
              <p className="relative z-[1] text-[14px] font-bold leading-[1.25] break-words sm:text-[15px]">{topic.title}</p>
              <p className="relative z-[1] text-[12px] leading-[1.55] text-[var(--text-light)] break-words sm:text-[12.5px]">{topic.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function WebinarFaqSection({ mode }: { mode: WebinarPageMode }) {
  const { dict } = useLocale();
  const w = dict.webinars;
  const faqs = mode === "public" ? w.faqsPublic : w.faqsStudent;
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  return (
    <section className="mb-10 min-w-0 md:mb-[60px]">
      <p className={sectionEyebrowClass}>
        {w.faqSectionLabel}
      </p>
      <h2 className={sectionTitleClass}>{w.faqTitle}</h2>
      <p className={sectionDescClass}>
        {w.faqSubtitle}
      </p>
      <div className="flex min-w-0 flex-col gap-2">
        {faqs.map((faq, index) => (
          <div
            key={faq.q}
            className={`min-w-0 overflow-x-clip rounded-[14px] border bg-white ${openFaqIndex === index ? "border-[var(--green-light)]" : "border-[var(--border-light)]"}`}
          >
            <button
              type="button"
              onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
              className={`flex w-full min-w-0 items-start justify-between gap-3 px-4 py-4 text-left text-[13px] font-semibold text-[var(--text)] sm:items-center sm:px-[22px] sm:py-[18px] sm:text-[14px] ${fontSans}`}
            >
              <span className="min-w-0 flex-1 break-words">{faq.q}</span>
              <span className="shrink-0 pt-0.5 sm:pt-0">
                <ChevronIcon open={openFaqIndex === index} />
              </span>
            </button>
            {openFaqIndex === index ? (
              <p className="px-4 pb-4 text-[13px] leading-[1.6] text-[var(--text-mid)] break-words sm:px-[22px] sm:pb-[18px] sm:text-[13.5px]">{faq.a}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

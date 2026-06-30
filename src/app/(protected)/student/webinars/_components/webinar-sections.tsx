"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n/locale-context";

import type { StudentWebinarCard } from "../_lib/fetch-student-webinars";
import {
  fontSans,
  fontSerif,
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
    <section className="relative mb-12 overflow-hidden rounded-[24px] border border-[var(--border-light)] bg-gradient-to-br from-[#fffefb] to-[var(--green-pale)] px-11 py-[60px] max-[900px]:px-6 max-[900px]:py-10">
      <div
        className={`relative z-[1] mb-[18px] inline-flex items-center gap-1.5 rounded-full border border-[rgba(45,106,79,0.15)] bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[1.2px] text-[var(--green)] ${fontSans}`}
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--green)]" />
        {w.heroBadge}
      </div>
      <h1
        className={`relative z-[1] mb-3.5 max-w-[760px] ${fontSerif} text-[48px] leading-[1.05] tracking-[-0.5px] text-[var(--text)] max-[900px]:text-[34px] max-[600px]:text-[26px]`}
      >
        {w.heroTitle}{" "}
        <em className="italic text-[var(--green)]">{w.heroTitleEmphasis}</em>.
      </h1>
      <p className="relative z-[1] mb-8 max-w-[600px] text-[16px] leading-[1.6] text-[var(--text-mid)]">
        {w.heroSubtitle}
      </p>
      <div className="relative z-[1] mb-8 flex flex-wrap gap-2.5">
        <a
          href={primaryCtaHref}
          className={`inline-flex items-center gap-2 rounded-full bg-[var(--green)] px-[22px] py-3.5 text-[14px] font-semibold text-white shadow-[0_4px_14px_rgba(45,106,79,0.2)] transition hover:bg-[var(--green-dark)] ${fontSans}`}
        >
          {primaryCtaLabel ?? w.heroCtaViewUpcoming}
        </a>
        {featuredWebinar && onRegisterFeatured ? (
          <button
            type="button"
            onClick={() => onRegisterFeatured(featuredWebinar)}
            className={`inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-[22px] py-3.5 text-[14px] font-semibold text-[var(--text)] transition hover:border-[var(--green)] hover:text-[var(--green)] ${fontSans}`}
          >
            {w.heroCtaRegisterNext}
          </button>
        ) : null}
      </div>
      <div className="relative z-[1] flex flex-wrap gap-2">
        {HERO_FEATURE_ICONS.map((Icon, index) => (
          <div
            key={w.heroFeatures[index]}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[var(--text)]"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--text-mid)]" strokeWidth={1.75} aria-hidden />
            {w.heroFeatures[index]}
          </div>
        ))}
      </div>
      <p className="relative z-[1] mt-3.5 text-[12px] italic text-[var(--text-light)]">
        {w.heroFootnote}
      </p>
    </section>
  );
}

export function WebinarTopicsSection() {
  const { dict } = useLocale();
  const w = dict.webinars;

  return (
    <section className="mb-[60px]">
      <p
        className={`mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[1.5px] text-[var(--green)] before:h-[1.5px] before:w-6 before:bg-[var(--green)] ${fontSans}`}
      >
        {w.topicsSectionLabel}
      </p>
      <h2 className={`mb-2 ${fontSerif} text-[32px] leading-[1.15] tracking-[-0.3px]`}>{w.topicsTitle}</h2>
      <p className="mb-7 max-w-[640px] text-[14.5px] leading-[1.55] text-[var(--text-light)]">
        {w.topicsSubtitle}
      </p>
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {w.topics.map((topic, index) => {
          const Icon = TOPIC_ICONS[index];
          return (
            <div
              key={topic.title}
              className="group relative flex cursor-pointer flex-col gap-2.5 overflow-hidden rounded-[18px] border border-[var(--border-light)] bg-white p-6 transition-all duration-200 before:pointer-events-none before:absolute before:right-0 before:top-0 before:h-20 before:w-20 before:translate-x-5 before:-translate-y-5 before:rounded-full before:bg-[radial-gradient(circle,rgba(45,106,79,0.05)_0%,transparent_70%)] before:content-[''] hover:-translate-y-0.5 hover:border-[var(--green-light)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)]"
            >
              <div className="relative z-[1] mb-1.5 flex h-[42px] w-[42px] items-center justify-center rounded-[11px] bg-[var(--green-pale)] text-[var(--green)]">
                <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
              </div>
              <p className="relative z-[1] text-[15px] font-bold leading-[1.25]">{topic.title}</p>
              <p className="relative z-[1] text-[12.5px] leading-[1.55] text-[var(--text-light)]">{topic.desc}</p>
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
    <section className="mb-[60px]">
      <p
        className={`mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[1.5px] text-[var(--green)] before:h-[1.5px] before:w-6 before:bg-[var(--green)] ${fontSans}`}
      >
        {w.faqSectionLabel}
      </p>
      <h2 className={`mb-2 ${fontSerif} text-[32px] leading-[1.15] tracking-[-0.3px]`}>{w.faqTitle}</h2>
      <p className="mb-7 max-w-[640px] text-[14.5px] leading-[1.55] text-[var(--text-light)]">
        {w.faqSubtitle}
      </p>
      <div className="flex flex-col gap-2">
        {faqs.map((faq, index) => (
          <div
            key={faq.q}
            className={`overflow-hidden rounded-[14px] border bg-white ${openFaqIndex === index ? "border-[var(--green-light)]" : "border-[var(--border-light)]"}`}
          >
            <button
              type="button"
              onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
              className={`flex w-full items-center justify-between gap-3.5 px-[22px] py-[18px] text-left text-[14px] font-semibold text-[var(--text)] ${fontSans}`}
            >
              {faq.q}
              <ChevronIcon open={openFaqIndex === index} />
            </button>
            {openFaqIndex === index ? (
              <p className="px-[22px] pb-[18px] text-[13.5px] leading-[1.6] text-[var(--text-mid)]">{faq.a}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

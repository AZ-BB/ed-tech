"use client";

import { CalendlyInlineEmbed } from "@/components/calendly-inline-embed";
import { useLocale } from "@/lib/i18n/locale-context";
import Link from "next/link";
import { ArrowBackIcon } from "../../../../_components/directional-icons";

type Props = {
  advisorName: string;
  calendlyUrl: string;
  prefill: { name: string; email: string };
};

export function InfluencerAdvisorBookClient({
  advisorName,
  calendlyUrl,
  prefill,
}: Props) {
  const { dict } = useLocale();
  const at = dict.student.advisors;
  const title = at.influencerCalendly.modalTitleNamed.replace("{name}", advisorName);

  return (
    <div className="-mx-6 min-h-[calc(100dvh-4rem)] bg-[linear-gradient(180deg,#F7FBF8_0%,var(--sand)_280px)] md:-mx-10 lg:-mx-16">
      <div className="relative mx-auto w-full min-w-0 max-w-[1120px] overflow-x-clip px-6 py-6 pb-16 md:px-10 md:py-8 lg:px-16">
        <Link
          href="/student/advisor-sessions"
          className="mb-5 inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-[50px] border-[1.5px] border-[var(--border)] bg-white px-4 py-2 text-[12px] font-medium text-[var(--text-mid)] no-underline transition hover:border-[var(--text-hint)] hover:-translate-x-0.5 sm:mb-7 sm:px-[18px] sm:text-[13px]"
        >
          <ArrowBackIcon size={16} />
          {at.book.backToAdvisors}
        </Link>
        <h1 className="font-[family-name:var(--font-dm-serif)] text-[22px] tracking-tight text-[var(--text)] sm:text-[26px]">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#8a8a8a]">
          {at.influencerCalendly.detailsNote}
        </p>
        <div className="mt-6 min-w-0 overflow-x-clip rounded-[var(--radius-lg)] border border-[#E8ECE9] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <CalendlyInlineEmbed
            url={calendlyUrl}
            prefill={prefill}
            title={title}
            className="min-h-[720px] w-full min-w-0 max-w-full rounded-none border-0 bg-white sm:min-h-[820px] md:min-h-[920px]"
          />
        </div>
      </div>
    </div>
  );
}

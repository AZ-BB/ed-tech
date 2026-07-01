"use client";

import Link from "next/link";

import { useLocale } from "@/lib/i18n/locale-context";

import { ArrowForwardIcon } from "../../_components/directional-icons";

export function UniversitiesPageIntro() {
  const { dict } = useLocale();
  const t = dict.student.universities;

  return (
    <>
      <div className="mb-5">
        <h1 className="serif mb-1 text-[22px] font-normal leading-tight text-[#1a1a1a] sm:text-[26px]">
          {t.pageTitle}
        </h1>
        <p className="text-sm leading-normal text-[#7a7a7a]">{t.pageSubtitle}</p>
      </div>

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#ece9e4] bg-white px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-5">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[#1a1a1a]">
            {t.aiMatchingBannerTitle}
          </div>
          <p className="mt-1 max-w-xl text-xs leading-snug text-[#7a7a7a]">
            {t.aiMatchingBannerSubtitle}
          </p>
        </div>
        <Link
          href="/student/ai-matching"
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 self-stretch rounded-full bg-[#2D6A4F] px-5 py-2.5 text-[13px] font-semibold text-white no-underline transition-all hover:-translate-y-px hover:bg-[#1B4332] sm:w-auto sm:self-center"
        >
          {t.openAiMatching}
          <ArrowForwardIcon size={16} />
        </Link>
      </div>
    </>
  );
}

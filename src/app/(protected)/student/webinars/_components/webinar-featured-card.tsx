"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLocale } from "@/lib/i18n/locale-context";

import type { StudentWebinarCard } from "../_lib/fetch-student-webinars";
import {
  fontSans,
  fontSerif,
  sectionDescClass,
  sectionEyebrowClass,
  sectionTitleClass,
  webinarDetailHref,
  type WebinarPageMode,
} from "./webinar-constants";
import { formatWebinarDate, formatWebinarTime } from "./webinar-format";
import { WebinarRegisterCta } from "./webinar-registration-modal";
import { WebinarSpeakerAvatar } from "./webinar-speaker-avatar";
import { WebinarTags } from "./webinar-tag-badge";
import { ChevronIcon, WebinarRegistrationProgress } from "./webinar-ui";

type WebinarFeaturedCardProps = {
  webinar: StudentWebinarCard;
  mode: WebinarPageMode;
  agendaOpen: boolean;
  onToggleAgenda: () => void;
  onRegister: (webinar: StudentWebinarCard) => void;
  titleAsLink?: boolean;
  sectionLabel?: string;
  sectionTitle?: string;
  sectionDescription?: string;
};

export function WebinarFeaturedCard({
  webinar,
  mode,
  agendaOpen,
  onToggleAgenda,
  onRegister,
  titleAsLink = false,
  sectionLabel,
  sectionTitle,
  sectionDescription,
}: WebinarFeaturedCardProps) {
  const { locale, dict } = useLocale();
  const w = dict.webinars;
  const detailHref = webinarDetailHref(webinar.id, mode, locale);
  const titleContent = titleAsLink ? (
    <Link
      href={detailHref}
      className={`${fontSerif} text-[22px] leading-[1.15] tracking-[-0.3px] break-words transition hover:text-[var(--green)] sm:text-[26px] md:text-[30px]`}
    >
      {webinar.title}
    </Link>
  ) : (
    <h3 className={`${fontSerif} text-[22px] leading-[1.15] tracking-[-0.3px] break-words sm:text-[26px] md:text-[30px]`}>{webinar.title}</h3>
  );

  return (
    <section className="mb-10 min-w-0 md:mb-[60px]">
      <p className={sectionEyebrowClass}>
        {sectionLabel ?? w.featuredSectionLabel}
      </p>
      <h2 className={sectionTitleClass}>
        {sectionTitle ?? w.featuredSectionTitle}
      </h2>
      <p className={sectionDescClass}>
        {sectionDescription ?? w.featuredSectionDescription}
      </p>

      <div className="grid min-w-0 overflow-x-clip rounded-[20px] border border-[var(--border-light)] bg-white sm:rounded-[24px] lg:grid-cols-[1.4fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4 p-5 sm:gap-[18px] sm:p-7 md:p-9">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full bg-[var(--amber-bg)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1px] text-[var(--amber)] ${fontSans}`}
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--amber)]" />
              {w.nextSessionBadge}
            </span>
            <WebinarTags tags={webinar.tags} />
          </div>
          {titleContent}
          <div className="flex min-w-0 flex-wrap gap-3 border-y border-[var(--border-light)] py-3.5 text-[12px] font-medium leading-snug text-[var(--text-mid)] sm:gap-6 sm:text-[13px]">
            <span className="shrink-0">{formatWebinarDate(webinar.scheduledAt)}</span>
            <span className="min-w-0 break-words">
              {formatWebinarTime(webinar.scheduledAt)} {webinar.timezoneLabel}
            </span>
            <span className="min-w-0 break-words">{webinar.format}</span>
          </div>
          <p className="text-[13.5px] leading-[1.6] text-[var(--text-mid)] break-words sm:text-[14px]">{webinar.description}</p>
          <div className="flex min-w-0 items-start gap-3.5 rounded-[14px] bg-[var(--sand)] p-3.5">
            <WebinarSpeakerAvatar webinar={webinar} size="featured" />
            <div className="min-w-0">
              <p className="text-[14px] font-bold leading-[1.2] break-words sm:text-[14.5px]">{webinar.speakerName}</p>
              <p className="mt-0.5 text-[12px] leading-[1.3] text-[var(--text-light)] break-words sm:text-[12.5px]">{webinar.speakerTitle}</p>
              {webinar.speakerBio ? (
                <p className="mt-1.5 text-[12px] leading-[1.5] text-[var(--text-mid)] break-words sm:text-[12.5px]">{webinar.speakerBio}</p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-col justify-center gap-5 bg-gradient-to-br from-[var(--green-pale)] to-[var(--green-bg)] p-5 sm:gap-6 sm:p-7 md:p-9">
          <WebinarRegistrationProgress
            registered={webinar.registeredCount}
            capacity={webinar.maxStudents}
            variant="featured"
          />
          <WebinarRegisterCta
            webinar={webinar}
            onRegister={onRegister}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--green)] px-6 py-4 text-[14px] font-bold text-white shadow-[0_4px_14px_rgba(45,106,79,0.25)] transition hover:bg-[var(--green-dark)] ${fontSans}`}
          />
          <button
            type="button"
            onClick={onToggleAgenda}
            className={`flex w-full items-center justify-between rounded-[14px] border border-[rgba(45,106,79,0.15)] bg-white px-[18px] py-3.5 text-[13px] font-semibold text-[var(--text)] ${fontSans}`}
          >
            {w.agendaLabel}
            <ChevronIcon open={agendaOpen} />
          </button>
          {agendaOpen ? (
            <ul className="rounded-[14px] border border-[var(--border-light)] bg-white px-5 py-[18px]">
              {webinar.agenda.map((item) => (
                <li
                  key={item}
                  className="relative py-1 pl-[18px] text-[12.5px] leading-[1.5] text-[var(--text-mid)] before:absolute before:left-0 before:top-[7px] before:h-[5px] before:w-[5px] before:rounded-full before:bg-[var(--green-light)]"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}

type WebinarGridCardProps = {
  webinar: StudentWebinarCard;
  mode: WebinarPageMode;
  agendaOpen: boolean;
  onToggleAgenda: () => void;
  onRegister: (webinar: StudentWebinarCard) => void;
};

export function WebinarGridCard({
  webinar,
  mode,
  agendaOpen,
  onToggleAgenda,
  onRegister,
}: WebinarGridCardProps) {
  const { locale, dict } = useLocale();
  const w = dict.webinars;
  const detailHref = webinarDetailHref(webinar.id, mode, locale);
  return (
    <article className="flex min-w-0 flex-col gap-3.5 rounded-[18px] border border-[var(--border-light)] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[var(--green-light)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] sm:p-6">
      <WebinarTags tags={webinar.tags} />
      <h3 className={`${fontSerif} text-[18px] leading-[1.2] tracking-[-0.2px] break-words sm:text-[20px]`}>
        <Link
          href={detailHref}
          className="transition hover:text-[var(--green)]"
        >
          {webinar.title}
        </Link>
      </h3>
      <div className="flex min-w-0 flex-wrap gap-2.5 text-[12px] text-[var(--text-light)] sm:gap-3.5 sm:text-[12.5px]">
        <span className="shrink-0">{formatWebinarDate(webinar.scheduledAt)}</span>
        <span className="min-w-0 break-words">
          {formatWebinarTime(webinar.scheduledAt)} {webinar.timezoneLabel}
        </span>
      </div>
      <p className="text-[13px] leading-[1.55] text-[var(--text-mid)] break-words sm:text-[13.5px]">{webinar.description}</p>
      <div className="flex min-w-0 items-center gap-2.5 rounded-[11px] bg-[var(--sand)] p-3">
        <WebinarSpeakerAvatar webinar={webinar} size="card" />
        <div className="min-w-0">
          <p className="text-[12.5px] font-bold leading-[1.2] break-words sm:text-[13px]">{webinar.speakerName}</p>
          <p className="mt-0.5 text-[11px] leading-[1.2] text-[var(--text-light)] break-words sm:text-[11.5px]">{webinar.speakerTitle}</p>
        </div>
      </div>
      <div>
        <WebinarRegistrationProgress
          registered={webinar.registeredCount}
          capacity={webinar.maxStudents}
          variant="card"
        />
      </div>
      <button
        type="button"
        onClick={onToggleAgenda}
        className={`flex w-full items-center justify-between border-t border-[var(--border-light)] pt-3 text-[12.5px] font-semibold text-[var(--text-mid)] transition hover:text-[var(--green)] ${fontSans}`}
      >
        {w.agendaLabel}
        <ChevronIcon open={agendaOpen} />
      </button>
      {agendaOpen ? (
        <ul>
          {webinar.agenda.map((item) => (
            <li
              key={item}
              className="relative py-1 pl-4 text-[12px] leading-[1.5] text-[var(--text-mid)] before:absolute before:left-0 before:top-[6px] before:h-1 before:w-1 before:rounded-full before:bg-[var(--green-light)]"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : null}
      <WebinarRegisterCta
        webinar={webinar}
        onRegister={onRegister}
        className={`mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[var(--green)] px-[18px] py-[11px] text-[13px] font-semibold text-white transition hover:bg-[var(--green-dark)] ${fontSans}`}
      />
    </article>
  );
}

export function WebinarPageShell({ children }: { children: ReactNode }) {
  return (
    <div className={`mx-auto w-full min-w-0 max-w-[1180px] overflow-x-clip pb-12 pt-2 sm:pb-16 sm:pt-4 md:pb-20 md:pt-6 ${fontSans} antialiased text-[var(--text)]`}>
      {children}
    </div>
  );
}

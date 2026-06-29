"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import type { StudentWebinarCard } from "../_lib/fetch-student-webinars";
import {
  fontSans,
  fontSerif,
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
  sectionLabel = "Next session",
  sectionTitle = "Featured upcoming webinar",
  sectionDescription = "Our next live session — register early as seats are limited.",
}: WebinarFeaturedCardProps) {
  const titleContent = titleAsLink ? (
    <Link
      href={webinarDetailHref(webinar.id, mode)}
      className={`${fontSerif} text-[30px] leading-[1.15] tracking-[-0.3px] transition hover:text-[var(--green)]`}
    >
      {webinar.title}
    </Link>
  ) : (
    <h3 className={`${fontSerif} text-[30px] leading-[1.15] tracking-[-0.3px]`}>{webinar.title}</h3>
  );

  return (
    <section className="mb-[60px]">
      <p
        className={`mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[1.5px] text-[var(--green)] before:h-[1.5px] before:w-6 before:bg-[var(--green)] ${fontSans}`}
      >
        {sectionLabel}
      </p>
      <h2 className={`mb-2 ${fontSerif} text-[32px] leading-[1.15] tracking-[-0.3px]`}>{sectionTitle}</h2>
      <p className="mb-7 max-w-[640px] text-[14.5px] leading-[1.55] text-[var(--text-light)]">
        {sectionDescription}
      </p>

      <div className="grid overflow-hidden rounded-[24px] border border-[var(--border-light)] bg-white lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-[18px] p-9 max-[600px]:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full bg-[var(--amber-bg)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1px] text-[var(--amber)] ${fontSans}`}
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--amber)]" />
              Next session
            </span>
            <WebinarTags tags={webinar.tags} />
          </div>
          {titleContent}
          <div className="flex flex-wrap gap-6 border-y border-[var(--border-light)] py-3.5 text-[13px] font-medium leading-none text-[var(--text-mid)]">
            <span>{formatWebinarDate(webinar.scheduledAt)}</span>
            <span>
              {formatWebinarTime(webinar.scheduledAt)} {webinar.timezoneLabel}
            </span>
            <span>{webinar.format}</span>
          </div>
          <p className="text-[14px] leading-[1.6] text-[var(--text-mid)]">{webinar.description}</p>
          <div className="flex items-center gap-3.5 rounded-[14px] bg-[var(--sand)] p-3.5">
            <WebinarSpeakerAvatar webinar={webinar} size="featured" />
            <div>
              <p className="text-[14.5px] font-bold leading-[1.2]">{webinar.speakerName}</p>
              <p className="mt-0.5 text-[12.5px] leading-[1.3] text-[var(--text-light)]">{webinar.speakerTitle}</p>
              {webinar.speakerBio ? (
                <p className="mt-1.5 text-[12.5px] leading-[1.5] text-[var(--text-mid)]">{webinar.speakerBio}</p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-6 bg-gradient-to-br from-[var(--green-pale)] to-[var(--green-bg)] p-9 max-[600px]:p-6">
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
            What will be covered
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
  return (
    <article className="flex flex-col gap-3.5 rounded-[18px] border border-[var(--border-light)] bg-white p-6 transition hover:-translate-y-0.5 hover:border-[var(--green-light)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
      <WebinarTags tags={webinar.tags} />
      <h3 className={`${fontSerif} text-[20px] leading-[1.2] tracking-[-0.2px]`}>
        <Link
          href={webinarDetailHref(webinar.id, mode)}
          className="transition hover:text-[var(--green)]"
        >
          {webinar.title}
        </Link>
      </h3>
      <div className="flex flex-wrap gap-3.5 text-[12.5px] text-[var(--text-light)]">
        <span>{formatWebinarDate(webinar.scheduledAt)}</span>
        <span>
          {formatWebinarTime(webinar.scheduledAt)} {webinar.timezoneLabel}
        </span>
      </div>
      <p className="text-[13.5px] leading-[1.55] text-[var(--text-mid)]">{webinar.description}</p>
      <div className="flex items-center gap-2.5 rounded-[11px] bg-[var(--sand)] p-3">
        <WebinarSpeakerAvatar webinar={webinar} size="card" />
        <div>
          <p className="text-[13px] font-bold leading-[1.2]">{webinar.speakerName}</p>
          <p className="mt-0.5 text-[11.5px] leading-[1.2] text-[var(--text-light)]">{webinar.speakerTitle}</p>
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
        What will be covered
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
    <div className={`mx-auto max-w-[1180px] pb-20 pt-6 ${fontSans} antialiased text-[var(--text)]`}>
      {children}
    </div>
  );
}

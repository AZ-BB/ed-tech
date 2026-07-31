"use client";

import {
  Bookmark,
  Calendar,
  ChevronLeft,
  ClipboardCheck,
  ExternalLink,
  Home,
  Info,
  Lightbulb,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { StudentEventCard } from "../_lib/get-event-discovery-page";
import { EventTypeIcon } from "./event-type-icon";
import {
  DEFAULT_WHY_ATTEND,
  eventCountdown,
  eventStatusDotColor,
  formatEventDateParts,
  formatEventTimeLabel,
  formatRegionFocusLabel,
  isOnlineEventMode,
  resolveEventTypeStyle,
  splitSemicolonList,
} from "@/lib/event-type-styles";

type EventDetailViewProps = {
  event: StudentEventCard;
  onBack: () => void;
  isSaved: boolean;
  onToggleSave: () => void | Promise<void>;
  labels: {
    backToEvents: string;
    overview: string;
    whyAttend: string;
    whosAttending: string;
    prepare: string;
    howToPrepare: string;
    goodFor: string;
    register: string;
    addToCalendar: string;
    saveEvent: string;
    saved: string;
    yourActions: string;
    quickInfo: string;
    time: string;
    format: string;
    focus: string;
    universities: string;
    status: string;
    formatOnline: string;
    formatInPerson: string;
    pastEvent: string;
    universitiesExpected: (count: number, online: boolean) => string;
    noBooths: string;
    selectionLabel: string;
    moreUniversities: (count: number) => string;
    advisorTitle: string;
    advisorBody: string;
    bookAdvisor: string;
  };
};

const SECTION_IDS = ["d-overview", "d-why", "d-attending", "d-prepare"] as const;
type DetailSection = (typeof SECTION_IDS)[number];

function buildCalendarUrl(event: StudentEventCard): string | null {
  if (!event.dateStart) return null;
  const d = new Date(`${event.dateStart}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;

  const start = d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const endDate = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  const end = endDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const location = isOnlineEventMode(event.mode)
    ? "Online"
    : [event.venue, event.city, event.country].filter(Boolean).join(", ");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.name,
    dates: `${start}/${end}`,
    details: `${event.shortDescription}\n\n${event.registrationUrl ?? ""}`,
    location,
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
}

export function EventDetailView({
  event,
  onBack,
  isSaved,
  onToggleSave,
  labels,
}: EventDetailViewProps) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<DetailSection>("d-overview");

  const style = resolveEventTypeStyle(event.eventType);
  const date = formatEventDateParts(event.dateStart);
  const countdown = eventCountdown(event.dateStart);
  const online = isOnlineEventMode(event.mode);
  const audience = splitSemicolonList(event.targetAudience);
  const whyItems =
    splitSemicolonList(event.whyAttend).length > 0
      ? splitSemicolonList(event.whyAttend)
      : DEFAULT_WHY_ATTEND[style.key];
  const universities = splitSemicolonList(event.universitiesAttending);
  const prep = splitSemicolonList(event.prepSteps);
  const calendarUrl = buildCalendarUrl(event);
  const registrationUrl = event.registrationUrl?.trim() || null;
  const statusDot = eventStatusDotColor(countdown.cls, event.registrationStatus);
  const statusText =
    countdown.cls === "past"
      ? labels.pastEvent
      : event.registrationStatus?.trim() || "Registration open";
  const timeLabel = formatEventTimeLabel(event.startTime, event.endTime, event.timezone);
  const formatLabel = online ? labels.formatOnline : labels.formatInPerson;
  const focusLabel = formatRegionFocusLabel(event.regionFocus);
  const universityStat =
    (event.universityCount ?? 0) > 0 ? String(event.universityCount) : "—";

  useEffect(() => {
    window.scrollTo({ top: 0 });
    setActiveSection("d-overview");
  }, [event.id]);

  useEffect(() => {
    const onScroll = () => {
      const offset = (tabsRef.current?.offsetHeight ?? 0) + 60;
      let next: DetailSection = "d-overview";
      for (let i = SECTION_IDS.length - 1; i >= 0; i -= 1) {
        const section = document.getElementById(SECTION_IDS[i]);
        if (section && section.getBoundingClientRect().top <= offset) {
          next = SECTION_IDS[i];
          break;
        }
      }
      setActiveSection(next);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [event.id]);

  const scrollToSection = (id: DetailSection) => {
    const section = document.getElementById(id);
    const tabs = tabsRef.current;
    if (!section) return;
    const offset = (tabs?.offsetHeight ?? 0) + 8;
    const top = section.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <div className="mx-auto w-full max-w-[960px] px-5 pb-16 pt-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--border-light)] bg-white px-[18px] py-2 text-[12px] font-medium text-[var(--text-mid)] transition hover:border-[var(--green)] hover:bg-[var(--green-pale)] hover:text-[var(--green)]"
      >
        <ChevronLeft className="size-3.5" strokeWidth={2} aria-hidden />
        {labels.backToEvents}
      </button>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="relative mb-4 overflow-visible rounded-[12px] border border-[var(--border-light)] bg-white">
            <div className="relative h-[190px] overflow-hidden rounded-t-[12px]" style={{ background: style.heroGradient }}>
              <div className="absolute inset-0 bg-gradient-to-b from-black/[0.02] to-black/[0.15]" />
              <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px]" />
            </div>

            <div
              className="absolute left-6 top-[162px] z-[5] flex h-16 w-16 items-center justify-center rounded-[16px] border-[3px] border-white bg-white shadow-[0_2px_12px_rgba(0,0,0,0.1)]"
            >
              <div
                className="flex h-[52px] w-[52px] items-center justify-center rounded-[12px] p-2"
                style={{ background: style.band }}
              >
                <EventTypeIcon typeKey={style.key} className="size-[26px]" color={style.ink} />
              </div>
            </div>

            <div className="px-6 pb-4 pt-10">
              <h1 className="font-[family-name:var(--font-dm-serif)] text-[22px] font-bold text-[var(--text)]">
                {event.name}
              </h1>
              <p className="mt-0.5 text-[14px] text-[var(--text-light)]">
                {date.full} · {online ? labels.formatOnline : [event.city, event.country].filter(Boolean).join(", ")}
              </p>
              <span className="mt-2.5 inline-block rounded-full bg-[var(--green-bg)] px-3 py-1 text-[12px] font-medium text-[var(--green)]">
                {event.eventType}
              </span>
            </div>

            <div
              ref={tabsRef}
              className="sticky top-0 z-10 flex border-b border-[var(--border-light)] bg-white px-6"
            >
              {(
                [
                  ["d-overview", labels.overview],
                  ["d-why", labels.whyAttend],
                  ["d-attending", labels.whosAttending],
                  ["d-prepare", labels.prepare],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => scrollToSection(id)}
                  className={`border-b-2 px-[18px] py-3 text-[13px] font-medium transition ${
                    activeSection === id
                      ? "border-[var(--green)] text-[var(--green-dark)]"
                      : "border-transparent text-[var(--text-light)] hover:text-[var(--text-mid)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <section id="d-overview" className="border-b border-[var(--border-light)] px-6 py-5">
              <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-[var(--text)]">
                <Info className="size-4 opacity-50" strokeWidth={1.8} aria-hidden />
                {labels.overview}
              </h2>
              <p className="mb-3.5 text-[13.5px] leading-[1.65] text-[var(--text-mid)]">
                {event.fullOverview || event.shortDescription}
              </p>
              <div className="mb-2 text-[13px] font-semibold text-[var(--text)]">{labels.goodFor}</div>
              <div className="flex flex-wrap gap-1">
                {audience.map((item) => (
                  <span
                    key={item}
                    className="mb-1.5 mr-1 inline-block rounded-full border border-[var(--border)] bg-[var(--sand)] px-3.5 py-1.5 text-[12px] font-medium text-[var(--text-mid)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </section>

            <section id="d-why" className="border-b border-[var(--border-light)] px-6 py-5">
              <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-[var(--text)]">
                <Lightbulb className="size-4 opacity-50" strokeWidth={1.8} aria-hidden />
                {labels.whyAttend}
              </h2>
              {whyItems.map((item) => (
                <div key={item} className="flex items-start gap-2 py-0.5 text-[13px] text-[var(--text-mid)]">
                  <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-[var(--green-light)]" />
                  {item}
                </div>
              ))}
            </section>

            <section id="d-attending" className="border-b border-[var(--border-light)] px-6 py-5">
              <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-[var(--text)]">
                <Home className="size-4 opacity-50" strokeWidth={1.8} aria-hidden />
                {labels.whosAttending}
              </h2>
              {universities.length > 0 ? (
                <>
                  {(event.universityCount ?? 0) > 0 ? (
                    <p className="mb-3.5 text-[13.5px] leading-[1.65] text-[var(--text-mid)]">
                      {event.universityCount} universities are attending. {labels.selectionLabel}
                    </p>
                  ) : (
                    <p className="mb-3.5 text-[13.5px] leading-[1.65] text-[var(--text-mid)]">
                      {labels.selectionLabel}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {universities.map((uni) => (
                      <span
                        key={uni}
                        className="inline-block rounded-full border border-[var(--border)] bg-[var(--sand)] px-3.5 py-1.5 text-[12px] font-medium text-[var(--text-mid)]"
                      >
                        {uni}
                      </span>
                    ))}
                    {(event.universityCount ?? 0) > universities.length ? (
                      <span className="inline-block rounded-full border border-[var(--border)] bg-[var(--sand)] px-3.5 py-1.5 text-[12px] font-medium text-[var(--text-mid)]">
                        {labels.moreUniversities((event.universityCount ?? 0) - universities.length)}
                      </span>
                    ) : null}
                  </div>
                </>
              ) : (event.universityCount ?? 0) > 0 ? (
                <p className="text-[13.5px] leading-[1.65] text-[var(--text-mid)]">
                  {labels.universitiesExpected(event.universityCount ?? 0, online)}
                </p>
              ) : (
                <p className="text-[13.5px] leading-[1.65] text-[var(--text-mid)]">{labels.noBooths}</p>
              )}
            </section>

            <section id="d-prepare" className="px-6 py-5">
              <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-[var(--text)]">
                <ClipboardCheck className="size-4 opacity-50" strokeWidth={1.8} aria-hidden />
                {labels.howToPrepare}
              </h2>
              {prep.map((step, index) => (
                <div
                  key={step}
                  className={`flex items-start gap-3 py-[11px] ${index > 0 ? "border-t border-[var(--border-light)]" : ""}`}
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--green)] text-[12px] font-bold text-white">
                    {index + 1}
                  </div>
                  <p className="pt-0.5 text-[13.5px] leading-[1.55] text-[var(--text-mid)]">{step}</p>
                </div>
              ))}
            </section>
          </div>
        </div>

        <aside className="w-full lg:w-[220px] lg:min-w-[220px]">
          <div className="sticky top-6 rounded-[12px] border border-[var(--border-light)] bg-white p-5">
            <h3 className="mb-3.5 text-[14px] font-semibold text-[var(--text)]">{labels.yourActions}</h3>

            {registrationUrl ? (
              <a
                href={registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-2 flex w-full items-center gap-2.5 rounded-lg border border-[var(--green)] bg-[var(--green)] px-3.5 py-[11px] text-[13px] font-semibold text-white transition hover:bg-[var(--green-dark)]"
              >
                <ExternalLink className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                {labels.register}
              </a>
            ) : null}

            {calendarUrl ? (
              <a
                href={calendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-2 flex w-full items-center gap-2.5 rounded-lg border border-[var(--border)] bg-white px-3.5 py-[11px] text-[13px] font-medium text-[var(--text)] transition hover:border-[var(--text-hint)] hover:bg-[var(--sand)]"
              >
                <Calendar className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
                {labels.addToCalendar}
              </a>
            ) : null}

            <button
              type="button"
              onClick={() => void onToggleSave()}
              className="mb-2 flex w-full items-center gap-2.5 rounded-lg border border-[var(--border)] bg-white px-3.5 py-[11px] text-[13px] font-medium text-[var(--text)] transition hover:border-[var(--text-hint)] hover:bg-[var(--sand)]"
            >
              <Bookmark
                className="size-4 shrink-0"
                strokeWidth={1.8}
                fill={isSaved ? "currentColor" : "none"}
                aria-hidden
              />
              {isSaved ? labels.saved : labels.saveEvent}
            </button>

            <div className="my-3.5 border-t border-[var(--border-light)]" />

            <div className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.5px] text-[var(--text-hint)]">
              {labels.quickInfo}
            </div>
            <SidebarStat label={labels.time} value={timeLabel} />
            <SidebarStat label={labels.format} value={formatLabel} />
            <SidebarStat label={labels.focus} value={focusLabel} />
            <SidebarStat label={labels.universities} value={universityStat} />

            <div className="my-3.5 border-t border-[var(--border-light)]" />

            <div className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.5px] text-[var(--text-hint)]">
              {labels.status}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border-light)] bg-[var(--sand)] px-3.5 py-2.5">
              <div
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: statusDot }}
              />
              <span className="text-[12px] font-medium text-[var(--text-mid)]">
                {statusText} · {countdown.text}
              </span>
            </div>

            <div className="mt-3.5 rounded-lg border border-[#EADFC6] bg-gradient-to-br from-[#FAF6ED] to-white p-4">
              <div className="font-[family-name:var(--font-dm-serif)] text-[14.5px] leading-snug text-[var(--green-dark)]">
                {labels.advisorTitle}
              </div>
              <p className="mb-3 mt-1 text-[11.5px] leading-normal text-[var(--text-light)]">
                {labels.advisorBody}
              </p>
              <Link
                href="/student/advisor-sessions"
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#B08D4F] px-2.5 py-2.5 text-[12.5px] font-semibold text-white transition hover:bg-[#9a7a42]"
              >
                <UserRound className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                {labels.bookAdvisor}
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SidebarStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-[12px]">
      <span className="text-[var(--text-light)]">{label}</span>
      <span className="font-semibold text-[var(--text)]">{value}</span>
    </div>
  );
}

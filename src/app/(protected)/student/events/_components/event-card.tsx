"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import type { StudentEventCard } from "../_lib/get-event-discovery-page";
import { EventTypeIcon } from "./event-type-icon";
import {
  eventCountdown,
  formatEventDateParts,
  formatEventTimeLabel,
  isOnlineEventMode,
  resolveEventTypeStyle,
  splitSemicolonList,
  type EventCountdownLabels,
} from "@/lib/event-type-styles";

type EventCardProps = {
  event: StudentEventCard;
  isSaved: boolean;
  onOpen: () => void;
  onToggleSave: () => void;
  labels: {
    viewDetails: string;
    liveOnline: string;
    universitiesAttending: (count: number) => string;
    joiningOnline: string;
    attendingInPerson: string;
    hostingEvent: string;
    applicationFocused: string;
    applicationFocusedSub: string;
    saveAria: string;
  };
};

function countdownClasses(cls: ReturnType<typeof eventCountdown>["cls"]) {
  switch (cls) {
    case "soon":
      return {
        text: "text-[#9A6F1E]",
        dot: "bg-[#B08D4F] animate-[pulseGold_2s_infinite]",
      };
    case "near":
      return {
        text: "text-[var(--green)]",
        dot: "bg-[#52B788]",
      };
    default:
      return {
        text: "text-[var(--text-hint)]",
        dot: "bg-[var(--border)]",
      };
  }
}

export function EventCard({
  event,
  isSaved,
  onOpen,
  onToggleSave,
  labels,
}: EventCardProps) {
  const { locale, dict } = useLocale();
  const eventLabels = dict.student.events;
  const countdownLabels: EventCountdownLabels = {
    dateTbc: eventLabels.countdownDateTbc,
    pastEvent: eventLabels.pastEvent,
    today: eventLabels.countdownToday,
    tomorrow: eventLabels.countdownTomorrow,
    inDays: (count) => eventLabels.countdownInDays.replace("{count}", String(count)),
  };

  const style = resolveEventTypeStyle(event.eventType);
  const date = formatEventDateParts(event.dateStart, locale, eventLabels.countdownDateTbc);
  const countdown = eventCountdown(event.dateStart, countdownLabels, locale);
  const countdownStyle = countdownClasses(countdown.cls);
  const online = isOnlineEventMode(event.mode);
  const uniCount = event.universityCount ?? 0;
  const uniList = splitSemicolonList(event.universitiesAttending);
  const singleHost = uniList.length === 1 ? uniList[0] : null;
  const shownUnis = uniList.slice(0, 3);
  const moreUnis = uniCount > shownUnis.length ? uniCount - shownUnis.length : 0;

  return (
    <article
      className="flex h-full cursor-pointer flex-col rounded-[18px] border border-[var(--border-light)] bg-white p-6 shadow-[0_1px_2px_rgba(20,40,30,0.03),0_12px_26px_-18px_rgba(20,40,30,0.16)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-[4px] hover:border-[var(--border)] hover:shadow-[0_8px_16px_-8px_rgba(20,40,30,0.10),0_28px_46px_-24px_rgba(20,40,30,0.26)]"
      dir={event.useRtlContent ? "rtl" : "ltr"}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      tabIndex={0}
      role="button"
    >
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div
          className="flex h-[58px] w-[52px] shrink-0 flex-col items-center justify-center rounded-[13px]"
          style={{ background: style.band }}
        >
          <div
            className="font-[family-name:var(--font-dm-serif)] text-[23px] leading-none"
            style={{ color: style.ink }}
          >
            {date.day}
          </div>
          <div
            className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.05em]"
            style={{ color: style.ink }}
          >
            {date.month}
          </div>
        </div>
        <div className="flex flex-col items-end gap-[7px]">
          <span
            className="inline-flex max-w-full items-center gap-[5px] rounded-full px-[11px] py-[5px] text-[10px] font-bold uppercase tracking-[0.04em]"
            style={{ background: style.band, color: style.ink }}
          >
            <EventTypeIcon typeKey={style.key} className="size-[11px]" color={style.ink} />
            {event.eventType}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${countdownStyle.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${countdownStyle.dot}`} />
            {countdown.text}
          </span>
        </div>
      </div>

      <h3 className="mb-1 font-[family-name:var(--font-dm-serif)] text-[16.5px] font-bold leading-[1.28] text-[var(--text)]">
        {event.name}
      </h3>
      <p className="mb-[15px] text-[12px] font-medium text-[var(--green)]">
        {event.organizer || "—"}
      </p>

      <div className="mb-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[12.5px] text-[var(--text-mid)]">
          <ClockIcon />
          {formatEventTimeLabel(
            event.startTime,
            event.endTime,
            event.timezone,
            eventLabels.timeTbc,
          )}
        </div>
        {online ? (
          <div className="flex items-center gap-2 text-[12.5px] font-semibold text-[var(--green)]">
            <span className="relative inline-flex h-[7px] w-[7px]">
              <span className="absolute inline-flex h-full w-full animate-[pulseGreen_2s_infinite] rounded-full bg-[#52B788] opacity-75" />
              <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-[#52B788]" />
            </span>
            {labels.liveOnline}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[12.5px] text-[var(--text-mid)]">
            <PinIcon />
            {[event.city, event.country].filter(Boolean).join(", ") || "—"}
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center gap-[11px] border-t border-[var(--border-light)] pt-[15px]">
        {uniCount === 1 && singleHost ? (
          <>
            <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] border border-[var(--border-light)] bg-[var(--sand)] text-[var(--text-mid)]">
              <DocIcon />
            </div>
            <div className="min-w-0 text-[11px] leading-[1.35] text-[var(--text-light)]">
              <strong className="text-[12px] font-semibold text-[var(--text-mid)]">
                {singleHost}
              </strong>
              <br />
              {labels.hostingEvent}
            </div>
          </>
        ) : uniCount > 1 ? (
          <>
            <div className="flex shrink-0">
              {shownUnis.map((uni, index) => (
                <div
                  key={uni}
                  className={`flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-white bg-[var(--green-bg)] text-[14px] font-bold text-[var(--green-dark)] shadow-[0_1px_3px_rgba(0,0,0,0.1)] ${index > 0 ? "-ml-[9px]" : ""}`}
                  title={uni}
                >
                  {uni.charAt(0).toUpperCase()}
                </div>
              ))}
              {moreUnis > 0 ? (
                <div className="-ml-[9px] flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-white bg-[var(--green-dark)] text-[10px] font-bold text-white shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
                  +{moreUnis}
                </div>
              ) : null}
            </div>
            <div className="min-w-0 text-[11px] leading-[1.35] text-[var(--text-light)]">
              <strong className="text-[12px] font-semibold text-[var(--text-mid)]">
                {labels.universitiesAttending(uniCount)}
              </strong>
              <br />
              {online ? labels.joiningOnline : labels.attendingInPerson}
            </div>
          </>
        ) : (
          <>
            <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] border border-[var(--border-light)] bg-[var(--sand)] text-[var(--text-mid)]">
              <DocIcon />
            </div>
            <div className="min-w-0 text-[11px] leading-[1.35] text-[var(--text-light)]">
              <strong className="text-[12px] font-semibold text-[var(--text-mid)]">
                {labels.applicationFocused}
              </strong>
              <br />
              {labels.applicationFocusedSub}
            </div>
          </>
        )}
      </div>

      <div
        className="mt-[15px] flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label={labels.saveAria}
          onClick={onToggleSave}
          className={`inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] border transition-colors ${
            isSaved
              ? "border-[var(--green)] bg-[var(--green-pale)] text-[var(--green)]"
              : "border-[var(--border)] bg-white text-[var(--text-hint)] hover:border-[var(--green)] hover:text-[var(--green)]"
          }`}
        >
          <BookmarkIcon filled={isSaved} />
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 rounded-full bg-[var(--green)] px-3.5 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[var(--green-dark)]"
        >
          {labels.viewDetails}
        </button>
      </div>
    </article>
  );
}

function ClockIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0 text-[var(--text-hint)]"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0 text-[var(--text-hint)]"
      aria-hidden
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  );
}

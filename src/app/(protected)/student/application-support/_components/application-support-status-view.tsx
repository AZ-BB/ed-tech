"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import { format } from "date-fns";
import Link from "next/link";
import type { ReactNode } from "react";

import type {
  StudentApplicationSupportAwaitingReviewView,
  StudentApplicationSupportPaymentPendingView,
  StudentApplicationSupportScheduledView,
} from "../_lib/fetch-student-application-support-view";

import "../application-support.css";

type StatusViewProps =
  | StudentApplicationSupportScheduledView
  | StudentApplicationSupportPaymentPendingView
  | StudentApplicationSupportAwaitingReviewView;

function formatScheduledMeetingDate(iso: string, locale: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return format(date, locale === "ar" ? "d MMM yyyy · h:mm a" : "d MMM yyyy · h:mm a");
  } catch {
    return iso;
  }
}

function formatDueDate(ymd: string, locale: string): string {
  try {
    const date = new Date(`${ymd.slice(0, 10)}T12:00:00`);
    if (Number.isNaN(date.getTime())) return ymd;
    return date.toLocaleDateString(locale === "ar" ? "ar" : undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return ymd;
  }
}

function StatusCard({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div
      id="application-support-scope"
      className="min-w-0 max-w-full overflow-x-clip pb-16 font-[family-name:var(--font-dm-sans)]"
    >
      <div className="mx-auto max-w-[640px] px-0 py-6 sm:py-10">
        <div className="rounded-[14px] border border-[var(--border-light)] bg-white px-6 py-8 text-center shadow-[0_2px_12px_rgba(0,0,0,0.03)] sm:px-8 sm:py-10">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--green)]">
            {eyebrow}
          </div>
          <h1 className="font-[family-name:var(--font-dm-serif)] text-[24px] leading-tight text-[var(--text)] sm:text-[28px]">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-[480px] text-sm leading-relaxed text-[var(--text-mid)]">
            {body}
          </p>
          {children ? <div className="mt-6">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function ApplicationSupportStatusView(props: StatusViewProps) {
  const { dict, locale } = useLocale();
  const copy = dict.student.applicationSupport.statusViews;

  if (props.kind === "scheduled") {
    const formattedDate = formatScheduledMeetingDate(props.scheduledAt, locale);
    return (
      <StatusCard
        eyebrow={copy.scheduledEyebrow}
        title={copy.scheduledTitle}
        body={copy.scheduledMessage.replace("{date}", formattedDate)}
      >
        <div className="inline-flex rounded-full bg-[var(--green-pale)] px-4 py-2 text-[13px] font-semibold text-[var(--green-dark)]">
          {formattedDate}
        </div>
      </StatusCard>
    );
  }

  if (props.kind === "payment_pending") {
    const amountLine =
      props.amountAed != null
        ? copy.paymentAmount.replace(
            "{amount}",
            props.amountAed.toLocaleString(locale === "ar" ? "ar" : undefined),
          )
        : null;
    const dueLine = props.dueDate
      ? copy.paymentDue.replace("{date}", formatDueDate(props.dueDate, locale))
      : null;
    const planLine = props.planName
      ? copy.paymentPlan.replace("{plan}", props.planName)
      : null;

    return (
      <StatusCard
        eyebrow={copy.paymentEyebrow}
        title={copy.paymentTitle}
        body={copy.paymentMessage}
      >
        <div className="mx-auto flex max-w-[420px] flex-col gap-2 text-[13px] text-[var(--text-mid)]">
          {planLine ? <p>{planLine}</p> : null}
          {amountLine ? <p className="font-semibold text-[var(--text)]">{amountLine}</p> : null}
          {dueLine ? <p>{dueLine}</p> : null}
        </div>
        {props.paymentUrl ? (
          <Link
            href={props.paymentUrl}
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-pill)] bg-[var(--green)] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[var(--green-dark)]"
          >
            {copy.paymentCta}
          </Link>
        ) : (
          <p className="mt-5 text-[12.5px] text-[var(--text-light)]">
            {copy.paymentNoLink}
          </p>
        )}
      </StatusCard>
    );
  }

  return (
    <StatusCard
      eyebrow={copy.awaitingEyebrow}
      title={copy.awaitingTitle}
      body={copy.awaitingMessage}
    />
  );
}

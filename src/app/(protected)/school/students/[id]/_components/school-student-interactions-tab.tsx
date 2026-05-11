"use client";

import { addSchoolStudentInteraction } from "@/actions/school-students";
import type { SchoolStudentDetailPayload } from "@/app/(protected)/school/students/[id]/_lib/fetch-school-student-detail";
import {
  STUDENT_INTERACTION_KIND_LABELS,
  STUDENT_INTERACTION_KINDS,
  STUDENT_INTERACTION_OUTCOMES,
  type StudentInteractionKind,
} from "@/lib/student-interaction-constants";
import { format, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { SchoolStudentPanel } from "./school-student-panel";

type InteractionRow = SchoolStudentDetailPayload["studentInteractions"][number];

function outcomeVisual(outcome: string): "green" | "amber" | "red" | "grey" {
  if (outcome === "Productive" || outcome === "Resolved") return "green";
  if (outcome === "Follow-up needed") return "amber";
  if (outcome === "Concern raised" || outcome === "No-show") return "red";
  return "grey";
}

function InteractionKindIcon({ kind }: { kind: string }) {
  const stroke = 2;
  const cls = "h-[14px] w-[14px] shrink-0";
  switch (kind as StudentInteractionKind) {
    case "meeting":
      return (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
        >
          <title>Meeting</title>
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      );
    case "call":
      return (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
        >
          <title>Call</title>
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
        </svg>
      );
    case "email":
      return (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
        >
          <title>Email</title>
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <path d="M22 6l-10 7L2 6" />
        </svg>
      );
    case "parent":
      return (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
        >
          <title>Parent</title>
          <path d="M3 12c0-4.97 4.03-9 9-9s9 4.03 9 9c0 1.95-.62 3.76-1.68 5.24l1.43 4.76-4.76-1.43A9 9 0 013 12z" />
        </svg>
      );
    case "intervention":
      return (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
        >
          <title>Intervention</title>
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
        </svg>
      );
    default:
      return (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
        >
          <title>Interaction</title>
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}

function iconWrapClass(kind: string): string {
  switch (kind) {
    case "meeting":
      return "bg-[rgba(52,152,219,.12)] text-[#3498DB]";
    case "call":
      return "bg-[var(--green-bg)] text-[var(--green)]";
    case "email":
      return "bg-[rgba(142,68,173,.12)] text-[#8E44AD]";
    case "parent":
      return "bg-[rgba(230,126,34,.12)] text-[#E67E22]";
    case "intervention":
      return "bg-[rgba(231,76,60,.12)] text-[#E74C3C]";
    default:
      return "bg-[var(--cream)] text-[var(--text-mid)]";
  }
}

function OutcomePill({ outcome }: { outcome: string }) {
  const v = outcomeVisual(outcome);
  const pillCls =
    v === "green"
      ? "bg-[rgba(82,183,135,.13)] text-[#1B4332] [&_.int-pill-dot]:bg-[var(--green-bright)]"
      : v === "amber"
        ? "bg-[rgba(212,162,42,.14)] text-[#7a5d10] [&_.int-pill-dot]:bg-[#D4A22A]"
        : v === "red"
          ? "bg-[rgba(231,76,60,.12)] text-[#8c2d22] [&_.int-pill-dot]:bg-[#E74C3C]"
          : "bg-[#ECEAE5] text-[var(--text-mid)] [&_.int-pill-dot]:bg-[#a0a0a0]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold leading-snug ${pillCls}`}
    >
      <span className="int-pill-dot h-1.5 w-1.5 rounded-full" />
      {outcome}
    </span>
  );
}

function formatOccurredOn(isoDate: string): string {
  try {
    const d = parseISO(isoDate);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export function SchoolStudentInteractionsTab({
  studentId,
  interactions,
}: {
  studentId: string;
  interactions: InteractionRow[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const todayIso = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  useEffect(() => {
    if (!modalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) setModalOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, pending]);

  async function submit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      const res = await addSchoolStudentInteraction(null, formData);
      const errMsg =
        res.error == null
          ? null
          : typeof res.error === "string"
            ? res.error
            : "Something went wrong.";
      if (errMsg) {
        setError(errMsg);
      } else {
        formRef.current?.reset();
        setModalOpen(false);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  const kindLabel = (k: string) =>
    k in STUDENT_INTERACTION_KIND_LABELS
      ? STUDENT_INTERACTION_KIND_LABELS[k as StudentInteractionKind]
      : k;

  return (
    <>
      <SchoolStudentPanel
        head="Interactions log"
        sub="Every meeting, call, email, and parent contact — used for end-of-year reporting and inspections"
        actions={
          <button
            type="button"
            onClick={() => {
              setError(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border-[1.5px] border-[var(--green)] bg-[var(--green)] px-2.5 py-1.5 font-[family-name:var(--font-dm-sans)] text-[11.5px] font-semibold text-white hover:border-[var(--green-dark)] hover:bg-[var(--green-dark)]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              className="h-[13px] w-[13px]"
              aria-hidden
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Log interaction
          </button>
        }
      >
        {interactions.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-[var(--text-light)]">
            No interactions logged yet — log the first one above
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {interactions.map((it) => (
              <div
                key={it.id}
                className="flex gap-3 rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconWrapClass(it.interactionKind)}`}
                >
                  <InteractionKindIcon kind={it.interactionKind} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-[family-name:var(--font-dm-sans)] text-[13px] font-semibold text-[var(--text)]">
                      {kindLabel(it.interactionKind)}
                    </span>
                    <OutcomePill outcome={it.outcome} />
                    <span className="font-[family-name:var(--font-dm-sans)] text-[11.5px] text-[var(--text-hint)]">
                      {formatOccurredOn(it.occurredOn)}
                      {it.durationMinutes != null &&
                      Number.isFinite(it.durationMinutes)
                        ? ` · ${it.durationMinutes} min`
                        : ""}
                    </span>
                  </div>
                  <div className="font-[family-name:var(--font-dm-sans)] text-[12.5px] leading-[1.5] text-[var(--text-mid)] whitespace-pre-wrap">
                    {it.notes}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SchoolStudentPanel>

      {modalOpen ? (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- backdrop pattern matches tasks modal
        <div
          role="presentation"
          className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(15,30,20,0.5)] px-4 py-6"
          onClick={() => {
            if (!pending) setModalOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !pending) setModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="int-modal-title"
            tabIndex={-1}
            className="flex max-h-[min(90vh,640px)] w-full max-w-[480px] flex-col overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[0_12px_32px_rgba(15,30,20,.12)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--border-light)] px-5 py-4">
              <h3
                id="int-modal-title"
                className="font-[family-name:var(--font-dm-serif)] text-xl tracking-tight text-[var(--text)]"
              >
                Log an interaction
              </h3>
              <button
                type="button"
                disabled={pending}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-mid)] hover:bg-[var(--cream)] disabled:opacity-55"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form
              ref={formRef}
              action={submit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <input type="hidden" name="student_id" value={studentId} />
              <div className="min-h-0 space-y-3 overflow-y-auto px-5 py-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="int-kind"
                      className="block text-[12px] font-semibold text-[var(--text-mid)]"
                    >
                      Type
                    </label>
                    <select
                      id="int-kind"
                      name="interaction_kind"
                      required
                      disabled={pending}
                      className="mt-1.5 w-full rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2 font-[family-name:var(--font-dm-sans)] text-[13px] outline-none focus:border-[var(--green-light)] disabled:opacity-55"
                      defaultValue="meeting"
                    >
                      {STUDENT_INTERACTION_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {STUDENT_INTERACTION_KIND_LABELS[k]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="int-date"
                      className="block text-[12px] font-semibold text-[var(--text-mid)]"
                    >
                      Date
                    </label>
                    <input
                      id="int-date"
                      name="occurred_on"
                      type="date"
                      required
                      disabled={pending}
                      defaultValue={todayIso}
                      className="mt-1.5 w-full rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2 font-[family-name:var(--font-dm-sans)] text-[13px] outline-none focus:border-[var(--green-light)] disabled:opacity-55"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="int-dur"
                      className="block text-[12px] font-semibold text-[var(--text-mid)]"
                    >
                      Duration (mins)
                    </label>
                    <input
                      id="int-dur"
                      name="duration_minutes"
                      type="number"
                      min={0}
                      step={1}
                      placeholder="e.g. 30"
                      disabled={pending}
                      className="mt-1.5 w-full rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2 font-[family-name:var(--font-dm-sans)] text-[13px] outline-none placeholder:text-[var(--text-hint)] focus:border-[var(--green-light)] disabled:opacity-55"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="int-outcome"
                      className="block text-[12px] font-semibold text-[var(--text-mid)]"
                    >
                      Outcome
                    </label>
                    <select
                      id="int-outcome"
                      name="outcome"
                      required
                      disabled={pending}
                      className="mt-1.5 w-full rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2 font-[family-name:var(--font-dm-sans)] text-[13px] outline-none focus:border-[var(--green-light)] disabled:opacity-55"
                      defaultValue="Productive"
                    >
                      {STUDENT_INTERACTION_OUTCOMES.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="int-notes"
                    className="block text-[12px] font-semibold text-[var(--text-mid)]"
                  >
                    Notes / what was discussed
                  </label>
                  <textarea
                    id="int-notes"
                    name="notes"
                    required
                    disabled={pending}
                    placeholder="What was discussed, decided, or actioned..."
                    className="mt-1.5 min-h-[80px] w-full resize-y rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 font-[family-name:var(--font-dm-sans)] text-[13px] outline-none placeholder:text-[var(--text-hint)] focus:border-[var(--green-light)] disabled:opacity-55"
                    maxLength={8000}
                  />
                </div>
                {error ? (
                  <div className="text-[12.5px] font-medium text-[#8c2d22]">
                    {error}
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--border-light)] px-5 py-4">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-1.5 font-[family-name:var(--font-dm-sans)] text-[11.5px] font-semibold text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)] disabled:opacity-55"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg border-[1.5px] border-[var(--green)] bg-[var(--green)] px-3 py-1.5 font-[family-name:var(--font-dm-sans)] text-[11.5px] font-semibold text-white hover:border-[var(--green-dark)] hover:bg-[var(--green-dark)] disabled:opacity-55"
                >
                  {pending ? "Saving…" : "Log interaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

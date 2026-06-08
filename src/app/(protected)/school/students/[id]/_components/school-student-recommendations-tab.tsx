"use client";

import { getSchoolRecommendationLetterViewUrl } from "@/actions/recommendation-requests";
import type { Database } from "@/database.types";
import { useCallback, useEffect, useState } from "react";

import { SchoolStudentPanel } from "./school-student-panel";

type RecRow =
  Database["public"]["Tables"]["student_my_application_recommendations"]["Row"];

const REC_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  drafting: "Drafting",
  submitted: "Submitted",
};

const BTN_SECONDARY_SM =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border-[1.5px] border-[var(--border)] bg-white px-2.5 py-1.5 font-[family-name:var(--font-dm-sans)] text-[11.5px] font-semibold leading-none text-[var(--text-mid)] transition-all duration-150 hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)] disabled:cursor-not-allowed disabled:opacity-50";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function statusPillClass(tone: "green" | "amber" | "red"): string {
  const base =
    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold leading-snug";
  const by = {
    green: "bg-[rgba(82,183,135,0.13)] text-[#1b4332]",
    amber: "bg-[rgba(212,162,42,0.14)] text-[#7a5d10]",
    red: "bg-[#FCEBEB] text-[var(--red)]",
  };
  return `${base} ${by[tone]}`;
}

function statusTone(status: string): "green" | "amber" | "red" {
  if (status === "submitted") return "green";
  if (status === "drafting") return "amber";
  return "red";
}

function StatusPill({ status }: { status: string }) {
  const tone = statusTone(status);
  const dotClass =
    tone === "green"
      ? "bg-[var(--green-bright)]"
      : tone === "amber"
        ? "bg-[#d4a22a]"
        : "bg-[var(--red)]";
  return (
    <span className={statusPillClass(tone)}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
      {REC_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function SchoolStudentRecommendationsTab({
  initialRecommendations,
}: {
  initialRecommendations: RecRow[];
}) {
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [toast, setToast] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  useEffect(() => {
    setRecommendations(initialRecommendations);
  }, [initialRecommendations]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const viewLetter = async (recommendationId: string) => {
    if (viewingId) return;
    setViewingId(recommendationId);
    try {
      const res = await getSchoolRecommendationLetterViewUrl(recommendationId);
      if ("error" in res) {
        showToast(res.error);
        return;
      }
      window.open(res.url, "_blank", "noopener,noreferrer");
    } finally {
      setViewingId(null);
    }
  };

  const pendingCount = recommendations.filter((r) => r.status === "pending").length;
  const submittedCount = recommendations.filter(
    (r) => r.status === "submitted",
  ).length;

  return (
    <>
      <SchoolStudentPanel
        head="Recommendation letters"
        sub={`${recommendations.length} request${recommendations.length === 1 ? "" : "s"} · ${submittedCount} submitted · ${pendingCount} pending`}
      >
        {recommendations.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-[var(--text-light)]">
            <div className="mb-2.5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--green-pale)] text-[var(--green)] [&_svg]:h-5 [&_svg]:w-5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            </div>
            <div>No recommendation letter requests yet.</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recommendations.map((r) => {
              const iconWrap =
                r.status === "submitted"
                  ? "bg-[var(--green-bg)] text-[var(--green)]"
                  : r.status === "drafting"
                    ? "bg-[rgba(212,162,42,0.14)] text-[#D4A22A]"
                    : "bg-[#FCEBEB] text-[var(--red)]";
              const teacherLine = `${r.teacher_name}${r.teacher_subject?.trim() ? ` (${r.teacher_subject.trim()})` : ""}`;
              const metaTail =
                r.status === "submitted"
                  ? r.submitted_at
                    ? `Submitted ${formatDate(r.submitted_at)}`
                    : "Submitted"
                  : r.status === "drafting"
                    ? "Drafting in progress"
                    : "Awaiting response";

              return (
                <div
                  key={r.id}
                  className="flex flex-col gap-3 rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3 transition-colors hover:border-[var(--border)] sm:flex-row sm:items-center"
                >
                  <div
                    className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg ${iconWrap}`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold text-[var(--text)]">
                      {teacherLine}
                    </div>
                    <div className="mt-0.5 text-[11.5px] leading-snug text-[var(--text-light)]">
                      For: {r.for_application} · Requested{" "}
                      {formatDate(r.requested_at)} · Needed by{" "}
                      {formatDate(r.needed_by)} · {metaTail}
                    </div>
                    {r.teacher_email ? (
                      <div className="mt-1 text-[11.5px] text-[var(--text-hint)]">
                        {r.teacher_email}
                      </div>
                    ) : null}
                    {r.personal_note?.trim() ? (
                      <div className="mt-2 rounded-md border-l-[3px] border-l-[var(--green-light)] bg-[var(--cream)] px-3 py-2 text-[12px] leading-relaxed text-[var(--text-mid)]">
                        {r.personal_note.trim()}
                      </div>
                    ) : null}
                    {r.status === "submitted" && r.letter_file_name ? (
                      <div className="mt-2 flex items-center gap-1.5 rounded-md bg-[var(--cream)] px-2.5 py-1.5 text-[12px] text-[var(--text-mid)]">
                        <svg
                          className="h-3 w-3 shrink-0 text-[var(--text-light)]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden
                        >
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <path d="M14 2v6h6" />
                        </svg>
                        <span className="font-medium text-[var(--text)]">
                          {r.letter_file_name}
                        </span>
                      </div>
                    ) : null}
                    {r.submitter_notes?.trim() ? (
                      <div className="mt-2 text-[12px] italic text-[var(--text-mid)]">
                        Teacher note: {r.submitter_notes.trim()}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <StatusPill status={r.status} />
                    {r.status === "submitted" ? (
                      <button
                        type="button"
                        className={BTN_SECONDARY_SM}
                        disabled={viewingId === r.id}
                        onClick={() => void viewLetter(r.id)}
                      >
                        {viewingId === r.id ? "Opening…" : "View letter"}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SchoolStudentPanel>

      {toast ? (
        <div
          className="fixed bottom-6 right-6 z-[400] flex items-center gap-2 rounded-[10px] bg-[var(--green-dark)] px-[18px] py-3 text-[13px] font-medium text-white shadow-[0_12px_32px_rgba(15,30,20,0.08)] [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:text-[var(--green-bright)]"
          role="status"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            aria-hidden
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span>{toast}</span>
        </div>
      ) : null}
    </>
  );
}

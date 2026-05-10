"use client";

import { SchoolStudentShortlistEditModal } from "./school-student-shortlist-edit-modal";

import {
  AddUniversityShortlistModal,
  type AddUniversityShortlistForm,
} from "@/app/(protected)/student/my-applications/_components/add-university-shortlist-modal";
import {
  SHORTLIST_DOCS_STATUS_LABEL,
  SHORTLIST_ESSAY_STATUS_LABEL,
} from "@/app/(protected)/student/my-applications/_lib/shortlist-docs-essay-status";
import type { Database } from "@/database.types";
import { createSupabaseBrowserClient } from "@/utils/supabase-browser";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { UNIVERSITY_STATUS_LABEL } from "@/app/(protected)/student/my-applications/_lib/my-applications-university-labels";

type ShortlistRow = Database["public"]["Tables"]["student_shortlist_universities"]["Row"];

function methodPillLabel(applicationMethod: string | null): string {
  if (!applicationMethod) return "—";
  const i = applicationMethod.indexOf(" — ");
  return i === -1 ? applicationMethod : applicationMethod.slice(0, i);
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Matches Teacher Portal `renderShortlist` pill colors from application status. */
function applicationStatusPillWrap(status: string): string {
  if (status === "submitted") {
    return "bg-[rgba(82,183,135,.13)] text-[#1B4332]";
  }
  if (
    status === "preparing_application" ||
    status === "interview_invited" ||
    status === "shortlisted"
  ) {
    return "bg-[rgba(212,162,42,.14)] text-[#7a5d10]";
  }
  if (status === "withdrawn") {
    return "bg-[rgba(231,76,60,.12)] text-[#8c2d22]";
  }
  return "bg-[#ECEAE5] text-[var(--text-mid)]";
}

function applicationStatusPillDot(status: string): string {
  if (status === "submitted") return "bg-[var(--green-bright)]";
  if (
    status === "preparing_application" ||
    status === "interview_invited" ||
    status === "shortlisted"
  ) {
    return "bg-[#D4A22A]";
  }
  if (status === "withdrawn") return "bg-[var(--red)]";
  return "bg-[#a0a0a0]";
}

function normalizeDocsStatus(row: ShortlistRow): keyof typeof SHORTLIST_DOCS_STATUS_LABEL {
  const d = row.docs_status;
  return d === "completed" || d === "not_completed" ? d : "not_completed";
}

function normalizeEssayStatus(row: ShortlistRow): keyof typeof SHORTLIST_ESSAY_STATUS_LABEL {
  const e = row.essay_status;
  return e === "approved" || e === "not_reviewed" ? e : "not_reviewed";
}

export function SchoolStudentShortlistTab({
  studentId,
  initialShortlist,
  countries,
}: {
  studentId: string;
  initialShortlist: ShortlistRow[];
  countries: { id: string; name: string }[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [shortlist, setShortlist] = useState<ShortlistRow[]>(initialShortlist);
  const [uniModal, setUniModal] = useState(false);
  const [editRow, setEditRow] = useState<ShortlistRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  }

  const addUniversity = async (uniForm: AddUniversityShortlistForm) => {
    const nextSort = shortlist.length ? Math.max(...shortlist.map((r) => r.sort_order)) + 1 : 0;
    const insert = {
      student_id: studentId,
      university_name: uniForm.university_name.trim(),
      country: uniForm.country,
      major_program: uniForm.major_program.trim(),
      application_method: uniForm.application_method,
      application_deadline: uniForm.application_deadline || null,
      status: "considering",
      decision: "",
      docs_status: "not_completed",
      essay_status: "not_reviewed",
      sort_order: nextSort,
    };
    const { data, error } = await supabase.from("student_shortlist_universities").insert(insert).select("*").single();
    if (error || !data) {
      showToast(error?.message ?? "Could not add");
      return;
    }
    setShortlist((prev) => [data, ...prev]);
    setUniModal(false);
    showToast(`${data.university_name} added`);
    router.refresh();
  };

  const updateShortlistRow = async (id: string, patch: Partial<ShortlistRow>) => {
    const { error } = await supabase.from("student_shortlist_universities").update(patch).eq("id", id);
    if (error) showToast(error.message);
    else router.refresh();
  };

  const removeUniversity = async (id: string) => {
    const { error } = await supabase.from("student_shortlist_universities").delete().eq("id", id);
    if (error) {
      showToast(error.message);
      return;
    }
    setShortlist((prev) => prev.filter((r) => r.id !== id));
    setEditRow(null);
    router.refresh();
  };

  const saveEdit = async (patch: {
    university_name: string;
    country: string;
    major_program: string;
    application_method: string;
    application_deadline: string | null;
    status: string;
    decision: string | null;
    docs_status: string;
    essay_status: string;
  }) => {
    if (!editRow) return;
    const { error } = await supabase.from("student_shortlist_universities").update(patch).eq("id", editRow.id);
    if (error) {
      showToast(error.message);
      return;
    }
    setShortlist((prev) => prev.map((r) => (r.id === editRow.id ? { ...r, ...patch } : r)));
    setEditRow(null);
    showToast("Saved");
    router.refresh();
  };

  return (
    <div className="w-full">
      {toast ? (
        <div
          className="fixed bottom-6 right-6 z-[320] flex items-center gap-2 rounded-[10px] bg-[var(--green-dark)] px-[18px] py-3 text-[13px] font-medium text-white shadow-[0_12px_32px_rgba(15,30,20,0.08)]"
          role="status"
        >
          {toast}
        </div>
      ) : null}

      {/* Teacher Portal: .panel — shortlist */}
      <div className="mb-[18px] overflow-hidden rounded-[14px] border border-[var(--border-light)] bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-light)] px-5 py-[18px]">
          <div>
            <div className="text-[15px] font-semibold tracking-tight text-[var(--text)]">
              University shortlist{" "}
              <span className="ml-1 font-normal text-[var(--text-light)]">({shortlist.length})</span>
            </div>
            <div className="mt-0.5 text-[12px] text-[var(--text-light)]">
              Universities being considered, applied to, or with offers
            </div>
          </div>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--green)] bg-[var(--green)] px-2.5 py-1.5 text-[11.5px] font-semibold text-white hover:border-[var(--green-dark)] hover:bg-[var(--green-dark)]"
            onClick={() => setUniModal(true)}
          >
            + Add university
          </button>
        </div>
        <div className="px-5 py-[18px]">
          {shortlist.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px] text-[var(--text-light)]">
              No universities shortlisted yet
            </div>
          ) : (
            shortlist.map((u) => {
              const ds = normalizeDocsStatus(u);
              const es = normalizeEssayStatus(u);
              const statusLabel = UNIVERSITY_STATUS_LABEL[u.status] ?? u.status;
              const wrap = applicationStatusPillWrap(u.status);
              const dot = applicationStatusPillDot(u.status);
              const deadline = u.application_deadline ? formatDate(u.application_deadline) : "—";
              const progLine = [
                u.country,
                u.major_program,
                methodPillLabel(u.application_method),
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <div
                  key={u.id}
                  className="mb-1.5 grid grid-cols-1 gap-3 border border-[var(--border-light)] bg-white px-[14px] py-[11px] last:mb-0 lg:grid-cols-[1.4fr_0.8fr_0.7fr_0.9fr_auto] lg:items-center lg:gap-3"
                  style={{ borderRadius: "10px" }}
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-[var(--text)]">{u.university_name}</div>
                    <div className="mt-0.5 text-[11.5px] text-[var(--text-light)]">{progLine}</div>
                  </div>
                  <div className="text-[12px] text-[var(--text-light)]">{deadline}</div>
                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold leading-snug ${wrap}`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
                      {statusLabel}
                    </span>
                  </div>
                  <div className="text-[11.5px] leading-snug text-[var(--text-light)]">
                    <div>Docs: {SHORTLIST_DOCS_STATUS_LABEL[ds]}</div>
                    <div>Essay: {SHORTLIST_ESSAY_STATUS_LABEL[es]}</div>
                  </div>
                  <div className="flex justify-end lg:justify-center">
                    <button
                      type="button"
                      aria-label="Edit"
                      className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border-[1.5px] border-[var(--border)] bg-white text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]"
                      onClick={() => setEditRow(u)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <AddUniversityShortlistModal
        open={uniModal}
        onClose={() => setUniModal(false)}
        countries={countries}
        onAdd={(f) => void addUniversity(f)}
        onInvalid={() => showToast("Fill in all fields first")}
      />

      <SchoolStudentShortlistEditModal
        open={editRow !== null}
        row={editRow}
        countries={countries}
        onClose={() => setEditRow(null)}
        onInvalid={() => showToast("Fill in all fields first")}
        onSave={(patch) => void saveEdit(patch)}
        onRemove={async () => {
          if (!editRow) return;
          if (!confirm("Remove from shortlist?")) return;
          await removeUniversity(editRow.id);
        }}
      />
    </div>
  );
}

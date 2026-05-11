"use client";

import type { EssayStatusSlug } from "@/app/(protected)/student/my-applications/_lib/my-applications-defaults";
import {
  ESSAY_STATUS_LABEL,
  ESSAY_STATUSES,
} from "@/app/(protected)/student/my-applications/_lib/my-applications-defaults";
import type {
  EssayCommentRow,
  EssayWithComments,
} from "@/app/(protected)/student/my-applications/_lib/my-applications-types";
import { createSupabaseBrowserClient } from "@/utils/supabase-browser";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** Essay type options — Teacher Portal Final.html `m-essay-type` (exact strings). */
const TEACHER_PORTAL_ESSAY_TYPES = [
  "UCAS personal statement",
  "Common App personal essay",
  "Supplemental essay",
  "Scholarship essay",
  "Motivation letter",
  "CV / resume",
  "Other",
] as const;

const ESSAY_ROW_BASE =
  "flex items-start gap-3.5 rounded-[10px] border p-3.5 transition-all duration-150 hover:border-[var(--border)] max-[680px]:flex-wrap";

const ESSAY_ICON_BASE =
  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] [&_svg]:h-4 [&_svg]:w-4";

const SELECT_CHEVRON_BG = `url("data:image/svg+xml,utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'><path d='M1 1l4 4 4-4' stroke='%236a6a6a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/></svg>")`;

const BTN_SECONDARY_SM =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border-[1.5px] border-[var(--border)] bg-white px-2.5 py-1.5 font-[family-name:var(--font-dm-sans)] text-[11.5px] font-semibold leading-none text-[var(--text-mid)] transition-all duration-150 hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)] [&_svg]:h-[13px] [&_svg]:w-[13px]";

const BTN_PRIMARY_SM =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-2.5 py-1.5 font-[family-name:var(--font-dm-sans)] text-[11.5px] font-semibold leading-none text-white transition-all duration-150 hover:border-[var(--green-dark)] hover:bg-[var(--green-dark)] [&_svg]:h-[13px] [&_svg]:w-[13px]";

const MODAL_VEIL =
  "fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(15,30,20,0.5)] p-5";

const MODAL_SHELL_BASE =
  "w-full overflow-hidden rounded-[14px] bg-white shadow-[0_12px_32px_rgba(15,30,20,0.08)]";

const MODAL_HEAD =
  "flex items-center justify-between border-b border-[var(--border-light)] px-[22px] py-[18px]";

const MODAL_TITLE =
  "font-[family-name:var(--font-dm-serif)] text-xl tracking-tight text-[var(--text)]";

const MODAL_BODY = "flex flex-col gap-[14px] px-[22px] py-[18px]";

const MODAL_FOOT =
  "flex justify-end gap-2 border-t border-[var(--border-light)] bg-[var(--cream)] px-[22px] py-3.5";

const MODAL_CLOSE =
  "flex cursor-pointer rounded-md p-1.5 text-[var(--text-light)] hover:bg-[var(--cream)] hover:text-[var(--text)]";

const M_FIELD_LABEL =
  "mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--text-mid)]";

const M_FIELD_CONTROL =
  "w-full rounded-[8px] border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 font-[family-name:var(--font-dm-sans)] text-[13px] text-[var(--text)] outline-none focus:border-[var(--green-light)]";

const TEXTAREA_FIELD = `${M_FIELD_CONTROL} min-h-[60px] resize-y`;

function essayRowKind(
  status: EssayStatusSlug,
  hasFile: boolean,
): "ready" | "no-file" | "in-progress" | "default" {
  if (status === "ready_for_review") return "ready";
  if (!hasFile) return "no-file";
  if (status === "in_progress") return "in-progress";
  return "default";
}

function essayRowClassName(kind: ReturnType<typeof essayRowKind>): string {
  const surface =
    kind === "no-file"
      ? "border-dashed border-[var(--border-light)] bg-[#fdfdfa]"
      : "border-solid border-[var(--border-light)] bg-white";
  return `${ESSAY_ROW_BASE} ${surface}`;
}

/** Matches `essayStatusSelectClass` / status pill tones so the row icon reflects essay status. */
function essayIconClassName(tone: "green" | "amber" | "grey"): string {
  const accent = {
    green: "bg-[rgba(82,183,135,0.13)] text-[#1b4332]",
    amber: "bg-[rgba(212,162,42,0.14)] text-[#7a5d10]",
    grey: "bg-[#eceae5] text-[var(--text-mid)]",
  }[tone];
  return `${ESSAY_ICON_BASE} ${accent}`;
}

function essayStatusSelectClass(tone: "green" | "amber" | "grey"): string {
  const base =
    "w-full appearance-none cursor-pointer rounded-[8px] border-[1.5px] bg-no-repeat bg-[length:10px_6px] bg-[position:right_8px_center] py-[7px] pl-2.5 pr-6 font-[family-name:var(--font-dm-sans)] text-[11.5px] font-semibold outline-none focus:border-[var(--green-light)]";
  const by = {
    green:
      "border-[rgba(82,183,135,0.3)] bg-[rgba(82,183,135,0.13)] text-[#1b4332]",
    amber:
      "border-[rgba(212,162,42,0.3)] bg-[rgba(212,162,42,0.14)] text-[#7a5d10]",
    grey: "border-[var(--border)] bg-[#eceae5] text-[var(--text-mid)]",
  };
  return `${base} ${by[tone]}`;
}

function statusPillClass(tone: "green" | "amber" | "grey"): string {
  const base =
    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold leading-snug";
  const by = {
    green: "bg-[rgba(82,183,135,0.13)] text-[#1b4332]",
    amber: "bg-[rgba(212,162,42,0.14)] text-[#7a5d10]",
    grey: "bg-[#eceae5] text-[var(--text-mid)]",
  };
  return `${base} ${by[tone]}`;
}

function statusPillDotClass(tone: "green" | "amber" | "grey"): string {
  return `h-1.5 w-1.5 shrink-0 rounded-full ${
    tone === "green"
      ? "bg-[var(--green-bright)]"
      : tone === "amber"
        ? "bg-[#d4a22a]"
        : "bg-[#a0a0a0]"
  }`;
}

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

function normalizeEssays(list: EssayWithComments[]): EssayWithComments[] {
  return list.map((e) => ({
    ...e,
    student_my_application_essay_comments: [
      ...(e.student_my_application_essay_comments ?? []),
    ].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    ),
  }));
}

function essayStatusTone(status: EssayStatusSlug): "green" | "amber" | "grey" {
  if (status === "ready_for_review") return "green";
  if (status === "in_progress") return "amber";
  return "grey";
}

export function SchoolStudentEssaysTab({
  studentId,
  initialEssays,
}: {
  studentId: string;
  initialEssays: EssayWithComments[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [essays, setEssays] = useState<EssayWithComments[]>(() =>
    normalizeEssays(initialEssays),
  );
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setEssays(normalizeEssays(initialEssays));
  }, [initialEssays]);

  const [newModal, setNewModal] = useState(false);
  const [newModalError, setNewModalError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [uploadEssayId, setUploadEssayId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    essay_type: "" as string,
    for_application: "",
    essay_prompt: "",
    limit_note: "",
    deadline: "",
    instructions_note: "",
  });

  const [commentBody, setCommentBody] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const detailEssay = detailId
    ? essays.find((x) => x.id === detailId)
    : undefined;
  const uploadEssay = uploadEssayId
    ? essays.find((x) => x.id === uploadEssayId)
    : undefined;

  const openDetail = (e: EssayWithComments) => {
    setDetailId(e.id);
    setCommentBody("");
  };

  const persistEssays = async (next: EssayWithComments[]) => {
    setEssays(normalizeEssays(next));
    router.refresh();
  };

  const resolveAuthorDisplay = async (): Promise<string | null> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return null;
    const { data: sap } = await supabase
      .from("school_admin_profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();
    const label =
      `${sap?.first_name?.trim() ?? ""} ${sap?.last_name?.trim() ?? ""}`.trim();
    return label || "Counselor";
  };

  const addEssay = async () => {
    setNewModalError(null);
    if (
      !form.title.trim() ||
      !form.for_application.trim() ||
      !form.essay_type.trim()
    ) {
      setNewModalError("Essay title, university, and essay type are required.");
      return;
    }
    const { data, error } = await supabase
      .from("student_my_application_essays")
      .insert({
        student_id: studentId,
        title: form.title.trim(),
        essay_type: form.essay_type.trim(),
        for_application: form.for_application.trim(),
        essay_prompt: form.essay_prompt.trim() || null,
        limit_note: form.limit_note.trim() || null,
        deadline: form.deadline.trim()
          ? form.deadline.trim().slice(0, 10)
          : null,
        instructions_note: form.instructions_note.trim() || null,
        requirement_note: null,
        status: "not_started",
        body: "",
        version: 1,
      })
      .select(
        `
        *,
        student_my_application_essay_comments (
          id, essay_id, author_id, author_display_name, body, created_at
        )
      `,
      )
      .single();
    if (error || !data) {
      showToast(error?.message ?? "Could not create essay");
      return;
    }
    await persistEssays([data as EssayWithComments, ...essays]);
    setNewModal(false);
    setForm({
      title: "",
      essay_type: "",
      for_application: "",
      essay_prompt: "",
      limit_note: "",
      deadline: "",
      instructions_note: "",
    });
    showToast("Essay requirement added");
  };

  const updateStatus = async (essayId: string, status: EssayStatusSlug) => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("student_my_application_essays")
      .update({ status, updated_at: now })
      .eq("id", essayId)
      .select(
        `
        *,
        student_my_application_essay_comments (
          id, essay_id, author_id, author_display_name, body, created_at
        )
      `,
      )
      .single();
    if (error || !data) {
      showToast(error?.message ?? "Could not update status");
      return;
    }
    await persistEssays(
      essays.map((x) => (x.id === essayId ? (data as EssayWithComments) : x)),
    );
    showToast(`Status updated to ${ESSAY_STATUS_LABEL[status]}`);
  };

  const onStatusChange = (
    essayId: string,
    next: EssayStatusSlug,
    hasFile: boolean,
  ) => {
    if (next === "ready_for_review" && !hasFile) {
      showToast("Upload an essay draft before marking as Ready for review");
      return;
    }
    void updateStatus(essayId, next);
  };

  const addComment = async () => {
    if (!detailEssay) return;
    if (!commentBody.trim()) {
      showToast("Comment cannot be empty");
      return;
    }
    const authorLabel = await resolveAuthorDisplay();
    if (!authorLabel) {
      showToast("Sign in again to add a comment");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      showToast("Sign in again");
      return;
    }
    const { data: row, error } = await supabase
      .from("student_my_application_essay_comments")
      .insert({
        essay_id: detailEssay.id,
        author_id: user.id,
        author_display_name: authorLabel,
        body: commentBody.trim(),
      })
      .select("*")
      .single();
    if (error || !row) {
      showToast(error?.message ?? "Could not add comment");
      return;
    }
    const c = row as EssayCommentRow;
    const nextEssays = essays.map((ex) =>
      ex.id === detailEssay.id
        ? {
            ...ex,
            student_my_application_essay_comments: [
              ...(ex.student_my_application_essay_comments ?? []),
              c,
            ],
          }
        : ex,
    );
    setCommentBody("");
    await persistEssays(nextEssays);
    showToast("Comment saved");
  };

  const uploadFile = async (essayId: string, file: File) => {
    const safeName = file.name.replace(/[^\w.\-()+ ]/g, "_");
    const path = `${studentId}/essays/${essayId}/${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("student-my-applications")
      .upload(path, file, { upsert: true });
    if (upErr) {
      showToast(upErr.message);
      return;
    }
    const now = new Date().toISOString();
    const essay = essays.find((x) => x.id === essayId);
    const wasNotStarted = essay?.status === "not_started";
    const bumpStatus = wasNotStarted
      ? ({ status: "in_progress" as const } as const)
      : {};
    const { data, error } = await supabase
      .from("student_my_application_essays")
      .update({
        file_storage_path: path,
        file_name: file.name,
        file_uploaded_at: now,
        updated_at: now,
        ...bumpStatus,
      })
      .eq("id", essayId)
      .select(
        `
        *,
        student_my_application_essay_comments (
          id, essay_id, author_id, author_display_name, body, created_at
        )
      `,
      )
      .single();
    if (error || !data) {
      showToast(error?.message ?? "Could not save file");
      return;
    }
    await persistEssays(
      essays.map((x) => (x.id === essayId ? (data as EssayWithComments) : x)),
    );
    setUploadEssayId(null);
    setPendingFile(null);
    showToast(
      wasNotStarted
        ? "File uploaded · status updated to In progress"
        : "File uploaded",
    );
  };

  const rowsHtml = essays.map((e) => {
    const comments = e.student_my_application_essay_comments ?? [];
    const hasFile = Boolean(e.file_storage_path && e.file_name);
    const st = e.status as EssayStatusSlug;
    const rowKind = essayRowKind(st, hasFile);
    const selTone = essayStatusTone(st);

    const metaParts: ReactNode[] = [
      <span key="for">
        For: <strong>{e.for_application ?? "—"}</strong>
      </span>,
    ];
    if (e.essay_type?.trim())
      metaParts.push(<span key="type">{e.essay_type.trim()}</span>);
    if (e.limit_note?.trim())
      metaParts.push(<span key="lim">{e.limit_note.trim()}</span>);
    if (e.deadline)
      metaParts.push(<span key="due">Deadline: {formatDate(e.deadline)}</span>);
    if (e.last_edited_at)
      metaParts.push(
        <span key="led">Last edited {formatDate(e.last_edited_at)}</span>,
      );

    const firstAuthor = comments[0]?.author_display_name?.trim();

    return (
      <div key={e.id} className={essayRowClassName(rowKind)}>
        <div className={essayIconClassName(selTone)}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold leading-snug text-[var(--text)]">
            {e.title}
          </div>
          <div className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--text-light)]">
            {metaParts.map((node, idx) => (
              <span key={idx}>
                {idx > 0 ? " · " : null}
                {node}
              </span>
            ))}
          </div>
          {hasFile ? (
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
                {e.file_name}
              </span>
              <span className="text-[var(--text-hint)]">
                · Uploaded{" "}
                {e.file_uploaded_at
                  ? formatDate(e.file_uploaded_at)
                  : "recently"}
              </span>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-1.5 py-1.5 text-[12px] italic text-[var(--text-hint)]">
              <svg
                className="h-3 w-3 shrink-0 text-[var(--text-light)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              No essay uploaded yet
            </div>
          )}
          {comments.length > 0 ? (
            <div className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-[var(--green)] [&_svg]:h-[11px] [&_svg]:w-[11px]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              {comments.length} comment{comments.length !== 1 ? "s" : ""} from{" "}
              {firstAuthor || "Counselor"}
            </div>
          ) : null}
        </div>
        <div className="flex min-w-[170px] shrink-0 flex-col gap-1.5 max-[680px]:mt-2 max-[680px]:w-full max-[680px]:min-w-0 max-[680px]:flex-row max-[680px]:flex-wrap">
          <select
            className={`max-[680px]:basis-full ${essayStatusSelectClass(selTone)}`}
            style={{ backgroundImage: SELECT_CHEVRON_BG }}
            value={st}
            onChange={(ev) =>
              onStatusChange(e.id, ev.target.value as EssayStatusSlug, hasFile)
            }
            aria-label="Essay status"
          >
            {ESSAY_STATUSES.map((v) => (
              <option
                key={v}
                value={v}
                disabled={v === "ready_for_review" && !hasFile}
              >
                {ESSAY_STATUS_LABEL[v]}
                {v === "ready_for_review" && !hasFile ? " (upload first)" : ""}
              </option>
            ))}
          </select>
          <div className="flex gap-1.5 max-[680px]:basis-full max-[680px]:grow [&>button]:flex-1 [&>button]:justify-center">
            <button
              type="button"
              className={BTN_SECONDARY_SM}
              onClick={() => {
                setUploadEssayId(e.id);
                setPendingFile(null);
              }}
            >
              {hasFile ? "Replace file" : "Upload file"}
            </button>
            <button
              type="button"
              className={BTN_SECONDARY_SM}
              onClick={() => openDetail(e)}
            >
              Open
            </button>
          </div>
        </div>
      </div>
    );
  });

  const stDetail = detailEssay?.status as EssayStatusSlug | undefined;
  const detailPill = stDetail ? essayStatusTone(stDetail) : "grey";

  return (
    <>
      <div className="mb-[18px] overflow-hidden rounded-[14px] border border-[var(--border-light)] bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-light)] px-5 py-[18px]">
          <div>
            <div className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-[var(--text)]">
              Essays
            </div>
            <div className="mt-0.5 text-xs text-[var(--text-light)]">
              Essay requirements + uploaded drafts. Status updates auto-flow as
              files come in.
            </div>
          </div>
          <button
            type="button"
            className={BTN_PRIMARY_SM}
            onClick={() => {
              setNewModalError(null);
              setNewModal(true);
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden
              className="h-[13px] w-[13px]"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New essay
          </button>
        </div>
        <div className="px-5 py-[18px]">
          <div className="flex flex-col gap-2">{rowsHtml}</div>
          {essays.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px] text-[var(--text-light)]">
              <div className="mb-2.5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--green-pale)] text-[var(--green)] [&_svg]:h-5 [&_svg]:w-5">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                </svg>
              </div>
              <div>
                No essay requirements yet — click &quot;+ New essay&quot; to add
                one
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {newModal ? (
        <div
          className={MODAL_VEIL}
          role="dialog"
          aria-modal
          onClick={(ev) => ev.target === ev.currentTarget && setNewModal(false)}
        >
          <div className={`${MODAL_SHELL_BASE} max-w-[480px]`}>
            <div className={MODAL_HEAD}>
              <div className={MODAL_TITLE}>Add new essay requirement</div>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => setNewModal(false)}
                aria-label="Close"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className={MODAL_BODY}>
              <div>
                <label className={M_FIELD_LABEL} htmlFor="tp-essay-title">
                  Essay title{" "}
                  <span className="text-[var(--red,#e74c3c)]">*</span>
                </label>
                <input
                  id="tp-essay-title"
                  className={M_FIELD_CONTROL}
                  placeholder="e.g. Why Manchester essay"
                  value={form.title}
                  onChange={(x) =>
                    setForm((f) => ({ ...f, title: x.target.value }))
                  }
                />
              </div>
              <div>
                <label className={M_FIELD_LABEL} htmlFor="tp-essay-uni">
                  University{" "}
                  <span className="text-[var(--red,#e74c3c)]">*</span>
                </label>
                <input
                  id="tp-essay-uni"
                  className={M_FIELD_CONTROL}
                  placeholder="e.g. University of Manchester"
                  value={form.for_application}
                  onChange={(x) =>
                    setForm((f) => ({
                      ...f,
                      for_application: x.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className={M_FIELD_LABEL} htmlFor="tp-essay-type">
                  Essay type{" "}
                  <span className="text-[var(--red,#e74c3c)]">*</span>
                </label>
                <select
                  id="tp-essay-type"
                  className={`${M_FIELD_CONTROL} appearance-none bg-no-repeat bg-[length:10px_6px] bg-[position:right_12px_center] pr-8`}
                  style={{ backgroundImage: SELECT_CHEVRON_BG }}
                  value={form.essay_type}
                  onChange={(x) =>
                    setForm((f) => ({ ...f, essay_type: x.target.value }))
                  }
                >
                  <option value="">Select type...</option>
                  {TEACHER_PORTAL_ESSAY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={M_FIELD_LABEL} htmlFor="tp-essay-prompt">
                  Essay question / prompt
                </label>
                <textarea
                  id="tp-essay-prompt"
                  className={`${M_FIELD_CONTROL} min-h-[80px] resize-y`}
                  placeholder="Paste the essay question or prompt here..."
                  value={form.essay_prompt}
                  onChange={(x) =>
                    setForm((f) => ({ ...f, essay_prompt: x.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-1 gap-2.5 min-[460px]:grid-cols-2">
                <div>
                  <label className={M_FIELD_LABEL} htmlFor="tp-essay-count">
                    Word / character count
                  </label>
                  <input
                    id="tp-essay-count"
                    className={M_FIELD_CONTROL}
                    placeholder="e.g. 800 words or 4,000 characters"
                    value={form.limit_note}
                    onChange={(x) =>
                      setForm((f) => ({ ...f, limit_note: x.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className={M_FIELD_LABEL} htmlFor="tp-essay-deadline">
                    Deadline
                  </label>
                  <input
                    id="tp-essay-deadline"
                    type="date"
                    className={M_FIELD_CONTROL}
                    value={form.deadline}
                    onChange={(x) =>
                      setForm((f) => ({ ...f, deadline: x.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className={M_FIELD_LABEL} htmlFor="tp-essay-notes">
                  Notes / instructions
                </label>
                <textarea
                  id="tp-essay-notes"
                  className={TEXTAREA_FIELD}
                  placeholder="Add internal notes, guidance, or requirements..."
                  value={form.instructions_note}
                  onChange={(x) =>
                    setForm((f) => ({
                      ...f,
                      instructions_note: x.target.value,
                    }))
                  }
                />
              </div>
              {newModalError ? (
                <div className="block text-xs font-medium text-[var(--red,#e74c3c)]">
                  {newModalError}
                </div>
              ) : null}
            </div>
            <div className={MODAL_FOOT}>
              <button
                type="button"
                className={BTN_SECONDARY_SM}
                onClick={() => setNewModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={BTN_PRIMARY_SM}
                onClick={() => void addEssay()}
              >
                Save essay
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {uploadEssay ? (
        <div
          className={MODAL_VEIL}
          role="dialog"
          aria-modal
          onClick={(ev) =>
            ev.target === ev.currentTarget && setUploadEssayId(null)
          }
        >
          <div className={`${MODAL_SHELL_BASE} max-w-[480px]`}>
            <div className={MODAL_HEAD}>
              <div className={MODAL_TITLE}>Upload essay file</div>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => {
                  setUploadEssayId(null);
                  setPendingFile(null);
                }}
                aria-label="Close"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className={MODAL_BODY}>
              <div className="rounded-lg border border-[var(--green-bg)] bg-[var(--green-pale)] px-3 py-2.5 text-xs text-[var(--text-mid)] [&_strong]:font-semibold [&_strong]:text-[var(--green-dark)]">
                Uploading for: <strong>{uploadEssay.title}</strong>
              </div>
              <div>
                <label className={M_FIELD_LABEL} htmlFor="tp-essay-file">
                  Choose file
                </label>
                <input
                  id="tp-essay-file"
                  type="file"
                  className={M_FIELD_CONTROL}
                  accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={(ev) => {
                    const f = ev.target.files?.[0] ?? null;
                    setPendingFile(f);
                  }}
                />
                <p className="mt-1.5 text-[11.5px] text-[var(--text-hint)]">
                  Future: real file picker — PDF, DOC, DOCX, TXT supported
                </p>
              </div>
            </div>
            <div className={MODAL_FOOT}>
              <button
                type="button"
                className={BTN_SECONDARY_SM}
                onClick={() => {
                  setUploadEssayId(null);
                  setPendingFile(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={BTN_PRIMARY_SM}
                onClick={() => {
                  if (!pendingFile) {
                    showToast("Choose a file to upload");
                    return;
                  }
                  void uploadFile(uploadEssay.id, pendingFile);
                }}
              >
                Upload file
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detailEssay ? (
        <div
          className={MODAL_VEIL}
          role="dialog"
          aria-modal
          onClick={(ev) => ev.target === ev.currentTarget && setDetailId(null)}
        >
          <div className={`${MODAL_SHELL_BASE} max-w-[640px]`}>
            <div className={MODAL_HEAD}>
              <div className={MODAL_TITLE}>{detailEssay.title}</div>
              <button
                type="button"
                className={MODAL_CLOSE}
                onClick={() => setDetailId(null)}
                aria-label="Close"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="border-b border-[var(--border-light)] px-[22px] py-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--text-light)]">
                    University
                  </div>
                  <div className="mt-0.5 text-[13px] font-medium text-[var(--text)]">
                    {detailEssay.for_application ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--text-light)]">
                    Essay type
                  </div>
                  <div className="mt-0.5 text-[13px] font-medium text-[var(--text)]">
                    {detailEssay.essay_type ?? "—"}
                  </div>
                </div>
                {detailEssay.limit_note?.trim() ? (
                  <div>
                    <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--text-light)]">
                      Word / character count
                    </div>
                    <div className="mt-0.5 text-[13px] font-medium text-[var(--text)]">
                      {detailEssay.limit_note.trim()}
                    </div>
                  </div>
                ) : null}
                {detailEssay.deadline ? (
                  <div>
                    <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--text-light)]">
                      Deadline
                    </div>
                    <div className="mt-0.5 text-[13px] font-medium text-[var(--text)]">
                      {formatDate(detailEssay.deadline)}
                    </div>
                  </div>
                ) : null}
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--text-light)]">
                    Status
                  </div>
                  <div className="mt-0.5">
                    <span className={statusPillClass(detailPill)}>
                      <span className={statusPillDotClass(detailPill)} />
                      {stDetail ? ESSAY_STATUS_LABEL[stDetail] : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {detailEssay.essay_prompt?.trim() ? (
              <div className="border-b border-[var(--border-light)] px-[22px] py-4">
                <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  Essay question / prompt
                </div>
                <div className="rounded-md border-l-[3px] border-l-[var(--green-light)] bg-[var(--cream)] px-3 py-2.5 text-[13px] italic leading-relaxed text-[var(--text-mid)]">
                  {detailEssay.essay_prompt.trim()}
                </div>
              </div>
            ) : null}
            <div className="border-b border-[var(--border-light)] px-[22px] py-4">
              <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                Uploaded file
              </div>
              {detailEssay.file_name ? (
                <div className="text-[13px] leading-relaxed text-[var(--text)]">
                  <svg
                    className="-mt-0.5 mr-1 inline-block h-[13px] w-[13px] shrink-0 align-middle text-[var(--text-light)]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                  <strong>{detailEssay.file_name}</strong>{" "}
                  <span className="text-xs text-[var(--text-hint)]">
                    · Uploaded{" "}
                    {detailEssay.file_uploaded_at
                      ? formatDate(detailEssay.file_uploaded_at)
                      : ""}
                  </span>
                </div>
              ) : (
                <div className="text-[13px] italic text-[var(--text-hint)]">
                  No file uploaded yet
                </div>
              )}
            </div>
            {detailEssay.instructions_note?.trim() ? (
              <div className="border-b border-[var(--border-light)] px-[22px] py-4">
                <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  Notes / instructions
                </div>
                <div className="text-[13px] leading-relaxed text-[var(--text)]">
                  {detailEssay.instructions_note.trim()}
                </div>
              </div>
            ) : null}
            <div className="border-b border-[var(--border-light)] px-[22px] py-4">
              <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                Counselor feedback
              </div>
              <div className="mb-3 flex flex-col gap-2">
                {(detailEssay.student_my_application_essay_comments ?? [])
                  .length > 0 ? (
                  (detailEssay.student_my_application_essay_comments ?? []).map(
                    (c) => (
                      <div
                        key={c.id}
                        className="rounded-lg border border-[var(--border-light)] bg-[var(--cream)] px-3 py-2.5"
                      >
                        <div className="mb-1 flex justify-between text-[11px] text-[var(--text-light)]">
                          <span className="font-semibold text-[var(--text)]">
                            {c.author_display_name || "Counselor"}
                          </span>
                          <span>{formatDate(c.created_at)}</span>
                        </div>
                        <div className="text-[12.5px] leading-normal text-[var(--text)]">
                          {c.body}
                        </div>
                      </div>
                    ),
                  )
                ) : (
                  <div className="text-xs italic text-[var(--text-hint)]">
                    No comments yet — be the first to leave feedback
                  </div>
                )}
              </div>
              <textarea
                className={TEXTAREA_FIELD}
                placeholder="Add counselor feedback..."
                value={commentBody}
                onChange={(x) => setCommentBody(x.target.value)}
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  className={BTN_PRIMARY_SM}
                  onClick={() => void addComment()}
                >
                  Save comment
                </button>
              </div>
            </div>
            <div className={MODAL_FOOT}>
              <button
                type="button"
                className={BTN_SECONDARY_SM}
                onClick={() => setDetailId(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

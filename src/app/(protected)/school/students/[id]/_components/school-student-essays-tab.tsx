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
import type { SchoolStudentDetailPayload } from "@/app/(protected)/school/students/[id]/_lib/fetch-school-student-detail";
import { createSupabaseBrowserClient } from "@/utils/supabase-browser";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import "./school-student-essays-teacher-portal.css";

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

function essayRowClass(
  status: EssayStatusSlug,
  hasFile: boolean,
): "ready" | "no-file" | "in-progress" | "" {
  if (status === "ready_for_review") return "ready";
  if (!hasFile) return "no-file";
  if (status === "in_progress") return "in-progress";
  return "";
}

function essayStatusTone(
  status: EssayStatusSlug,
): "green" | "amber" | "grey" {
  if (status === "ready_for_review") return "green";
  if (status === "in_progress") return "amber";
  return "grey";
}

function computeMissingShortlistUniversities(
  essays: EssayWithComments[],
  shortlist: SchoolStudentDetailPayload["shortlist"],
): string[] {
  const covered = new Set<string>();
  for (const e of essays) {
    const raw = e.for_application?.trim();
    if (!raw) continue;
    for (const part of raw.split(/, ?/)) {
      const t = part.trim().toLowerCase();
      if (t) covered.add(t);
    }
  }
  const missing: string[] = [];
  for (const row of shortlist) {
    if (row.status === "considering") continue;
    const name = row.university_name?.trim();
    if (!name) continue;
    if (!covered.has(name.toLowerCase())) missing.push(name);
  }
  return missing;
}

export function SchoolStudentEssaysTab({
  studentId,
  initialEssays,
  shortlist,
}: {
  studentId: string;
  initialEssays: EssayWithComments[];
  shortlist: SchoolStudentDetailPayload["shortlist"];
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

  const detailEssay = detailId ? essays.find((x) => x.id === detailId) : undefined;
  const uploadEssay = uploadEssayId
    ? essays.find((x) => x.id === uploadEssayId)
    : undefined;

  const missingShortlistUnis = useMemo(
    () => computeMissingShortlistUniversities(essays, shortlist),
    [essays, shortlist],
  );

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
      setNewModalError(
        "Essay title, university, and essay type are required.",
      );
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
        deadline: form.deadline.trim() ? form.deadline.trim().slice(0, 10) : null,
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
      showToast(
        "Upload an essay draft before marking as Ready for review",
      );
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
    const rowExtra = essayRowClass(st, hasFile);
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
      metaParts.push(
        <span key="due">Deadline: {formatDate(e.deadline)}</span>,
      );
    if (e.last_edited_at)
      metaParts.push(
        <span key="led">Last edited {formatDate(e.last_edited_at)}</span>,
      );

    const firstAuthor = comments[0]?.author_display_name?.trim();

    return (
      <div
        key={e.id}
        className={`essay-row${rowExtra ? ` ${rowExtra}` : ""}`}
      >
        <div className="essay-icon">
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
        <div className="essay-info">
          <div className="essay-title">{e.title}</div>
          <div className="essay-meta">
            {metaParts.map((node, idx) => (
              <span key={idx}>
                {idx > 0 ? " · " : null}
                {node}
              </span>
            ))}
          </div>
          {hasFile ? (
            <div className="essay-file-line">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
              <span className="essay-file-name">{e.file_name}</span>
              <span style={{ color: "var(--text-hint)" }}>
                · Uploaded{" "}
                {e.file_uploaded_at
                  ? formatDate(e.file_uploaded_at)
                  : "recently"}
              </span>
            </div>
          ) : (
            <div className="essay-file-line empty">
              <svg
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
            <div className="essay-comments-line">
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
        <div className="essay-actions">
          <select
            className={`essay-status-select ${selTone}`}
            value={st}
            onChange={(ev) =>
              onStatusChange(
                e.id,
                ev.target.value as EssayStatusSlug,
                hasFile,
              )
            }
            aria-label="Essay status"
          >
            {ESSAY_STATUSES.map((v) => (
              <option
                key={v}
                value={v}
                disabled={v === "ready_for_review" && !hasFile}
                title={
                  v === "ready_for_review" && !hasFile
                    ? "Upload a draft before marking as Ready for review"
                    : undefined
                }
              >
                {ESSAY_STATUS_LABEL[v]}
                {v === "ready_for_review" && !hasFile ? " (upload first)" : ""}
              </option>
            ))}
          </select>
          <div className="essay-actions-row">
            <button
              type="button"
              className="btn sm"
              onClick={() => {
                setUploadEssayId(e.id);
                setPendingFile(null);
              }}
            >
              {hasFile ? "Replace file" : "Upload file"}
            </button>
            <button
              type="button"
              className="btn sm"
              onClick={() => openDetail(e)}
            >
              Open
            </button>
          </div>
          {!hasFile ? (
            <div className="essay-helper">
              Upload a draft before marking as Ready for review
            </div>
          ) : null}
        </div>
      </div>
    );
  });

  const stDetail = detailEssay?.status as EssayStatusSlug | undefined;
  const detailPill = stDetail ? essayStatusTone(stDetail) : "grey";

  return (
    <div className="sd-essay-portal">
      <div className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Essays</div>
            <div className="panel-sub">
              Essay requirements + uploaded drafts. Status updates auto-flow
              as files come in.
            </div>
          </div>
          <button
            type="button"
            className="btn primary sm"
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
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New essay
          </button>
        </div>
        <div className="panel-body">
          <div className="essays">{rowsHtml}</div>
          {essays.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">
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
              No essay requirements yet — click &quot;+ New essay&quot; to add
              one
            </div>
          ) : null}
          {missingShortlistUnis.length > 0 ? (
            <div className="essay-empty-card">
              <svg
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
              <div>
                Need to write essays for:{" "}
                <strong>{missingShortlistUnis.join(", ")}</strong>. Click
                &quot;+ New essay&quot; above to add essay requirements.
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {newModal ? (
        <div
          className="sd-essay-portal-modal-veil"
          role="dialog"
          aria-modal
          onClick={(ev) =>
            ev.target === ev.currentTarget && setNewModal(false)
          }
        >
          <div className="modal">
            <div className="modal-head">
              <div className="modal-title">Add new essay requirement</div>
              <button
                type="button"
                className="modal-x"
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
            <div className="modal-body">
              <div className="m-field">
                <label htmlFor="tp-essay-title">
                  Essay title{" "}
                  <span style={{ color: "var(--red, #e74c3c)" }}>*</span>
                </label>
                <input
                  id="tp-essay-title"
                  placeholder="e.g. Why Manchester essay"
                  value={form.title}
                  onChange={(x) =>
                    setForm((f) => ({ ...f, title: x.target.value }))
                  }
                />
              </div>
              <div className="m-field">
                <label htmlFor="tp-essay-uni">
                  University{" "}
                  <span style={{ color: "var(--red, #e74c3c)" }}>*</span>
                </label>
                <input
                  id="tp-essay-uni"
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
              <div className="m-field">
                <label htmlFor="tp-essay-type">
                  Essay type{" "}
                  <span style={{ color: "var(--red, #e74c3c)" }}>*</span>
                </label>
                <select
                  id="tp-essay-type"
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
              <div className="m-field">
                <label htmlFor="tp-essay-prompt">Essay question / prompt</label>
                <textarea
                  id="tp-essay-prompt"
                  placeholder="Paste the essay question or prompt here..."
                  style={{ minHeight: 80 }}
                  value={form.essay_prompt}
                  onChange={(x) =>
                    setForm((f) => ({ ...f, essay_prompt: x.target.value }))
                  }
                />
              </div>
              <div className="m-field-row">
                <div className="m-field">
                  <label htmlFor="tp-essay-count">
                    Word / character count
                  </label>
                  <input
                    id="tp-essay-count"
                    placeholder="e.g. 800 words or 4,000 characters"
                    value={form.limit_note}
                    onChange={(x) =>
                      setForm((f) => ({ ...f, limit_note: x.target.value }))
                    }
                  />
                </div>
                <div className="m-field">
                  <label htmlFor="tp-essay-deadline">Deadline</label>
                  <input
                    id="tp-essay-deadline"
                    type="date"
                    value={form.deadline}
                    onChange={(x) =>
                      setForm((f) => ({ ...f, deadline: x.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="m-field">
                <label htmlFor="tp-essay-notes">Notes / instructions</label>
                <textarea
                  id="tp-essay-notes"
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
                <div
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "var(--red, #e74c3c)",
                    fontWeight: 500,
                  }}
                >
                  {newModalError}
                </div>
              ) : null}
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn sm"
                onClick={() => setNewModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn primary sm"
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
          className="sd-essay-portal-modal-veil"
          role="dialog"
          aria-modal
          onClick={(ev) =>
            ev.target === ev.currentTarget && setUploadEssayId(null)
          }
        >
          <div className="modal">
            <div className="modal-head">
              <div className="modal-title">Upload essay file</div>
              <button
                type="button"
                className="modal-x"
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
            <div className="modal-body">
              <div className="m-recipients">
                Uploading for: <strong>{uploadEssay.title}</strong>
              </div>
              <div className="m-field">
                <label htmlFor="tp-essay-file">Choose file</label>
                <input
                  id="tp-essay-file"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={(ev) => {
                    const f = ev.target.files?.[0] ?? null;
                    setPendingFile(f);
                  }}
                />
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--text-hint)",
                    marginTop: 5,
                  }}
                >
                  Future: real file picker — PDF, DOC, DOCX, TXT supported
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn sm"
                onClick={() => {
                  setUploadEssayId(null);
                  setPendingFile(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn primary sm"
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
          className="sd-essay-portal-modal-veil"
          role="dialog"
          aria-modal
          onClick={(ev) =>
            ev.target === ev.currentTarget && setDetailId(null)
          }
        >
          <div className="modal modal-wide">
            <div className="modal-head">
              <div className="modal-title">{detailEssay.title}</div>
              <button
                type="button"
                className="modal-x"
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
            <div className="modal-section">
              <div className="modal-meta-grid">
                <div className="modal-meta-item">
                  <div className="lab">University</div>
                  <div className="val">{detailEssay.for_application ?? "—"}</div>
                </div>
                <div className="modal-meta-item">
                  <div className="lab">Essay type</div>
                  <div className="val">{detailEssay.essay_type ?? "—"}</div>
                </div>
                {detailEssay.limit_note?.trim() ? (
                  <div className="modal-meta-item">
                    <div className="lab">Word / character count</div>
                    <div className="val">{detailEssay.limit_note.trim()}</div>
                  </div>
                ) : null}
                {detailEssay.deadline ? (
                  <div className="modal-meta-item">
                    <div className="lab">Deadline</div>
                    <div className="val">{formatDate(detailEssay.deadline)}</div>
                  </div>
                ) : null}
                <div className="modal-meta-item">
                  <div className="lab">Status</div>
                  <div className="val">
                    <span className={`pill ${detailPill}`}>
                      <span className="dot" />
                      {stDetail ? ESSAY_STATUS_LABEL[stDetail] : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {detailEssay.essay_prompt?.trim() ? (
              <div className="modal-section">
                <div className="modal-section-label">
                  Essay question / prompt
                </div>
                <div className="modal-section-content prompt">
                  {detailEssay.essay_prompt.trim()}
                </div>
              </div>
            ) : null}
            <div className="modal-section">
              <div className="modal-section-label">Uploaded file</div>
              {detailEssay.file_name ? (
                <div className="modal-section-content">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{
                      verticalAlign: -2,
                      marginRight: 5,
                      color: "var(--text-light)",
                    }}
                    aria-hidden
                  >
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  </svg>
                  <strong>{detailEssay.file_name}</strong>{" "}
                  <span
                    style={{ color: "var(--text-hint)", fontSize: 12 }}
                  >
                    · Uploaded{" "}
                    {detailEssay.file_uploaded_at
                      ? formatDate(detailEssay.file_uploaded_at)
                      : ""}
                  </span>
                </div>
              ) : (
                <div
                  className="modal-section-content"
                  style={{ color: "var(--text-hint)", fontStyle: "italic" }}
                >
                  No file uploaded yet
                </div>
              )}
            </div>
            {detailEssay.instructions_note?.trim() ? (
              <div className="modal-section">
                <div className="modal-section-label">Notes / instructions</div>
                <div className="modal-section-content">
                  {detailEssay.instructions_note.trim()}
                </div>
              </div>
            ) : null}
            <div className="modal-section">
              <div className="modal-section-label">Counselor feedback</div>
              <div className="comment-list">
                {(detailEssay.student_my_application_essay_comments ?? [])
                  .length > 0 ? (
                  (detailEssay.student_my_application_essay_comments ?? []).map(
                    (c) => (
                      <div key={c.id} className="comment">
                        <div className="comment-head">
                          <span className="comment-author">
                            {c.author_display_name || "Counselor"}
                          </span>
                          <span>{formatDate(c.created_at)}</span>
                        </div>
                        <div className="comment-text">{c.body}</div>
                      </div>
                    ),
                  )
                ) : (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-hint)",
                      fontStyle: "italic",
                    }}
                  >
                    No comments yet — be the first to leave feedback
                  </div>
                )}
              </div>
              <textarea
                placeholder="Add counselor feedback..."
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1.5px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                  background: "var(--white)",
                  resize: "vertical",
                  minHeight: 60,
                }}
                value={commentBody}
                onChange={(x) => setCommentBody(x.target.value)}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 8,
                }}
              >
                <button
                  type="button"
                  className="btn primary sm"
                  onClick={() => void addComment()}
                >
                  Save comment
                </button>
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn sm"
                onClick={() => setDetailId(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="sd-essay-portal-toast" role="status">
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
    </div>
  );
}

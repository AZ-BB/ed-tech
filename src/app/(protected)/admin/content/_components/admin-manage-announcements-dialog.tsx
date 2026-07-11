"use client";

import {
  createAdminAnnouncement,
  deleteAdminAnnouncement,
  loadAdminAnnouncements,
  updateAdminAnnouncement,
} from "@/actions/admin-announcements";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import type { AdminAnnouncementTableRow } from "../_lib/fetch-admin-announcements-page";

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

type View = "list" | "add" | "edit";

type AdminManageAnnouncementsDialogProps = {
  open: boolean;
  onClose: () => void;
};

function formatTableDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "MMM d, yyyy");
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

export function AdminManageAnnouncementsDialog({
  open,
  onClose,
}: AdminManageAnnouncementsDialogProps) {
  const router = useRouter();
  const [view, setView] = useState<View>("list");
  const [rows, setRows] = useState<AdminAnnouncementTableRow[]>([]);
  const [editRow, setEditRow] = useState<AdminAnnouncementTableRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addFormKey, setAddFormKey] = useState(0);
  const [isPending, startTransition] = useTransition();
  const fetchGenerationRef = useRef(0);

  const fetchRows = useCallback(async () => {
    const generation = ++fetchGenerationRef.current;
    setListError(null);
    setIsLoading(true);

    const result = await loadAdminAnnouncements();

    if (generation !== fetchGenerationRef.current) return;

    if (!result.ok) {
      setListError(result.error);
      setRows([]);
      setIsLoading(false);
      return;
    }

    setRows(result.rows);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!open) {
      fetchGenerationRef.current += 1;
      setView("list");
      setEditRow(null);
      setRows([]);
      setListError(null);
      setFormError(null);
      setIsLoading(false);
      return;
    }

    setView("list");
    setEditRow(null);
    setFormError(null);
    void fetchRows();
  }, [open, fetchRows]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting && !isPending) {
        if (view === "list") onClose();
        else {
          setView("list");
          setEditRow(null);
          setFormError(null);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, view, isSubmitting, isPending]);

  if (!open) return null;

  function openAddView() {
    setFormError(null);
    setAddFormKey((k) => k + 1);
    setView("add");
  }

  function openEditView(row: AdminAnnouncementTableRow) {
    setFormError(null);
    setEditRow(row);
    setView("edit");
  }

  function backToList() {
    setView("list");
    setEditRow(null);
    setFormError(null);
  }

  async function handleAddSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const result = await createAdminAnnouncement(formData);

    if (!result.ok) {
      setFormError(result.error);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    backToList();
    await fetchRows();
    router.refresh();
  }

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const result = await updateAdminAnnouncement(formData);

    if (!result.ok) {
      setFormError(result.error);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    backToList();
    await fetchRows();
    router.refresh();
  }

  function handleDelete(row: AdminAnnouncementTableRow) {
    if (!window.confirm(`Delete announcement "${row.title}"? This cannot be undone.`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteAdminAnnouncement(row.id);
      if (!result.ok) {
        window.alert(result.error ?? "Could not delete announcement.");
        return;
      }
      await fetchRows();
      router.refresh();
    });
  }

  const title =
    view === "add"
      ? "Add Announcement"
      : view === "edit"
        ? "Edit Announcement"
        : "Announcements";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onClick={isSubmitting || isPending ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby="manage-announcements-title"
        className="flex max-h-[min(90vh,760px)] w-full max-w-3xl flex-col overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-4">
          <div className="min-w-0">
            <h2 id="manage-announcements-title" className="text-[16px] font-bold text-[#1a1a1a]">
              {title}
            </h2>
            {view === "list" ? (
              <p className="mt-0.5 text-[12px] text-[#6a6a6a]">
                Manage announcements shown on student dashboards.
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {view === "list" ? (
              <button
                type="button"
                onClick={openAddView}
                className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#1B4332]"
              >
                Add Announcement
              </button>
            ) : (
              <button
                type="button"
                onClick={backToList}
                disabled={isSubmitting}
                className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#4a4a4a] hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:opacity-60"
              >
                ← Back
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isPending}
              className="cursor-pointer rounded-[6px] px-2 py-1 text-[#a0a0a0] hover:bg-[#f3f2f0] hover:text-[#1a1a1a] disabled:opacity-60"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {view === "list" ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 px-5 py-10">
                <div
                  className="h-6 w-6 animate-spin rounded-full border-2 border-[#e0deda] border-t-[#2D6A4F]"
                  aria-hidden
                />
                <p className="text-[13px] text-[#6a6a6a]">Loading announcements…</p>
              </div>
            ) : listError ? (
              <p className="px-5 py-10 text-center text-[13px] text-[#b91c1c]">{listError}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#ece9e4] bg-[#faf9f7] text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
                      <th className="px-5 py-3">Title</th>
                      <th className="px-5 py-3">Content</th>
                      <th className="px-5 py-3">Created</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-12 text-center text-[13px] text-[#a0a0a0]">
                          No announcements yet. Use Add Announcement to create one.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-[#ece9e4] text-[13px] text-[#4a4a4a] last:border-b-0"
                        >
                          <td className="max-w-[180px] px-5 py-3 font-medium text-[#1a1a1a]">
                            <span className="line-clamp-2">{row.title}</span>
                          </td>
                          <td className="max-w-[240px] px-5 py-3">
                            <span className="line-clamp-2">{truncate(row.content, 100)}</span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-[12px]">
                            {formatTableDate(row.createdAt)}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => openEditView(row)}
                                className="cursor-pointer rounded-[6px] border border-[#e0deda] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#4a4a4a] transition-colors hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:opacity-60"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleDelete(row)}
                                className="cursor-pointer rounded-[6px] border border-[#fecaca] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#b91c1c] transition-colors hover:bg-[#fef2f2] disabled:opacity-60"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : view === "add" ? (
          <form
            key={addFormKey}
            onSubmit={handleAddSubmit}
            className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
          >
            {formError ? (
              <p className="mb-4 rounded-[8px] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">
                {formError}
              </p>
            ) : null}

            <div className="mb-4">
              <label htmlFor="manage-announcement-title" className={labelClassName}>
                Title
              </label>
              <input
                id="manage-announcement-title"
                name="title"
                type="text"
                required
                className={inputClassName}
                placeholder="Announcement title"
              />
            </div>

            <div className="mb-5">
              <label htmlFor="manage-announcement-content" className={labelClassName}>
                Content
              </label>
              <textarea
                id="manage-announcement-content"
                name="content"
                required
                rows={6}
                className={`${inputClassName} resize-y`}
                placeholder="Announcement content"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-[#ece9e4] pt-4">
              <button
                type="button"
                onClick={backToList}
                disabled={isSubmitting}
                className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a] hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#1B4332] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving…" : "Add Announcement"}
              </button>
            </div>
          </form>
        ) : editRow ? (
          <form onSubmit={handleEditSubmit} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <input type="hidden" name="id" value={editRow.id} />

            {formError ? (
              <p className="mb-4 rounded-[8px] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">
                {formError}
              </p>
            ) : null}

            <div className="mb-4">
              <label htmlFor="manage-edit-announcement-title" className={labelClassName}>
                Title
              </label>
              <input
                id="manage-edit-announcement-title"
                name="title"
                type="text"
                required
                defaultValue={editRow.title}
                className={inputClassName}
              />
            </div>

            <div className="mb-5">
              <label htmlFor="manage-edit-announcement-content" className={labelClassName}>
                Content
              </label>
              <textarea
                id="manage-edit-announcement-content"
                name="content"
                required
                rows={6}
                defaultValue={editRow.content}
                className={`${inputClassName} resize-y`}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-[#ece9e4] pt-4">
              <button
                type="button"
                onClick={backToList}
                disabled={isSubmitting}
                className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a] hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#1B4332] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        ) : null}

        {view === "list" ? (
          <div className="flex shrink-0 justify-end border-t border-[#ece9e4] px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isPending}
              className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a] hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:opacity-60"
            >
              Close
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

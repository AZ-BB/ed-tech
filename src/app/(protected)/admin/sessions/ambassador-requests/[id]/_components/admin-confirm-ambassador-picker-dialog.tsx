"use client";

import {
  confirmAmbassadorSpecificRequest,
  getAmbassadorsForAdminPicker,
} from "@/actions/admin-ambassador-specific-requests";
import type { AmbassadorPickerRow } from "@/app/(protected)/admin/sessions/ambassador-requests/_lib/fetch-admin-ambassadors-picker";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  requestId: number;
};

type PickerMode = "catalog" | "other";

const PAGE_SIZE = 10;

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1 block text-[12px] font-semibold text-[#4a4a4a]";

export function AdminConfirmAmbassadorPickerDialog({
  open,
  onClose,
  requestId,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<PickerMode>("catalog");
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AmbassadorPickerRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [otherFullName, setOtherFullName] = useState("");
  const [otherEmail, setOtherEmail] = useState("");
  const [otherLinkedin, setOtherLinkedin] = useState("");
  const [otherOverview, setOtherOverview] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) return;
    setMode("catalog");
    setPage(1);
    setSelectedId(null);
    setSearch("");
    setDebouncedQ("");
    setOtherFullName("");
    setOtherEmail("");
    setOtherLinkedin("");
    setOtherOverview("");
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setPage(1);
  }, [debouncedQ, open]);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getAmbassadorsForAdminPicker({
      q: debouncedQ,
      page,
      limit: PAGE_SIZE,
    });
    if (result.error) {
      setError(result.error);
      setRows([]);
      setTotalRows(0);
    } else {
      setRows(result.rows);
      setTotalRows(result.totalRows);
    }
    setLoading(false);
  }, [debouncedQ, page, open]);

  useEffect(() => {
    if (!open || mode !== "catalog") return;
    void loadPage();
  }, [open, mode, loadPage]);

  if (!open) return null;

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const canSubmitCatalog = Boolean(selectedId) && !loading;
  const canSubmitOther =
    otherFullName.trim().length > 0 && otherOverview.trim().length > 0;
  const canSubmit = mode === "catalog" ? canSubmitCatalog : canSubmitOther;

  function handleClose() {
    if (isSubmitting) return;
    setError(null);
    onClose();
  }

  function switchToCatalog() {
    setMode("catalog");
    setError(null);
  }

  function switchToOther() {
    setMode("other");
    setSelectedId(null);
    setError(null);
  }

  async function handleConfirm() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);

    const result =
      mode === "catalog"
        ? await confirmAmbassadorSpecificRequest(requestId, {
            mode: "catalog",
            ambassadorId: selectedId!,
          })
        : await confirmAmbassadorSpecificRequest(requestId, {
            mode: "other",
            fullName: otherFullName.trim(),
            email: otherEmail.trim() || null,
            linkedin: otherLinkedin.trim() || null,
            overview: otherOverview.trim(),
          });

    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
    handleClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-ambassador-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-[12px] border border-[#e0deda] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[#ece9e4] px-6 py-5">
          <h2
            id="confirm-ambassador-title"
            className="text-[18px] font-semibold text-[#1a1a1a]"
          >
            Confirm ambassador
          </h2>
          <p className="mt-1 text-[13px] text-[#666]">
            Select an ambassador from the catalog or enter details for someone not
            listed. The student will receive an email with the match.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-[8px] px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                mode === "catalog"
                  ? "bg-[#2d6a4f] text-white"
                  : "border border-[#e0deda] bg-white text-[#4a4a4a] hover:border-[#c5ddd0]"
              }`}
              onClick={switchToCatalog}
              disabled={isSubmitting}
            >
              Catalog ambassador
            </button>
            <button
              type="button"
              className={`rounded-[8px] px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                mode === "other"
                  ? "bg-[#2d6a4f] text-white"
                  : "border border-[#e0deda] bg-white text-[#4a4a4a] hover:border-[#c5ddd0]"
              }`}
              onClick={switchToOther}
              disabled={isSubmitting}
            >
              Other
            </button>
          </div>
          {mode === "catalog" ? (
            <input
              type="search"
              className={`${inputClassName} mt-4`}
              placeholder="Search by name, email, university, or major…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {error ? (
            <p className="mb-3 rounded-[8px] border border-[#f5c6cb] bg-[#fdf2f2] px-3 py-2 text-[13px] text-[#842029]">
              {error}
            </p>
          ) : null}

          {mode === "other" ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="other-full-name" className={labelClassName}>
                  Full name <span className="text-[#c0392b]">*</span>
                </label>
                <input
                  id="other-full-name"
                  type="text"
                  className={inputClassName}
                  value={otherFullName}
                  onChange={(e) => setOtherFullName(e.target.value)}
                  placeholder="Ambassador full name"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="other-email" className={labelClassName}>
                  Email <span className="font-normal text-[#888]">(optional)</span>
                </label>
                <input
                  id="other-email"
                  type="email"
                  className={inputClassName}
                  value={otherEmail}
                  onChange={(e) => setOtherEmail(e.target.value)}
                  placeholder="ambassador@example.com"
                />
              </div>
              <div>
                <label htmlFor="other-linkedin" className={labelClassName}>
                  LinkedIn link{" "}
                  <span className="font-normal text-[#888]">(optional)</span>
                </label>
                <input
                  id="other-linkedin"
                  type="url"
                  className={inputClassName}
                  value={otherLinkedin}
                  onChange={(e) => setOtherLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/…"
                />
              </div>
              <div>
                <label htmlFor="other-overview" className={labelClassName}>
                  Overview <span className="text-[#c0392b]">*</span>
                </label>
                <textarea
                  id="other-overview"
                  className={`${inputClassName} min-h-[120px] resize-y`}
                  value={otherOverview}
                  onChange={(e) => setOtherOverview(e.target.value)}
                  placeholder="Brief background, university, and how they can help the student…"
                />
              </div>
            </div>
          ) : loading ? (
            <p className="py-8 text-center text-[13px] text-[#888]">Loading ambassadors…</p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[#888]">
              No ambassadors match your search.
            </p>
          ) : (
            <ul className="space-y-2" role="listbox" aria-label="Ambassadors">
              {rows.map((row) => {
                const name =
                  [row.firstName, row.lastName].filter(Boolean).join(" ").trim() ||
                  row.email;
                const checked = selectedId === row.id;
                return (
                  <li key={row.id}>
                    <label
                      className={`flex cursor-pointer gap-3 rounded-[10px] border px-3.5 py-3 transition-colors ${
                        checked
                          ? "border-[#40916C] bg-[#f0f7f2]"
                          : "border-[#ece9e4] bg-white hover:border-[#c5ddd0]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="ambassador-picker"
                        className="mt-1 shrink-0"
                        checked={checked}
                        onChange={() => setSelectedId(row.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[14px] font-semibold text-[#1a1a1a]">
                            {name}
                          </span>
                          {!row.isActive ? (
                            <span className="rounded-full bg-[#f5f0e8] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#6b5b3e]">
                              Inactive
                            </span>
                          ) : (
                            <span className="rounded-full bg-[#e8f5ee] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#2d6a4f]">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[12px] text-[#666]">{row.email}</p>
                        <p className="mt-1 text-[12px] text-[#4a4a4a]">
                          {row.university}
                          {row.major ? ` · ${row.major}` : ""} · {row.destinationLabel}
                        </p>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ece9e4] px-6 py-4">
          {mode === "catalog" ? (
            <div className="flex items-center gap-2 text-[12px] text-[#666]">
              <button
                type="button"
                className="rounded-[6px] border border-[#e0deda] px-2.5 py-1 disabled:opacity-40"
                disabled={!canPrev || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
                {totalRows > 0 ? ` (${totalRows} total)` : ""}
              </span>
              <button
                type="button"
                className="rounded-[6px] border border-[#e0deda] px-2.5 py-1 disabled:opacity-40"
                disabled={!canNext || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          ) : (
            <p className="text-[12px] text-[#888]">
              This ambassador is not in the catalog.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-[8px] border border-[#e0deda] px-4 py-2 text-[13px] font-medium text-[#4a4a4a]"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-[8px] bg-[#2d6a4f] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              disabled={!canSubmit || isSubmitting}
              onClick={() => void handleConfirm()}
            >
              {isSubmitting ? "Sending…" : "Send confirmation to student"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

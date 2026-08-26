"use client";

import {
  translateAdminWebinar,
  updateAdminWebinarArabicContent,
} from "@/actions/admin-webinar-translation";
import type { AdminWebinarDetailPayload } from "@/app/(protected)/admin/content/_lib/fetch-admin-webinar-detail";
import type { WebinarTranslationStatus } from "@/lib/webinar-translatable-fields";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminEditWebinarArDialog } from "./admin-edit-webinar-ar-dialog";

const STATUS_STYLES: Record<
  WebinarTranslationStatus,
  { label: string; className: string }
> = {
  not_translated: {
    label: "Not translated",
    className: "bg-[#f5f5f5] text-[#666]",
  },
  up_to_date: {
    label: "Up to date",
    className: "bg-[#E8F5EE] text-[#2D6A4F]",
  },
  outdated: {
    label: "Outdated",
    className: "bg-[#FFF3E0] text-[#E65100]",
  },
};

export function AdminWebinarTranslatePanel({
  payload,
}: {
  payload: AdminWebinarDetailPayload;
}) {
  const router = useRouter();
  const [editArOpen, setEditArOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTranslating, startTranslateTransition] = useTransition();

  const statusStyle = STATUS_STYLES[payload.translationStatus];

  function handleTranslate() {
    setMessage(null);
    setError(null);
    startTranslateTransition(async () => {
      const result = await translateAdminWebinar(payload.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      const partial =
        result.errors.length > 0
          ? ` (${result.errors.length} field(s) failed)`
          : "";
      setMessage(`Translated ${result.translatedCount} field(s)${partial}.`);
      router.refresh();
    });
  }

  return (
    <>
      <div className="mt-4 rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                Arabic translation
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] ${statusStyle.className}`}
              >
                {statusStyle.label}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-[var(--text-light)]">
              Auto-translate English webinar content for Arabic student and public pages.
              {payload.contentArTranslatedAt ? (
                <>
                  {" "}
                  Last translated{" "}
                  {new Date(payload.contentArTranslatedAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  .
                </>
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleTranslate}
              disabled={isTranslating}
              className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-white px-4 py-[7px] text-[12px] font-semibold text-[#2D6A4F] transition-all hover:bg-[#E8F5EE] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isTranslating ? "Translating…" : "Translate to Arabic"}
            </button>
            <button
              type="button"
              onClick={() => setEditArOpen(true)}
              className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-[7px] text-[12px] font-semibold text-[var(--text)] transition-all hover:border-[#40916C]"
            >
              Edit Arabic
            </button>
          </div>
        </div>

        {message ? (
          <p className="mt-3 text-[12px] font-medium text-[#2D6A4F]">{message}</p>
        ) : null}
        {error ? (
          <p className="mt-3 text-[12px] font-medium text-[#C0392B]">{error}</p>
        ) : null}

        {payload.contentAr && Object.keys(payload.contentAr).length > 0 ? (
          <div className="mt-3 rounded-[8px] bg-[#fafafa] px-3 py-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
              Arabic preview
            </div>
            {payload.contentAr.title ? (
              <p className="mt-1 text-[13px] font-semibold text-[var(--text)]" dir="rtl">
                {payload.contentAr.title}
              </p>
            ) : null}
            {payload.contentAr.description ? (
              <p
                className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-[var(--text)]"
                dir="rtl"
              >
                {payload.contentAr.description}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <AdminEditWebinarArDialog
        open={editArOpen}
        onClose={() => setEditArOpen(false)}
        payload={payload}
      />
    </>
  );
}

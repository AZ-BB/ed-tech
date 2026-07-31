"use client";

import { ModalVeil } from "@/app/(protected)/student/my-applications/_components/modal-veil";
import { useLocale } from "@/lib/i18n/locale-context";
import type { AiDailyLimitFeatureKey } from "@/lib/student-ai-daily-limit";
import type { StudentAiDailyLimitStatus } from "@/lib/student-ai-daily-limit";
import { useEffect, useMemo } from "react";

export type AiUsageLimitKind = "daily" | "funnel_overall";

type StudentAiDailyLimitModalProps = {
  open: boolean;
  onClose: () => void;
  featureKey: AiDailyLimitFeatureKey | null;
  status: StudentAiDailyLimitStatus | null;
  limitKind?: AiUsageLimitKind;
};

export function StudentAiDailyLimitModal({
  open,
  onClose,
  featureKey,
  status,
  limitKind = "daily",
}: StudentAiDailyLimitModalProps) {
  const { dict } = useLocale();
  const copy =
    limitKind === "funnel_overall"
      ? dict.student.aiDailyLimit.funnelOverall
      : dict.student.aiDailyLimit;
  const featureLabels = dict.student.aiDailyLimit.features;

  const featureLabel = useMemo(() => {
    if (!featureKey) return null;
    return featureLabels[featureKey];
  }, [featureKey, featureLabels]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const title =
    featureLabel != null
      ? copy.titleForFeature.replace("{feature}", featureLabel)
      : copy.title;

  return (
    <ModalVeil title={title} onClose={onClose} panelClassName="max-w-[420px]">
      <p className="text-[13.5px] leading-relaxed text-[var(--text-mid)]">{copy.body}</p>
      {status?.limit != null ? (
        <p className="mt-3 text-[12.5px] font-semibold text-[var(--text)]">
          {copy.usageSummary
            .replace("{used}", String(status.used))
            .replace("{limit}", String(status.limit))}
        </p>
      ) : null}
      {limitKind === "daily" && "resetHint" in copy ? (
        <p className="mt-2 text-[12px] text-[var(--text-light)]">{copy.resetHint}</p>
      ) : null}
      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full cursor-pointer rounded-xl border-none bg-[var(--green)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--green-dark)]"
      >
        {copy.gotIt}
      </button>
    </ModalVeil>
  );
}

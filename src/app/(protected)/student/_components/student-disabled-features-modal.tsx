"use client";

import { ModalVeil } from "@/app/(protected)/student/my-applications/_components/modal-veil";
import {
  quickActionByDictKey,
  type QuickActionDictKey,
} from "@/app/(protected)/student/_data/student-dashboard-data";
import { useLocale } from "@/lib/i18n/locale-context";
import {
  FEATURE_TO_QUICK_ACTION_DICT_KEY,
  getDisabledStudentFeatures,
  type StudentFeatureAccess,
  type StudentFeatureKey,
} from "@/lib/student-feature-access";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type StudentDisabledFeaturesModalProps = {
  open: boolean;
  onClose: () => void;
  featureAccess: StudentFeatureAccess;
  highlightedFeature?: StudentFeatureKey | null;
};

function FeatureIcon({
  dictKey,
  size = 20,
  className,
}: {
  dictKey: QuickActionDictKey;
  size?: number;
  className?: string;
}) {
  const action = quickActionByDictKey[dictKey];

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl ${action.iconWrap} ${className ?? ""}`}
      style={{ width: size * 2.1, height: size * 2.1 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={action.iconStroke}
        strokeWidth="1.8"
        aria-hidden
      >
        {action.icon}
      </svg>
    </div>
  );
}

export function StudentDisabledFeaturesModal({
  open,
  onClose,
  featureAccess,
  highlightedFeature,
}: StudentDisabledFeaturesModalProps) {
  const { dict } = useLocale();
  const copy = dict.student.dashboard.disabledFeaturesModal;
  const disabledFeatures = useMemo(
    () => getDisabledStudentFeatures(featureAccess),
    [featureAccess],
  );
  const modalItems = copy.items as Record<
    QuickActionDictKey,
    { title: string; description: string }
  >;
  const [activeFeature, setActiveFeature] = useState<StudentFeatureKey | null>(
    null,
  );

  useEffect(() => {
    if (!open) {
      setActiveFeature(null);
      return;
    }

    if (disabledFeatures.length === 0) {
      onClose();
      return;
    }

    setActiveFeature(
      highlightedFeature && disabledFeatures.includes(highlightedFeature)
        ? highlightedFeature
        : disabledFeatures[0],
    );
  }, [open, highlightedFeature, disabledFeatures, onClose]);

  if (!open || disabledFeatures.length === 0 || activeFeature == null) {
    return null;
  }

  const activeIndex = disabledFeatures.indexOf(activeFeature);
  const activeDictKey =
    FEATURE_TO_QUICK_ACTION_DICT_KEY[activeFeature] as QuickActionDictKey;
  const activeItem = modalItems[activeDictKey];
  const hasPrevious = activeIndex > 0;
  const hasNext = activeIndex < disabledFeatures.length - 1;

  const goPrevious = () => {
    if (hasPrevious) {
      setActiveFeature(disabledFeatures[activeIndex - 1]);
    }
  };

  const goNext = () => {
    if (hasNext) {
      setActiveFeature(disabledFeatures[activeIndex + 1]);
    }
  };

  return (
    <ModalVeil title={copy.title} onClose={onClose} panelClassName="max-w-[760px]">
      <p className="mb-5 text-[13.5px] leading-relaxed text-[var(--text-light)]">
        {copy.subtitle}
      </p>

      <div className="flex min-h-[320px] flex-col overflow-hidden rounded-2xl border border-[var(--border-light)] sm:flex-row">
        <div
          role="tablist"
          aria-label={copy.title}
          className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-[var(--border-light)] bg-[var(--cream)] p-2 sm:w-[240px] sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-e sm:p-2.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-[var(--border)]"
        >
          {disabledFeatures.map((featureKey) => {
            const dictKey =
              FEATURE_TO_QUICK_ACTION_DICT_KEY[featureKey] as QuickActionDictKey;
            const item = modalItems[dictKey];
            const isActive = activeFeature === featureKey;

            return (
              <button
                key={featureKey}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveFeature(featureKey)}
                className={`flex min-w-[148px] cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-start transition-colors sm:min-w-0 sm:w-full ${
                  isActive
                    ? "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-[var(--green)]"
                    : "hover:bg-white/70"
                }`}
              >
                <FeatureIcon dictKey={dictKey} size={18} />
                <span
                  className={`text-[12.5px] font-semibold leading-snug ${
                    isActive ? "text-[var(--green-dark)]" : "text-[var(--text-mid)]"
                  }`}
                >
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          className="flex flex-1 flex-col bg-white px-5 py-6 sm:px-7 sm:py-7"
        >
          <FeatureIcon dictKey={activeDictKey} size={28} className="mb-5" />
          <h3 className="font-[family-name:var(--font-dm-serif)] text-[22px] leading-tight text-[var(--text)]">
            {activeItem.title}
          </h3>
          <p className="mt-4 flex-1 text-[15px] leading-[1.75] text-[var(--text-light)]">
            {activeItem.description}
          </p>

          {disabledFeatures.length > 1 ? (
            <div className="mt-6 flex items-center gap-2 border-t border-[var(--border-light)] pt-4">
              <button
                type="button"
                onClick={goPrevious}
                disabled={!hasPrevious}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-[12.5px] font-semibold text-[var(--text-mid)] transition hover:bg-[var(--sand)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                {copy.previous}
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!hasNext}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-[12.5px] font-semibold text-[var(--text-mid)] transition hover:bg-[var(--sand)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copy.next}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex justify-end border-t border-[var(--border-light)] pt-4">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[var(--green)] px-6 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[var(--green-dark)]"
        >
          {copy.close}
        </button>
      </div>
    </ModalVeil>
  );
}

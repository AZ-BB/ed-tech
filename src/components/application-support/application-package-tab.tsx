"use client";

import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import {
  APPLICATION_PACKAGE_LIFECYCLE_KEYS,
  APPLICATION_PACKAGE_LIFECYCLE_LABEL,
  type ApplicationPackageLifecycleKey,
  type ApplicationPackageView,
} from "@/lib/application-package-data";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type ApplicationPackageActions = {
  toggleLifecycle: (
    applicationId: string,
    key: ApplicationPackageLifecycleKey,
    completed: boolean,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  updateStats: (
    applicationId: string,
    universitiesAdded: number,
    applicationsSubmitted: number,
    startedAt: string | null,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  updateUniversitiesTotal: (
    applicationId: string,
    universitiesTotal: number,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};

type ApplicationPackageTabProps = {
  applicationId: number;
  packageView: ApplicationPackageView;
  actions: ApplicationPackageActions;
};

function LifecycleCheckbox({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex w-full cursor-pointer items-center gap-2.5 py-2 text-left text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? "text-[var(--text-light)]" : "text-[var(--text-mid)]"
      }`}
    >
      <span
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] ${
          checked
            ? "border-[var(--green)] bg-[var(--green)] text-white"
            : "border-[var(--border)] bg-white"
        }`}
      >
        {checked ? (
          <svg
            className="h-[11px] w-[11px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            aria-hidden
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : null}
      </span>
      <span className={checked ? "line-through" : undefined}>{label}</span>
    </button>
  );
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function formatShortDateFromInput(value: string): string {
  if (!value) return "—";
  try {
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "—";
  }
}

export function ApplicationPackageTab({
  applicationId,
  packageView,
  actions,
}: ApplicationPackageTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [universitiesAdded, setUniversitiesAdded] = useState(
    String(packageView.universitiesAdded),
  );
  const [applicationsSubmitted, setApplicationsSubmitted] = useState(
    String(packageView.applicationsSubmitted),
  );
  const [startedAt, setStartedAt] = useState(
    toDateInputValue(packageView.startedAt),
  );

  const universitiesTotal = Math.max(1, packageView.universitiesTotal);
  const paidLabel =
    packageView.totalPaidAed > 0
      ? `AED ${packageView.totalPaidAed.toLocaleString()}`
      : "—";

  function persistStats(
    nextUniversitiesAdded: string,
    nextApplicationsSubmitted: string,
    nextStartedAt: string,
  ) {
    const added = Number.parseInt(nextUniversitiesAdded, 10);
    const submitted = Number.parseInt(nextApplicationsSubmitted, 10);

    if (!Number.isFinite(added) || added < 0) return;
    if (!Number.isFinite(submitted) || submitted < 0) return;

    const startedAtIso = nextStartedAt
      ? new Date(`${nextStartedAt}T12:00:00`).toISOString()
      : null;

    setError(null);
    startTransition(async () => {
      const result = await actions.updateStats(
        String(applicationId),
        added,
        submitted,
        startedAtIso,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleToggleLifecycle(key: ApplicationPackageLifecycleKey, completed: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await actions.toggleLifecycle(
        String(applicationId),
        key,
        completed,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      {error ? (
        <p className="mb-3 text-[12px] font-medium text-[#E74C3C]">{error}</p>
      ) : null}
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[14px] bg-gradient-to-br from-[var(--green-dark)] to-[var(--green)] px-5 py-[18px] text-white">
          <div className="font-['DM_Serif_Display',serif] text-[42px] leading-none">
            {packageView.progressPercent}%
          </div>
          <div className="mt-1 text-[12px] opacity-85">{packageView.packageLabel}</div>
          <div className="mt-3.5 mb-3.5 h-2 overflow-hidden rounded bg-white/18">
            <div
              className="h-full rounded bg-white transition-all"
              style={{ width: `${packageView.progressPercent}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <div>
              <div className="flex items-baseline gap-1 text-[16px] font-bold">
                <input
                  type="number"
                  min={0}
                  aria-label="Universities added"
                  value={universitiesAdded}
                  disabled={isPending}
                  onChange={(event) => setUniversitiesAdded(event.target.value)}
                  onBlur={() =>
                    persistStats(universitiesAdded, applicationsSubmitted, startedAt)
                  }
                  className="w-10 border-0 bg-transparent p-0 text-[16px] font-bold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span>/ {universitiesTotal}</span>
              </div>
              <div className="text-[11px] uppercase tracking-[0.04em] opacity-80">
                Universities added
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1 text-[16px] font-bold">
                <input
                  type="number"
                  min={0}
                  aria-label="Applications submitted"
                  value={applicationsSubmitted}
                  disabled={isPending}
                  onChange={(event) => setApplicationsSubmitted(event.target.value)}
                  onBlur={() =>
                    persistStats(universitiesAdded, applicationsSubmitted, startedAt)
                  }
                  className="w-10 border-0 bg-transparent p-0 text-[16px] font-bold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span>/ {universitiesTotal}</span>
              </div>
              <div className="text-[11px] uppercase tracking-[0.04em] opacity-80">
                Applications submitted
              </div>
            </div>
            <div>
              <div className="text-[16px] font-bold">
                {startedAt ? formatShortDateFromInput(startedAt) : "—"}
              </div>
              <div className="text-[11px] uppercase tracking-[0.04em] opacity-80">
                Started
              </div>
              <input
                type="date"
                aria-label="Package started on"
                value={startedAt}
                disabled={isPending}
                onChange={(event) => {
                  const next = event.target.value;
                  setStartedAt(next);
                  persistStats(universitiesAdded, applicationsSubmitted, next);
                }}
                className="mt-1 w-full max-w-[140px] rounded border border-white/25 bg-white/10 px-2 py-1 text-[11px] text-white outline-none [color-scheme:dark]"
              />
            </div>
            <div>
              <div className="text-[16px] font-bold">{paidLabel}</div>
              <div className="text-[11px] uppercase tracking-[0.04em] opacity-80">
                Paid
              </div>
            </div>
          </div>
        </div>

        <SchoolStudentPanel head="Lifecycle checklist" sub="Track package milestones">
          <div className="flex flex-col gap-0.5">
            {APPLICATION_PACKAGE_LIFECYCLE_KEYS.map((key) => (
              <LifecycleCheckbox
                key={key}
                checked={packageView.lifecycle[key]}
                disabled={isPending}
                label={APPLICATION_PACKAGE_LIFECYCLE_LABEL[key]}
                onChange={(completed) => handleToggleLifecycle(key, completed)}
              />
            ))}
          </div>
        </SchoolStudentPanel>
      </div>
    </div>
  );
}

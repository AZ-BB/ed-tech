"use client";

import {
  updateAiDailyLimits,
  updatePlatformCreditDefaults,
  updatePlatformFeatureFlags,
} from "@/actions/admin-settings";
import {
  AI_DAILY_LIMIT_FEATURE_KEYS,
  AI_DAILY_LIMIT_LABELS,
} from "@/lib/student-ai-daily-limit";
import {
  PLATFORM_FEATURE_LABELS,
  type PlatformFeatureKey,
  type PlatformSettings,
} from "@/lib/platform-settings";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AdminSettingsAdminRow } from "../_lib/fetch-admin-settings-page";
import { AdminSettingsRolePermissions } from "./admin-settings-role-permissions";
import type { AdminRolePermissionTemplates } from "@/lib/admin-role-permissions";

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

const sectionClassName =
  "rounded-[12px] border border-[#e8e6e2] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.04)]";

const FEATURE_KEYS: PlatformFeatureKey[] = [
  "ai_university_matching",
  "ai_program_matching",
  "essay_review",
  "advisor_sessions",
  "ambassador_booking",
  "application_support",
];

type Props = {
  settings: PlatformSettings;
  admins: AdminSettingsAdminRow[];
  rolePermissions: AdminRolePermissionTemplates;
};

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[15px] font-bold text-[#1a1a1a]">{title}</h2>
      {description ? (
        <p className="mt-1 text-[12px] text-[#888]">{description}</p>
      ) : null}
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={[
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
        active ? "bg-[#E8F5EE] text-[#2D6A4F]" : "bg-[#F3F3F3] text-[#888]",
      ].join(" ")}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function AdminSettingsClient({ settings, admins, rolePermissions }: Props) {
  const router = useRouter();
  const [defaultsError, setDefaultsError] = useState<string | null>(null);
  const [defaultsSaving, setDefaultsSaving] = useState(false);
  const [aiLimitsError, setAiLimitsError] = useState<string | null>(null);
  const [aiLimitsSaving, setAiLimitsSaving] = useState(false);
  const [featuresError, setFeaturesError] = useState<string | null>(null);
  const [featuresSaving, setFeaturesSaving] = useState(false);

  async function handleDefaultsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDefaultsSaving(true);
    setDefaultsError(null);
    const result = await updatePlatformCreditDefaults(new FormData(event.currentTarget));
    if (!result.ok) {
      setDefaultsError(result.error);
    } else {
      router.refresh();
    }
    setDefaultsSaving(false);
  }

  async function handleAiLimitsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAiLimitsSaving(true);
    setAiLimitsError(null);
    const result = await updateAiDailyLimits(new FormData(event.currentTarget));
    if (!result.ok) {
      setAiLimitsError(result.error);
    } else {
      router.refresh();
    }
    setAiLimitsSaving(false);
  }

  async function handleFeaturesSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeaturesSaving(true);
    setFeaturesError(null);
    const result = await updatePlatformFeatureFlags(new FormData(event.currentTarget));
    if (!result.ok) {
      setFeaturesError(result.error);
    } else {
      router.refresh();
    }
    setFeaturesSaving(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className={sectionClassName}>
        <SectionHeading
          title="System defaults"
          description="Default per-student credits applied when creating a new school. Admins can override these in the school create form."
        />
        <form onSubmit={handleDefaultsSubmit} className="max-w-md space-y-4">
          <div>
            <label htmlFor="default-advisor-credit" className={labelClassName}>
              Default advisor credit for student
            </label>
            <input
              id="default-advisor-credit"
              name="defaultAdvisorCreditLimit"
              type="number"
              min={0}
              defaultValue={settings.defaultAdvisorCreditLimit ?? ""}
              className={inputClassName}
              placeholder="Optional"
            />
          </div>
          <div>
            <label htmlFor="default-ambassador-credit" className={labelClassName}>
              Default ambassador credit for student
            </label>
            <input
              id="default-ambassador-credit"
              name="defaultAmbassadorCreditLimit"
              type="number"
              min={0}
              defaultValue={settings.defaultAmbassadorCreditLimit ?? ""}
              className={inputClassName}
              placeholder="Optional"
            />
          </div>
          {defaultsError ? <p className="text-[13px] text-red-600">{defaultsError}</p> : null}
          <button
            type="submit"
            disabled={defaultsSaving}
            className="rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
          >
            {defaultsSaving ? "Saving…" : "Save defaults"}
          </button>
        </form>
      </section>

      <section className={sectionClassName}>
        <SectionHeading
          title="AI daily limits"
          description="Maximum successful AI runs per student per UTC day. Leave blank for unlimited. Usage is counted from completed AI requests."
        />
        <form onSubmit={handleAiLimitsSubmit} className="max-w-md space-y-4">
          {AI_DAILY_LIMIT_FEATURE_KEYS.map((featureKey) => {
            const formName =
              featureKey === "essay_review"
                ? "aiDailyLimitEssayReview"
                : featureKey === "ai_university_matching"
                  ? "aiDailyLimitUniversityMatching"
                  : "aiDailyLimitProgramMatching";
            return (
              <div key={featureKey}>
                <label htmlFor={`ai-limit-${featureKey}`} className={labelClassName}>
                  {AI_DAILY_LIMIT_LABELS[featureKey]} — daily uses per student
                </label>
                <input
                  id={`ai-limit-${featureKey}`}
                  name={formName}
                  type="number"
                  min={0}
                  defaultValue={settings.aiDailyLimits[featureKey] ?? ""}
                  className={inputClassName}
                  placeholder="Unlimited"
                />
              </div>
            );
          })}
          <div>
            <label htmlFor="funnel-overall-essay-review" className={labelClassName}>
              Essay Review — total uses for free funnel students
            </label>
            <input
              id="funnel-overall-essay-review"
              name="funnelOverallLimitEssayReview"
              type="number"
              min={0}
              defaultValue={settings.funnelOverallLimitEssayReview ?? ""}
              className={inputClassName}
              placeholder="Unlimited"
            />
            <p className="mt-1.5 text-[11px] text-[#888]">
              Lifetime cap for unpaid funnel students only. Subscribed funnel students are not
              affected.
            </p>
          </div>
          {aiLimitsError ? <p className="text-[13px] text-red-600">{aiLimitsError}</p> : null}
          <button
            type="submit"
            disabled={aiLimitsSaving}
            className="rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
          >
            {aiLimitsSaving ? "Saving…" : "Save AI daily limits"}
          </button>
        </form>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
        <section className={`${sectionClassName} flex h-full flex-col`}>
          <SectionHeading
            title="Feature toggles"
            description="Page-level controls for student-facing services. Disabled features show an unavailable message when accessed."
          />
          <form onSubmit={handleFeaturesSubmit} className="flex flex-1 flex-col space-y-3">
            {FEATURE_KEYS.map((featureKey) => (
              <label
                key={featureKey}
                className="flex cursor-pointer items-center justify-between gap-4 rounded-[8px] border border-[#f0eeea] px-3 py-2.5"
              >
                <span className="text-[13px] font-medium text-[#1a1a1a]">
                  {PLATFORM_FEATURE_LABELS[featureKey]}
                </span>
                <input
                  type="checkbox"
                  name={`feature_${featureKey}`}
                  defaultChecked={settings.features[featureKey]}
                  className="h-4 w-4 shrink-0 accent-[#2D6A4F]"
                />
              </label>
            ))}
            {featuresError ? <p className="text-[13px] text-red-600">{featuresError}</p> : null}
            <button
              type="submit"
              disabled={featuresSaving}
              className="rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {featuresSaving ? "Saving…" : "Save feature toggles"}
            </button>
          </form>
        </section>

        <section className={`${sectionClassName} flex h-full flex-col`}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <SectionHeading
              title="Admins"
              description="Platform administrators with access to the admin portal."
            />
            <Link
              href="/admin/users/admins"
              className="shrink-0 rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a]"
            >
              Manage admins
            </Link>
          </div>

          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-0 border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#e8e6e2] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#888]">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#888]">
                      No admins found.
                    </td>
                  </tr>
                ) : (
                  admins.map((admin) => (
                    <tr key={admin.id} className="border-b border-[#f0eeea]">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/admin/users/admins/${admin.id}`}
                          className="font-semibold text-[#2D6A4F] hover:underline"
                        >
                          {[admin.firstName, admin.lastName].filter(Boolean).join(" ") || "Admin"}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-[#4a4a4a]">{admin.email || "—"}</td>
                      <td className="py-3 pr-4">{admin.role}</td>
                      <td className="py-3">
                        <StatusBadge active={admin.isActive} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <AdminSettingsRolePermissions rolePermissions={rolePermissions} />
    </div>
  );
}

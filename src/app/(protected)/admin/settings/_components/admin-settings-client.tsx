"use client";

import {
  createAdminApplicationPlan,
  setAdminApplicationPlanActive,
} from "@/actions/admin-application-plans";
import {
  updatePlatformCreditDefaults,
  updatePlatformFeatureFlags,
} from "@/actions/admin-settings";
import {
  PLATFORM_FEATURE_LABELS,
  type PlatformFeatureKey,
  type PlatformSettings,
} from "@/lib/platform-settings";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AdminSettingsAdminRow, AdminSettingsPlanRow } from "../_lib/fetch-admin-settings-page";
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
  plans: AdminSettingsPlanRow[];
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

export function AdminSettingsClient({ settings, plans, admins, rolePermissions }: Props) {
  const router = useRouter();
  const [defaultsError, setDefaultsError] = useState<string | null>(null);
  const [defaultsSaving, setDefaultsSaving] = useState(false);
  const [featuresError, setFeaturesError] = useState<string | null>(null);
  const [featuresSaving, setFeaturesSaving] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planSaving, setPlanSaving] = useState(false);
  const [planToggleId, setPlanToggleId] = useState<number | null>(null);

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

  async function handleCreatePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPlanSaving(true);
    setPlanError(null);
    const result = await createAdminApplicationPlan(new FormData(event.currentTarget));
    if (!result.ok) {
      setPlanError(result.error);
      setPlanSaving(false);
      return;
    }
    setPlanSaving(false);
    setPlanDialogOpen(false);
    event.currentTarget.reset();
    router.refresh();
  }

  async function handleTogglePlan(planId: number, isActive: boolean) {
    setPlanToggleId(planId);
    const result = await setAdminApplicationPlanActive(planId, isActive);
    if (!result.ok) {
      setPlanError(result.error);
    } else {
      setPlanError(null);
      router.refresh();
    }
    setPlanToggleId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 lg:items-start">
        <section className={`${sectionClassName} lg:col-span-3`}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <SectionHeading
              title="Application plans"
              description="Create or deactivate application support plans. Plans cannot be deleted once used in the system."
            />
            <button
              type="button"
              onClick={() => {
                setPlanError(null);
                setPlanDialogOpen(true);
              }}
              className="rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white"
            >
              Create plan
            </button>
          </div>

          {planError && !planDialogOpen ? (
            <p className="mb-3 text-[13px] text-red-600">{planError}</p>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#e8e6e2] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#888]">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Universities</th>
                  <th className="py-2 pr-4">Price (AED)</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#888]">
                      No application plans configured.
                    </td>
                  </tr>
                ) : (
                  plans.map((plan) => (
                    <tr key={plan.id} className="border-b border-[#f0eeea]">
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-[#1a1a1a]">{plan.name}</div>
                        {plan.isMostPopular ? (
                          <span className="mt-0.5 inline-block text-[11px] font-medium text-[#2D6A4F]">
                            Most popular
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4">{plan.universitiesCount}</td>
                      <td className="py-3 pr-4">{plan.price.toLocaleString()}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge active={plan.isActive} />
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          disabled={planToggleId === plan.id}
                          onClick={() => handleTogglePlan(plan.id, !plan.isActive)}
                          className="rounded-[6px] border border-[#e0deda] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#4a4a4a] disabled:opacity-60"
                        >
                          {planToggleId === plan.id
                            ? "Updating…"
                            : plan.isActive
                              ? "Deactivate"
                              : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${sectionClassName} lg:col-span-1`}>
          <SectionHeading
            title="System defaults"
            description="Default per-student credits applied when creating a new school. Admins can override these in the school create form."
          />
          <form onSubmit={handleDefaultsSubmit} className="space-y-4">
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
              className="w-full rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {defaultsSaving ? "Saving…" : "Save defaults"}
            </button>
          </form>
        </section>
      </div>

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

      {planDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[12px] bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[16px] font-bold text-[#1a1a1a]">Create application plan</h3>
                <p className="mt-1 text-[12px] text-[#888]">
                  New plans are active immediately unless deactivated later.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPlanDialogOpen(false)}
                className="rounded-[6px] border border-[#e0deda] px-2 py-1 text-[12px] text-[#888]"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label htmlFor="plan-name" className={labelClassName}>
                  Name
                </label>
                <input id="plan-name" name="name" required className={inputClassName} />
              </div>
              <div>
                <label htmlFor="plan-description" className={labelClassName}>
                  Description
                </label>
                <textarea
                  id="plan-description"
                  name="description"
                  rows={3}
                  className={inputClassName}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="plan-price" className={labelClassName}>
                    Price (AED)
                  </label>
                  <input
                    id="plan-price"
                    name="price"
                    type="number"
                    min={0}
                    required
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="plan-universities" className={labelClassName}>
                    Universities count
                  </label>
                  <input
                    id="plan-universities"
                    name="universitiesCount"
                    type="number"
                    min={1}
                    required
                    className={inputClassName}
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#4a4a4a]">
                <input type="checkbox" name="isMostPopular" className="h-4 w-4 accent-[#2D6A4F]" />
                Mark as most popular
              </label>
              {planError ? <p className="text-[13px] text-red-600">{planError}</p> : null}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPlanDialogOpen(false)}
                  className="rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={planSaving}
                  className="rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
                >
                  {planSaving ? "Creating…" : "Create plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

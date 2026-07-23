"use client";

import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import type { AdminAdvisorDetailPayload } from "../_lib/fetch-admin-advisor-detail";
import type { AdminAdvisorApplicationsPanelProps } from "../_lib/fetch-advisor-applications-page";
import type { AdminAdvisorSessionsPanelProps } from "../_lib/fetch-advisor-sessions-page";
import type { AdminAdvisorPayoutsTabProps } from "./admin-advisor-payouts-tab";
import { AdminAdvisorActions } from "./admin-advisor-actions";
import { AdminAdvisorApplicationsTab } from "./admin-advisor-applications-tab";
import { AdminAdvisorPayoutsTab } from "./admin-advisor-payouts-tab";
import { AdminAdvisorSessionsTab } from "./admin-advisor-sessions-tab";

type TabId = "overview" | "sessions" | "applications" | "payouts";

const TAB_DEFS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "sessions", label: "Sessions" },
  { id: "applications", label: "Applications" },
  { id: "payouts", label: "Payouts" },
];

export type AdminAdvisorViewClientProps = {
  advisor: AdminAdvisorDetailPayload["advisor"];
  sessionsPanel: AdminAdvisorSessionsPanelProps;
  applicationsPanel: AdminAdvisorApplicationsPanelProps;
  payoutsPanel: AdminAdvisorPayoutsTabProps;
  initialTab?: TabId;
};

function initials(first: string, last: string): string {
  const a = first.trim()[0];
  const b = last.trim()[0];
  const pair = `${a ?? ""}${b ?? ""}`.toUpperCase();
  if (pair) return pair.slice(0, 2);
  if (a) return a.toUpperCase();
  return "?";
}

function SnapItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
        {label}
      </div>
      <div className="mt-1 text-[13px] font-medium text-[var(--text)]">{value}</div>
    </div>
  );
}

export function AdminAdvisorViewClient({
  advisor,
  sessionsPanel,
  applicationsPanel,
  payoutsPanel,
  initialTab = "overview",
}: AdminAdvisorViewClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>(initialTab);

  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString());
    const currentTab = next.get("tab");

    if (tab === "overview") {
      if (!currentTab) return;
      next.delete("tab");
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
      return;
    }

    if (currentTab === tab) return;
    next.set("tab", tab);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [tab, pathname, router, searchParams]);

  const ini = useMemo(
    () => initials(advisor.firstName, advisor.lastName),
    [advisor.firstName, advisor.lastName],
  );

  const fullName = [advisor.firstName, advisor.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const sidebarRows = [
    { lab: "Title", val: advisor.title ?? "—" },
    { lab: "Languages", val: advisor.languages ?? "—" },
    {
      lab: "Experience",
      val: advisor.experienceYears != null ? `${advisor.experienceYears} yrs` : "—",
    },
    { lab: "Nationality", val: advisor.nationalityName },
    { lab: "Specializations", val: advisor.specializationsLabel },
    { lab: "Tags", val: advisor.tagsLabel },
    { lab: "Payout %", val: `${advisor.payoutPercentage}%` },
    { lab: "Status", val: advisor.isActive ? "Active" : "Inactive" },
    {
      lab: "Application receiving",
      val: advisor.receivesApplicationSupport ? "Yes" : "No",
    },
    {
      lab: "Post-admission receiving",
      val: advisor.receivesPostAdmissionSupport ? "Yes" : "No",
    },
    {
      lab: "Free-funnel app support receiving",
      val: advisor.receivesFreeFunnelApplicationSupport ? "Yes" : "No",
    },
    { lab: "Calendly", val: advisor.calendlyConnectedLabel },
    { lab: "Joined", val: advisor.joinedLabel },
    { lab: "Last logged in", val: advisor.lastLoggedInLabel },
    { lab: "Last session", val: advisor.lastSessionLabel },
  ];

  let tabBody: ReactNode;
  if (tab === "overview") {
    tabBody = (
      <SchoolStudentPanel head="Profile" sub="Advisor profile details">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SnapItem label="First name" value={advisor.firstName || "—"} />
          <SnapItem label="Last name" value={advisor.lastName || "—"} />
          <SnapItem label="Email" value={advisor.email || "—"} />
          <SnapItem label="Phone" value={advisor.phone ?? "—"} />
          <SnapItem label="Title" value={advisor.title ?? "—"} />
          <SnapItem label="Languages" value={advisor.languages ?? "—"} />
          <SnapItem
            label="Experience"
            value={
              advisor.experienceYears != null ? String(advisor.experienceYears) : "—"
            }
          />
          <SnapItem label="Nationality" value={advisor.nationalityName} />
          <SnapItem label="Specializations" value={advisor.specializationsLabel} />
          <SnapItem label="Tags" value={advisor.tagsLabel} />
          <SnapItem label="Payout percentage" value={`${advisor.payoutPercentage}%`} />
          <SnapItem label="Calendly" value={advisor.calendlyConnectedLabel} />
        </div>
      </SchoolStudentPanel>
    );
  } else if (tab === "sessions") {
    tabBody = <AdminAdvisorSessionsTab {...sessionsPanel} />;
  } else if (tab === "applications") {
    tabBody = <AdminAdvisorApplicationsTab {...applicationsPanel} />;
  } else {
    tabBody = <AdminAdvisorPayoutsTab {...payoutsPanel} />;
  }

  return (
    <div className="w-full">
      <Link
        href="/admin/users/advisors"
        className="sd-back mb-3.5 inline-flex cursor-pointer items-center gap-1.5 py-1.5 text-[12.5px] font-medium text-[var(--text-mid)] hover:text-[var(--green)] [&_svg]:h-[13px] [&_svg]:w-[13px]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to all advisors
      </Link>

      <div className="sd-grid grid grid-cols-1 items-start gap-5 xl:grid-cols-[280px_1fr] xl:gap-5">
        <aside className="sd-side flex flex-col gap-3.5 rounded-[14px] border border-[var(--border-light)] bg-white p-[22px] xl:sticky xl:top-[80px]">
          <div className="sd-side-top flex flex-col items-center gap-2.5 border-b border-[var(--border-light)] pb-[18px] text-center">
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] font-[family-name:var(--font-dm-serif)] text-2xl font-bold text-[var(--green-dark)]">
              {ini}
            </div>
            <div className="font-[family-name:var(--font-dm-serif)] text-xl leading-snug text-[var(--text)]">
              {fullName || "Advisor"}
            </div>
            <div className="break-all text-xs text-[var(--text-light)]">
              {advisor.email || "—"}
            </div>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                advisor.isActive
                  ? "bg-[rgba(82,183,135,.13)] text-[#1B4332]"
                  : "bg-[rgba(231,76,60,.12)] text-[#8c2d22]"
              }`}
            >
              {advisor.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          {sidebarRows.map((r) => (
            <div key={r.lab} className="flex justify-between gap-2 py-1 text-[12.5px]">
              <span className="shrink-0 text-[var(--text-light)]">{r.lab}</span>
              <span className="max-w-[60%] text-right font-medium text-[var(--text)]">
                {r.val}
              </span>
            </div>
          ))}

          <div className="mt-2 flex flex-col gap-1.5">
            {advisor.email ? (
              <a
                href={`mailto:${advisor.email}`}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-2.5 py-1 text-[11.5px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Email advisor
              </a>
            ) : null}
            <AdminAdvisorActions
              advisorId={advisor.id}
              advisorName={fullName || advisor.email || "Advisor"}
              advisorEmail={advisor.email}
              loginCredentialsSent={advisor.loginCredentialsSent}
              isActive={advisor.isActive}
              editDefaults={{
                firstName: advisor.firstName,
                lastName: advisor.lastName,
                email: advisor.email,
                phone: advisor.phone ?? "",
                title: advisor.title ?? "",
                languages: advisor.languages ?? "",
                experienceYears:
                  advisor.experienceYears != null ? String(advisor.experienceYears) : "",
                nationalityCountryCode: advisor.nationalityCountryCode,
                specializationCountryCodes: advisor.specializationCountryCodes,
                description: advisor.description ?? "",
                bestFor: advisor.bestFor ?? "",
                sessionFor: advisor.sessionFor ?? "",
                sessionCoverage: advisor.sessionCoverage,
                about: advisor.about ?? "",
                questions: advisor.questions,
                tags: advisor.tags,
                avatarUrl: advisor.avatarUrl,
                isActive: advisor.isActive,
                payoutPercentage: String(advisor.payoutPercentage),
                receivesApplicationSupport: advisor.receivesApplicationSupport,
                receivesPostAdmissionSupport: advisor.receivesPostAdmissionSupport,
                receivesFreeFunnelApplicationSupport:
                  advisor.receivesFreeFunnelApplicationSupport,
              }}
            />
          </div>
        </aside>

        <div className="sd-main flex flex-col gap-[18px]">
          <div className="sd-tabs flex gap-0.5 overflow-x-auto rounded-[10px] border border-[var(--border-light)] bg-white p-1">
            {TAB_DEFS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 cursor-pointer rounded-[8px] px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${
                    active
                      ? "bg-[var(--green)] text-white"
                      : "text-[var(--text-mid)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          {tabBody}
        </div>
      </div>
    </div>
  );
}

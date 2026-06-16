"use client";

import type { AdvisorStudentDetailPayload } from "@/app/(protected)/advisor/students/[studentId]/_lib/fetch-advisor-student-detail";
import {
  adminApplicationStatusPillClass,
} from "@/app/(protected)/admin/applications/_lib/application-status-labels";
import {
  ADVISOR_STUDENT_STATUS_LABEL,
  advisorStudentStatusPillClass,
} from "@/lib/advisor-student-derivations";
import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import { format } from "date-fns";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type AdvisorStudentViewClientProps = AdvisorStudentDetailPayload & {
  initialTab: "overview" | "applications";
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "d MMM yyyy");
  } catch {
    return "—";
  }
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
        {label}
      </div>
      <div className="mt-1 text-[13px] text-[var(--text)]">{value}</div>
    </div>
  );
}

export function AdvisorStudentViewClient({
  initialTab,
  ...payload
}: AdvisorStudentViewClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"overview" | "applications">(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const switchTab = useCallback(
    (next: "overview" | "applications") => {
      setTab(next);
      const nextParams = new URLSearchParams(searchParams.toString());
      if (next === "overview") {
        nextParams.delete("tab");
      } else {
        nextParams.set("tab", next);
      }
      const q = nextParams.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const {
    studentName,
    studentInitials,
    studentEmail,
    studentPhone,
    grade,
    nationalityLabel,
    managementStatus,
    stage,
    school,
    overview,
    platformEngagement,
    applications,
  } = payload;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-[14px] border border-[var(--border-light)] bg-white">
        <div className="border-b border-[var(--border-light)] px-5 py-5">
          <div className="flex flex-wrap items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] text-lg font-bold text-[var(--green-dark)]">
              {studentInitials}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--text)]">
                {studentName}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[12.5px] text-[var(--text-mid)]">
                {school ? <span>{school.name}</span> : null}
                <span>{nationalityLabel}</span>
                {grade ? <span>Grade {grade}</span> : null}
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${advisorStudentStatusPillClass(managementStatus)}`}
                >
                  {ADVISOR_STUDENT_STATUS_LABEL[managementStatus]}
                </span>
                <span className="text-[var(--text-light)]">Stage: {stage}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1 border-t border-[var(--border-light)] pt-4">
            <button
              type="button"
              onClick={() => switchTab("overview")}
              className={
                tab === "overview"
                  ? "-mb-px border-b-2 border-[var(--green)] px-3 py-2 text-[13px] font-semibold text-[var(--green-dark)]"
                  : "px-3 py-2 text-[13px] font-medium text-[var(--text-mid)] hover:text-[var(--text)]"
              }
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => switchTab("applications")}
              className={
                tab === "applications"
                  ? "-mb-px border-b-2 border-[var(--green)] px-3 py-2 text-[13px] font-semibold text-[var(--green-dark)]"
                  : "px-3 py-2 text-[13px] font-medium text-[var(--text-mid)] hover:text-[var(--text)]"
              }
            >
              Applications
              <span className="ml-1.5 text-[11px] font-normal text-[var(--text-hint)]">
                ({applications.length})
              </span>
            </button>
          </div>
        </div>

        {tab === "overview" ? (
          <div className="space-y-4 p-5">
            <SchoolStudentPanel
              head="Platform engagement"
              sub="Read-only summary of student activity on Univeera"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-[10px] border border-[var(--border-light)] bg-[#faf9f4] px-3.5 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                    Features explored
                  </div>
                  <div className="mt-1 text-[18px] font-semibold text-[var(--text)]">
                    {platformEngagement.percent}%
                  </div>
                  <div className="text-[11px] text-[var(--text-hint)]">
                    {platformEngagement.completedFeatures} of{" "}
                    {platformEngagement.totalFeatures}
                  </div>
                </div>
                <div className="rounded-[10px] border border-[var(--border-light)] bg-[#faf9f4] px-3.5 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                    Saved universities
                  </div>
                  <div className="mt-1 text-[18px] font-semibold text-[var(--text)]">
                    {platformEngagement.shortlistCount}
                  </div>
                </div>
                <div className="rounded-[10px] border border-[var(--border-light)] bg-[#faf9f4] px-3.5 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                    Total logins
                  </div>
                  <div className="mt-1 text-[18px] font-semibold text-[var(--text)]">
                    {platformEngagement.totalLogins ?? "—"}
                  </div>
                </div>
              </div>
            </SchoolStudentPanel>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SchoolStudentPanel head="Student information" sub="">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InfoItem label="Full name" value={studentName} />
                  <InfoItem label="Email" value={studentEmail} />
                  <InfoItem label="Phone" value={studentPhone ?? "—"} />
                  <InfoItem label="Nationality" value={nationalityLabel} />
                  <InfoItem label="Grade" value={grade ?? "—"} />
                  <InfoItem label="Curriculum" value={overview.curriculum ?? "—"} />
                  <InfoItem
                    label="Predicted grades"
                    value={overview.predictedGrades ?? "—"}
                  />
                  <InfoItem
                    label="English test"
                    value={overview.englishTest ?? "—"}
                  />
                  <InfoItem label="SAT / ACT" value={overview.satAct ?? "—"} />
                  <InfoItem label="GPA" value={overview.gpa ?? "—"} />
                </div>
              </SchoolStudentPanel>

              <SchoolStudentPanel head="School" sub="">
                {school ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InfoItem label="School name" value={school.name} />
                    <InfoItem label="City" value={school.city ?? "—"} />
                    <InfoItem label="Country" value={school.countryLabel} />
                    <InfoItem
                      label="Contact email"
                      value={school.contactEmail ?? "—"}
                    />
                  </div>
                ) : (
                  <p className="text-[13px] text-[var(--text-light)]">
                    No school linked.
                  </p>
                )}
              </SchoolStudentPanel>
            </div>

            <SchoolStudentPanel head="Goals & preferences" sub="">
              <div className="grid grid-cols-1 gap-4">
                <InfoItem
                  label="Intended majors"
                  value={overview.interestedPrograms}
                />
                <InfoItem
                  label="Preferred destinations"
                  value={overview.preferredDestinations}
                />
                <InfoItem
                  label="Target intake"
                  value={overview.targetIntake ?? "—"}
                />
                <InfoItem
                  label="Budget range"
                  value={overview.budgetRange ?? "—"}
                />
                <InfoItem
                  label="Intended fields (application)"
                  value={overview.intendedFields ?? "—"}
                />
                <InfoItem
                  label="Preferred countries (application)"
                  value={overview.preferredUniOrCountries ?? "—"}
                />
                <InfoItem
                  label="Extracurricular activities"
                  value={overview.extracurricularActivities ?? "—"}
                />
                <InfoItem
                  label="Additional notes"
                  value={overview.additionalNotes ?? "—"}
                />
              </div>
            </SchoolStudentPanel>
          </div>
        ) : (
          <div className="overflow-x-auto p-5 pt-0">
            <table className="w-full min-w-[760px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  <th className="px-4 py-3">Application</th>
                  <th className="px-4 py-3">Package</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assigned</th>
                </tr>
              </thead>
              <tbody>
                {applications.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-[var(--text-light)]"
                    >
                      No applications assigned to you for this student.
                    </td>
                  </tr>
                ) : (
                  applications.map((app) => (
                    <tr
                      key={app.id}
                      className="border-t border-[var(--border-light)]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/advisor/applications/${app.id}`}
                          className="font-medium text-[var(--green-dark)] hover:underline"
                        >
                          #{app.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[var(--text)]">
                        {app.packageLabel}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-mid)]">
                        {app.progressPercent}%
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${adminApplicationStatusPillClass(app.status)}`}
                        >
                          {app.statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-light)]">
                        {formatWhen(app.assignedAt ?? app.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

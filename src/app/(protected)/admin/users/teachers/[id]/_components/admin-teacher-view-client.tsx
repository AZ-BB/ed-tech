"use client";

import { SchoolStudentActivityLogsTab } from "@/app/(protected)/school/students/[id]/_components/school-student-activity-logs-tab";
import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import type { StudentActivityLogsPanelProps } from "@/lib/student-activity-logs";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import type { AdminTeacherDetailPayload } from "../_lib/fetch-admin-teacher-detail";
import { AdminTeacherActions } from "./admin-teacher-actions";

type TabId = "overview" | "activity_logs";

const TAB_DEFS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "activity_logs", label: "Activity logs" },
];

export type AdminTeacherViewClientProps = {
  teacher: AdminTeacherDetailPayload["teacher"];
  activityLogsPanel: StudentActivityLogsPanelProps;
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

function genderToTitleValue(gender: "male" | "female" | null): string {
  if (gender === "female") return "Ms";
  return "Mr";
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

export function AdminTeacherViewClient({
  teacher,
  activityLogsPanel,
  initialTab = "overview",
}: AdminTeacherViewClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>(initialTab);

  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString());
    const currentTab = next.get("tab");

    if (tab === "activity_logs") {
      if (currentTab === "activity_logs") return;
      next.set("tab", "activity_logs");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      return;
    }

    if (currentTab === "activity_logs") {
      next.delete("tab");
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    }
  }, [tab, pathname, router, searchParams]);

  const ini = useMemo(
    () => initials(teacher.firstName, teacher.lastName),
    [teacher.firstName, teacher.lastName],
  );

  const fullName = [teacher.firstName, teacher.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const sidebarRows = [
    { lab: "Title", val: teacher.titleLabel },
    { lab: "School", val: teacher.schoolName },
    { lab: "Phone", val: teacher.phone ?? "—" },
    { lab: "Status", val: teacher.isActive ? "Active" : "Inactive" },
    { lab: "Joined", val: teacher.joinedLabel },
    { lab: "Last active", val: teacher.lastActiveLabel },
  ];

  let tabBody: ReactNode;
  if (tab === "overview") {
    tabBody = (
      <SchoolStudentPanel head="Profile" sub="Teacher account details">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SnapItem label="First name" value={teacher.firstName || "—"} />
          <SnapItem label="Last name" value={teacher.lastName || "—"} />
          <SnapItem label="Email" value={teacher.email || "—"} />
          <SnapItem label="Title" value={teacher.titleLabel} />
          <SnapItem label="Phone" value={teacher.phone ?? "—"} />
          <SnapItem label="School" value={teacher.schoolName} />
        </div>
      </SchoolStudentPanel>
    );
  } else {
    tabBody = (
      <SchoolStudentActivityLogsTab
        {...activityLogsPanel}
        head="Activity logs"
        sub="Platform events and actions recorded for this teacher"
      />
    );
  }

  return (
    <div className="w-full">
      <Link
        href="/admin/users/teachers"
        className="sd-back mb-3.5 inline-flex cursor-pointer items-center gap-1.5 py-1.5 text-[12.5px] font-medium text-[var(--text-mid)] hover:text-[var(--green)] [&_svg]:h-[13px] [&_svg]:w-[13px]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to all teachers
      </Link>

      <div className="sd-grid grid grid-cols-1 items-start gap-5 xl:grid-cols-[280px_1fr] xl:gap-5">
        <aside className="sd-side flex flex-col gap-3.5 rounded-[14px] border border-[var(--border-light)] bg-white p-[22px] xl:sticky xl:top-[80px]">
          <div className="sd-side-top flex flex-col items-center gap-2.5 border-b border-[var(--border-light)] pb-[18px] text-center">
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] font-[family-name:var(--font-dm-serif)] text-2xl font-bold text-[var(--green-dark)]">
              {ini}
            </div>
            <div className="font-[family-name:var(--font-dm-serif)] text-xl leading-snug text-[var(--text)]">
              {fullName || "Teacher"}
            </div>
            <div className="break-all text-xs text-[var(--text-light)]">
              {teacher.email || "—"}
            </div>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                teacher.isActive
                  ? "bg-[rgba(82,183,135,.13)] text-[#1B4332]"
                  : "bg-[rgba(231,76,60,.12)] text-[#8c2d22]"
              }`}
            >
              {teacher.isActive ? "Active" : "Inactive"}
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
            {teacher.email ? (
              <a
                href={`mailto:${teacher.email}`}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-2.5 py-1 text-[11.5px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Email teacher
              </a>
            ) : null}
            <AdminTeacherActions
              teacherId={teacher.id}
              teacherName={fullName || teacher.email || "Teacher"}
              isActive={teacher.isActive}
              editDefaults={{
                firstName: teacher.firstName,
                lastName: teacher.lastName,
                phone: teacher.phone ?? "",
                title: genderToTitleValue(teacher.gender),
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

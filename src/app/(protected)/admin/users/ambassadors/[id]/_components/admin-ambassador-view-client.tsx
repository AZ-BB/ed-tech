"use client";

import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import type { AdminAmbassadorDetailPayload } from "../_lib/fetch-admin-ambassador-detail";
import type { AdminAmbassadorSessionsPanelProps } from "../_lib/fetch-ambassador-sessions-page";
import { AdminAmbassadorActions } from "./admin-ambassador-actions";
import { AdminAmbassadorSessionsTab } from "./admin-ambassador-sessions-tab";

type TabId = "overview" | "sessions";

const TAB_DEFS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "sessions", label: "Sessions" },
];

export type AdminAmbassadorViewClientProps = {
  ambassador: AdminAmbassadorDetailPayload["ambassador"];
  sessionsPanel: AdminAmbassadorSessionsPanelProps;
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

export function AdminAmbassadorViewClient({
  ambassador,
  sessionsPanel,
  initialTab = "overview",
}: AdminAmbassadorViewClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>(initialTab);

  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString());
    const currentTab = next.get("tab");

    if (tab === "sessions") {
      if (currentTab === "sessions") return;
      next.set("tab", "sessions");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      return;
    }

    if (currentTab === "sessions") {
      next.delete("tab");
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    }
  }, [tab, pathname, router, searchParams]);

  const ini = useMemo(
    () => initials(ambassador.firstName, ambassador.lastName),
    [ambassador.firstName, ambassador.lastName],
  );

  const fullName = [ambassador.firstName, ambassador.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const studentStatus = ambassador.isCurrentStudent ? "Current student" : "Alumni";
  const degrees = [
    ambassador.hasMsc ? "MSc" : null,
    ambassador.hasPhd ? "PhD" : null,
  ]
    .filter(Boolean)
    .join(", ");

  const sidebarRows = [
    { lab: "University", val: ambassador.universityName },
    { lab: "Major", val: ambassador.major ?? "—" },
    { lab: "Destination", val: ambassador.destinationName },
    { lab: "Nationality", val: ambassador.nationalityName },
    { lab: "Student status", val: studentStatus },
    { lab: "Degrees", val: degrees || "—" },
    { lab: "Tags", val: ambassador.tagsLabel },
    { lab: "Status", val: ambassador.isActive ? "Active" : "Inactive" },
    { lab: "Joined", val: ambassador.joinedLabel },
    { lab: "Last session", val: ambassador.lastSessionLabel },
  ];

  let tabBody: ReactNode;
  if (tab === "overview") {
    tabBody = (
      <SchoolStudentPanel head="Profile" sub="Ambassador profile details">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SnapItem label="First name" value={ambassador.firstName || "—"} />
          <SnapItem label="Last name" value={ambassador.lastName || "—"} />
          <SnapItem label="Email" value={ambassador.email || "—"} />
          <SnapItem label="University" value={ambassador.universityName} />
          <SnapItem label="Major" value={ambassador.major ?? "—"} />
          <SnapItem label="Destination" value={ambassador.destinationName} />
          <SnapItem label="Nationality" value={ambassador.nationalityName} />
          <SnapItem label="Student status" value={studentStatus} />
          <SnapItem
            label="Start year"
            value={ambassador.startYear != null ? String(ambassador.startYear) : "—"}
          />
          <SnapItem
            label="Graduation year"
            value={
              ambassador.graduationYear != null ? String(ambassador.graduationYear) : "—"
            }
          />
          <SnapItem label="Has MSc" value={ambassador.hasMsc ? "Yes" : "No"} />
          <SnapItem label="Has PhD" value={ambassador.hasPhd ? "Yes" : "No"} />
          <SnapItem label="Help in" value={ambassador.helpInLabel} />
          <SnapItem label="Tags" value={ambassador.tagsLabel} />
        </div>
        {ambassador.about ? (
          <div className="mt-4 rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
              About
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--text)]">
              {ambassador.about}
            </p>
          </div>
        ) : null}
      </SchoolStudentPanel>
    );
  } else {
    tabBody = <AdminAmbassadorSessionsTab {...sessionsPanel} />;
  }

  return (
    <div className="w-full">
      <Link
        href="/admin/users/ambassadors"
        className="sd-back mb-3.5 inline-flex cursor-pointer items-center gap-1.5 py-1.5 text-[12.5px] font-medium text-[var(--text-mid)] hover:text-[var(--green)] [&_svg]:h-[13px] [&_svg]:w-[13px]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to all ambassadors
      </Link>

      <div className="sd-grid grid grid-cols-1 items-start gap-5 xl:grid-cols-[280px_1fr] xl:gap-5">
        <aside className="sd-side flex flex-col gap-3.5 rounded-[14px] border border-[var(--border-light)] bg-white p-[22px] xl:sticky xl:top-[80px]">
          <div className="sd-side-top flex flex-col items-center gap-2.5 border-b border-[var(--border-light)] pb-[18px] text-center">
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] font-[family-name:var(--font-dm-serif)] text-2xl font-bold text-[var(--green-dark)]">
              {ini}
            </div>
            <div className="font-[family-name:var(--font-dm-serif)] text-xl leading-snug text-[var(--text)]">
              {fullName || "Ambassador"}
            </div>
            <div className="break-all text-xs text-[var(--text-light)]">
              {ambassador.email || "—"}
            </div>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                ambassador.isActive
                  ? "bg-[rgba(82,183,135,.13)] text-[#1B4332]"
                  : "bg-[rgba(231,76,60,.12)] text-[#8c2d22]"
              }`}
            >
              {ambassador.isActive ? "Active" : "Inactive"}
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
            {ambassador.email ? (
              <a
                href={`mailto:${ambassador.email}`}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-2.5 py-1 text-[11.5px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Email ambassador
              </a>
            ) : null}
            <AdminAmbassadorActions
              ambassadorId={ambassador.id}
              ambassadorName={fullName || ambassador.email || "Ambassador"}
              isActive={ambassador.isActive}
              editDefaults={{
                firstName: ambassador.firstName,
                lastName: ambassador.lastName,
                email: ambassador.email,
                destinationCountryCode: ambassador.destinationCountryCode,
                nationalityCountryCode: ambassador.nationalityCountryCode,
                universityId: ambassador.universityId ?? "",
                universityName:
                  ambassador.universityId ? "" : ambassador.universityName !== "—"
                    ? ambassador.universityName
                    : "",
                major: ambassador.major ?? "",
                startYear:
                  ambassador.startYear != null ? String(ambassador.startYear) : "",
                graduationYear:
                  ambassador.graduationYear != null
                    ? String(ambassador.graduationYear)
                    : "",
                isCurrentStudent: ambassador.isCurrentStudent,
                hasMsc: ambassador.hasMsc,
                hasPhd: ambassador.hasPhd,
                about: ambassador.about ?? "",
                helpIn: ambassador.helpIn,
                tags: ambassador.tags,
                avatarUrl: ambassador.avatarUrl,
                isActive: ambassador.isActive,
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

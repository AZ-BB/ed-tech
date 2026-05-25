"use client";

import { renewAdminSchoolSubscription } from "@/actions/admin-schools";
import { SchoolSettingsCreditsPanel } from "@/app/(protected)/school/settings/_components/school-settings-credits-panel";
import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { AdminSchoolDetailPayload } from "../_lib/fetch-admin-school-detail";
import { AdminEditSchoolDialog } from "./admin-edit-school-dialog";

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

export type AdminSchoolOverviewTabProps = {
  payload: AdminSchoolDetailPayload;
};

export function AdminSchoolOverviewTab({ payload }: AdminSchoolOverviewTabProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [renewError, setRenewError] = useState<string | null>(null);
  const [isRenewPending, startRenewTransition] = useTransition();
  const { school, credits, rechargeHistory, studentUsageHistory, studentAllocations, countries } =
    payload;

  const studentsLabel =
    school.studentsLimit != null
      ? `${school.studentCount}/${school.studentsLimit}`
      : String(school.studentCount);

  const subscriptionInactive = school.subscriptionStatus === "INACTIVE";

  function handleRenewSubscription() {
    const confirmMessage = `Renew subscription for ${school.name}? This will reset the credit pool to the yearly plan and set the subscription to active.`;

    if (!window.confirm(confirmMessage)) return;

    setRenewError(null);
    startRenewTransition(async () => {
      const result = await renewAdminSchoolSubscription(school.id);
      if (!result.ok) {
        setRenewError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--text)]">School overview</h2>
          <p className="text-[12px] text-[var(--text-light)]">
            Profile, subscription, and credit configuration
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {subscriptionInactive ? (
            <button
              type="button"
              disabled={isRenewPending}
              onClick={handleRenewSubscription}
              className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-white px-4 py-[7px] text-[12px] font-semibold text-[#2D6A4F] transition-all hover:bg-[#e8f5ee] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isRenewPending ? "Renewing…" : "Renew subscription"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-[7px] text-[12px] font-semibold text-white transition-all hover:bg-[#1B4332]"
          >
            Edit
          </button>
        </div>
      </div>

      {renewError ? (
        <p className="mb-4 text-[13px] text-red-600" role="alert">
          {renewError}
        </p>
      ) : null}

      <SchoolStudentPanel head="Profile" sub="School account details">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SnapItem label="School name" value={school.name} />
          <SnapItem label="Code" value={school.code} />
          <SnapItem label="Location" value={school.locationLabel} />
          <SnapItem label="Contact email" value={school.contactEmail} />
          <SnapItem label="Students" value={studentsLabel} />
          <SnapItem label="Teachers" value={String(school.teacherCount)} />
          <SnapItem label="Owner" value={school.ownerName} />
          <SnapItem label="Status" value={school.isActive ? "Active" : "Inactive"} />
          <SnapItem label="Subscription" value={school.subscriptionStatus} />
          <SnapItem label="Renewal" value={school.renewalLabel} />
        </div>
      </SchoolStudentPanel>

      <div className="mt-5">
        <SchoolSettingsCreditsPanel
          credits={credits}
          rechargeHistory={rechargeHistory}
          studentUsageHistory={studentUsageHistory}
          studentAllocations={studentAllocations}
        />
      </div>

      <AdminEditSchoolDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        school={school}
        credits={credits}
        countries={countries}
      />
    </>
  );
}

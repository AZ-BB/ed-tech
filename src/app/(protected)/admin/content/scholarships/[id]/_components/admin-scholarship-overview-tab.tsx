"use client";

import { useState } from "react";

import type { AdminScholarshipDetailPayload } from "../_lib/fetch-admin-scholarship-detail";
import { AdminEditScholarshipDialog } from "./admin-edit-scholarship-dialog";

function SnapItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
        {label}
      </div>
      <div className="mt-1 break-words text-[13px] font-medium text-[var(--text)]">
        {value}
      </div>
    </div>
  );
}

export type AdminScholarshipOverviewTabProps = {
  payload: AdminScholarshipDetailPayload;
};

export function AdminScholarshipOverviewTab({ payload }: AdminScholarshipOverviewTabProps) {
  const [editOpen, setEditOpen] = useState(false);
  const { scholarship } = payload;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--text)]">Scholarship overview</h2>
          <p className="text-[12px] text-[var(--text-light)]">
            Catalog profile, eligibility, and application details
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-[7px] text-[12px] font-semibold text-white transition-all hover:bg-[#1B4332]"
        >
          Edit scholarship
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SnapItem label="Eligible nationality" value={scholarship.nationalityLabel} />
        <SnapItem label="Destinations" value={scholarship.destinationLabels} />
        <SnapItem label="Type" value={scholarship.typeLabel} />
        <SnapItem label="Level" value={scholarship.level ?? "—"} />
        <SnapItem label="Target students" value={scholarship.targetStudents ?? "—"} />
        <SnapItem label="Fields" value={scholarship.fieldsText || "—"} />
        <SnapItem label="Coverage" value={scholarship.coverage ?? "—"} />
        <SnapItem label="Competition" value={scholarship.competition ?? "—"} />
        <SnapItem label="Renewable" value={scholarship.isRenewable ? "Yes" : "No"} />
        <SnapItem label="IELTS min" value={scholarship.ieltsMinScore?.toString() ?? "—"} />
        <SnapItem label="TOEFL min" value={scholarship.toeflMinScore?.toString() ?? "—"} />
        <SnapItem label="SAT policy" value={scholarship.satPolicy ?? "—"} />
        <SnapItem label="Application method" value={scholarship.method ?? "—"} />
        <SnapItem label="Intakes" value={scholarship.intakes ?? "—"} />
        <SnapItem
          label="Deadline"
          value={
            scholarship.deadline ??
            (scholarship.deadlineDate
              ? new Date(
                  scholarship.deadlineDate +
                    (scholarship.deadlineDate.includes("T") ? "" : "T12:00:00"),
                ).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—")
          }
        />
        <SnapItem
          label="Application fee"
          value={
            scholarship.applicationFee != null
              ? String(scholarship.applicationFee)
              : "—"
          }
        />
        <SnapItem label="City" value={scholarship.city ?? "—"} />
        <SnapItem label="Discovery slug" value={scholarship.discoverySlug ?? "—"} />
      </div>

      {scholarship.description ? (
        <div className="mt-4 rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
            Description
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[13px] text-[var(--text)]">
            {scholarship.description}
          </p>
        </div>
      ) : null}

      <AdminEditScholarshipDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        payload={payload}
      />
    </>
  );
}

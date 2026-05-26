"use client";

import { useState } from "react";

import type { AdminUniversityDetailPayload } from "../_lib/fetch-admin-university-detail";
import { AdminEditUniversityDialog } from "./admin-edit-university-dialog";

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

export type AdminUniversityOverviewTabProps = {
  payload: AdminUniversityDetailPayload;
};

export function AdminUniversityOverviewTab({ payload }: AdminUniversityOverviewTabProps) {
  const [editOpen, setEditOpen] = useState(false);
  const { university, countries } = payload;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--text)]">University overview</h2>
          <p className="text-[12px] text-[var(--text-light)]">
            Catalog profile, admissions, and contact details
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-[7px] text-[12px] font-semibold text-white transition-all hover:bg-[#1B4332]"
        >
          Edit university
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SnapItem label="Country" value={university.countryName} />
        <SnapItem label="Type" value={university.typeLabel} />
        <SnapItem label="Tuition" value={university.tuitionLabel} />
        <SnapItem label="Living cost" value={university.livingCostLabel} />
        <SnapItem
          label="Acceptance rate"
          value={
            university.acceptanceRate != null
              ? `${university.acceptanceRate}%`
              : "—"
          }
        />
        <SnapItem
          label="Intl. students"
          value={
            university.intlStudents != null ? `${university.intlStudents}%` : "—"
          }
        />
        <SnapItem label="IELTS min" value={university.ieltsMinScore?.toString() ?? "—"} />
        <SnapItem label="TOEFL min" value={university.toeflMinScore?.toString() ?? "—"} />
        <SnapItem label="SAT policy" value={university.satPolicy ?? "—"} />
        <SnapItem label="Application method" value={university.method ?? "—"} />
        <SnapItem label="Intakes" value={university.intakes ?? "—"} />
        <SnapItem
          label="Deadline"
          value={
            university.deadlineDate
              ? new Date(
                  university.deadlineDate + (university.deadlineDate.includes("T") ? "" : "T12:00:00"),
                ).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—"
          }
        />
        <SnapItem label="Difficulty" value={university.difficulty ?? "—"} />
        <SnapItem label="Ranking" value={university.ranking?.toString() ?? "—"} />
        <SnapItem label="Website" value={university.websiteUrl ?? "—"} />
        <SnapItem label="Email" value={university.email ?? "—"} />
        <SnapItem label="Phone" value={university.phone ?? "—"} />
      </div>

      {university.description ? (
        <div className="mt-4 rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
            Description
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--text)]">
            {university.description}
          </p>
        </div>
      ) : null}

      <AdminEditUniversityDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        university={university}
        countries={countries}
      />
    </>
  );
}

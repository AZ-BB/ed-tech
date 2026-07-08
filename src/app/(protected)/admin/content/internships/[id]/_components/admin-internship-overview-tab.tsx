"use client";

import { useState } from "react";

import type { AdminInternshipDetailPayload } from "../_lib/fetch-admin-internship-detail";
import { AdminEditInternshipDialog } from "./admin-edit-internship-dialog";

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

function ListBlock({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4 rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
        {label}
      </div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-[var(--text)]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export type AdminInternshipOverviewTabProps = {
  payload: AdminInternshipDetailPayload;
};

export function AdminInternshipOverviewTab({
  payload,
}: AdminInternshipOverviewTabProps) {
  const [editOpen, setEditOpen] = useState(false);
  const { internship } = payload;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--text)]">
            Internship overview
          </h2>
          <p className="text-[12px] text-[var(--text-light)]">
            Catalog profile, eligibility, and application details
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-[7px] text-[12px] font-semibold text-white transition-all hover:bg-[#1B4332]"
        >
          Edit internship
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SnapItem label="Provider" value={internship.provider} />
        <SnapItem label="Section" value={internship.sectionLabel} />
        <SnapItem label="Country" value={internship.countryLabel} />
        <SnapItem label="Location" value={internship.locationLabel} />
        <SnapItem label="Format" value={internship.formatLabel} />
        <SnapItem label="Field" value={internship.field} />
        <SnapItem label="Pay tier" value={internship.payTierLabel} />
        <SnapItem label="Pay label" value={internship.payLabel} />
        <SnapItem label="Duration" value={internship.duration} />
        <SnapItem label="Phone" value={internship.phone ?? "—"} />
        <SnapItem
          label="Nationals only"
          value={internship.nationalsOnly ? "Yes" : "No"}
        />
        <SnapItem label="URL status" value={internship.urlStatusLabel} />
        <SnapItem label="Official URL" value={internship.officialUrl} />
        <SnapItem label="Slug" value={internship.slug} />
        <SnapItem
          label="Needs review"
          value={internship.needsReview ? "Yes" : "No"}
        />
      </div>

      {internship.summary ? (
        <div className="mt-4 rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
            Summary
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[13px] text-[var(--text)]">
            {internship.summary}
          </p>
        </div>
      ) : null}

      <ListBlock label="What you'll do" items={internship.whatYoullDo} />
      <ListBlock label="What you'll gain" items={internship.whatYoullGain} />

      {internship.eligibility ? (
        <div className="mt-4 rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
            Eligibility
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[13px] text-[var(--text)]">
            {internship.eligibility}
          </p>
        </div>
      ) : null}

      {internship.howToApply ? (
        <div className="mt-4 rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
            How to apply
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[13px] text-[var(--text)]">
            {internship.howToApply}
          </p>
        </div>
      ) : null}

      <AdminEditInternshipDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        payload={payload}
      />
    </>
  );
}

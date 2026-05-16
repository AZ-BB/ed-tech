"use client";

import { ModalVeil } from "@/app/(protected)/student/my-applications/_components/modal-veil";

import type { SchoolDashboardShortlistedUniversity } from "../_lib/fetch-school-dashboard";

export function SchoolShortlistedUniversitiesModal({
  universities,
  onClose,
}: {
  universities: SchoolDashboardShortlistedUniversity[];
  onClose: () => void;
}) {
  return (
    <ModalVeil title="Shortlisted universities" onClose={onClose}>
      {universities.length === 0 ? (
        <p className="text-[13px] text-[#6a6a6a]">No universities shortlisted yet.</p>
      ) : (
        <ul className="max-h-[min(60vh,420px)] overflow-y-auto divide-y divide-[#ece9e4]">
          {universities.map((u) => (
            <li
              key={u.id}
              className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span className="text-[13.5px] font-medium tracking-[-0.005em] text-[#1a1a1a]">
                {u.name}
              </span>
              {u.country ? (
                <span className="shrink-0 text-[12px] text-[#6a6a6a]">{u.country}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </ModalVeil>
  );
}

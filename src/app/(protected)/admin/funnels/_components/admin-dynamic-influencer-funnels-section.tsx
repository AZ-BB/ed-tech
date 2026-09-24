"use client";

import { useState } from "react";

import type { AdminFunnelKey } from "@/app/(protected)/admin/funnels/_lib/admin-funnel-keys";
import { dynamicFunnelKey } from "@/app/(protected)/admin/funnels/_lib/admin-funnel-keys";
import type { FunnelStats } from "@/lib/funnel-stats-types";

import {
  AdminInfluencerFunnelFormDialog,
  type InfluencerFunnelFormValues,
} from "./admin-influencer-funnel-form-dialog";

const fontSerif = '"DM Serif Display", Georgia, serif' as const;

export type DynamicInfluencerFunnelAdminRow = {
  id: string;
  displayName: string;
  slug: string;
  calendlySchedulingUrl: string;
  isActive: boolean;
  stats: FunnelStats;
};

type AdminDynamicInfluencerFunnelsSectionProps = {
  funnels: DynamicInfluencerFunnelAdminRow[];
  onViewStudents: (key: AdminFunnelKey, label: string) => void;
};

function copyPublicLink(slug: string) {
  const path = `${window.location.origin}/en/${slug}`;
  void navigator.clipboard.writeText(path);
}

export function AdminDynamicInfluencerFunnelsSection({
  funnels,
  onViewStudents,
}: AdminDynamicInfluencerFunnelsSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editInitial, setEditInitial] = useState<InfluencerFunnelFormValues | null>(null);

  function openCreate() {
    setFormMode("create");
    setEditInitial(null);
    setFormOpen(true);
  }

  function openEdit(row: DynamicInfluencerFunnelAdminRow) {
    setFormMode("edit");
    setEditInitial({
      id: row.id,
      displayName: row.displayName,
      slug: row.slug,
      calendlySchedulingUrl: row.calendlySchedulingUrl,
      isActive: row.isActive,
    });
    setFormOpen(true);
  }

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-[#1a1a1a]">Dynamic influencer funnels</h2>
          <p className="mt-0.5 text-[12px] text-[#6a6a6a]">
            Create public landing pages at /{"{locale}"}/{"{slug}"} with Diana-style signup and Calendly.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-[#2D6A4F] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#245a42]"
        >
          Add funnel
        </button>
      </div>

      {funnels.length === 0 ? (
        <p className="rounded-[12px] border border-dashed border-[#e0deda] bg-[#fafaf8] px-4 py-8 text-center text-[13px] text-[#6a6a6a]">
          No dynamic funnels yet. Add one to get a shareable link and signup flow.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[12px] border border-[#ece9e4] bg-white">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="bg-[#fafaf8]">
                {["Name", "Slug", "Visits", "Signups", "Status", "Actions"].map((heading) => (
                  <th
                    key={heading}
                    className="border-b border-[#ece9e4] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.8px] text-[#a0a0a0]"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {funnels.map((row) => (
                <tr key={row.id} className="border-b border-[#ece9e4] last:border-b-0">
                  <td className="px-4 py-3 text-[13px] font-medium text-[#1a1a1a]">
                    {row.displayName}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#4a4a4a]">/{row.slug}</td>
                  <td
                    className="px-4 py-3 text-[13px] text-[#1a1a1a]"
                    style={{ fontFamily: fontSerif }}
                  >
                    {row.stats.visits.toLocaleString()}
                  </td>
                  <td
                    className="px-4 py-3 text-[13px] text-[#1a1a1a]"
                    style={{ fontFamily: fontSerif }}
                  >
                    {row.stats.signups.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-[12px]">
                    {row.isActive ? (
                      <span className="rounded-full bg-[#e8f5ee] px-2 py-0.5 font-semibold text-[#2D6A4F]">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#f3f2f0] px-2 py-0.5 font-semibold text-[#6a6a6a]">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onViewStudents(dynamicFunnelKey(row.slug), row.displayName)}
                        className="rounded-lg border border-[#e0deda] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#2D6A4F] hover:border-[#2D6A4F] hover:bg-[#f0f7f2]"
                      >
                        View signups
                      </button>
                      <button
                        type="button"
                        onClick={() => copyPublicLink(row.slug)}
                        className="rounded-lg border border-[#e0deda] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#4a4a4a] hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
                      >
                        Copy link
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="rounded-lg border border-[#e0deda] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#4a4a4a] hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminInfluencerFunnelFormDialog
        open={formOpen}
        mode={formMode}
        initial={editInitial}
        onClose={() => setFormOpen(false)}
      />
    </section>
  );
}

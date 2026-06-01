"use client";

import { useState } from "react";

import { AdminAddSchoolDialog } from "../schools/_components/admin-add-school-dialog";

export function AdminDashboardHeaderActions() {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-[10px]">
        <button
          type="button"
          className="flex cursor-pointer items-center gap-[6px] rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-[7px] text-[12px] font-semibold text-white transition-all duration-150 hover:bg-[#1B4332]"
          onClick={() => setAddOpen(true)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add School
        </button>
      </div>

      <AdminAddSchoolDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}

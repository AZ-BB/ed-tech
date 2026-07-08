"use client";

import { Pagination } from "@/components/pagination";
import Link from "next/link";

import type { AdminInternshipStudentRow } from "../_lib/fetch-admin-internship-students-page";

const LIMIT_OPTIONS = [10, 20, 30, 50] as const;

export type AdminInternshipStudentsTabProps = {
  title: string;
  emptyMessage: string;
  rows: AdminInternshipStudentRow[];
  totalRows: number;
  page: number;
  limit: number;
  activityColumnLabel: string;
};

export function AdminInternshipStudentsTab({
  title,
  emptyMessage,
  rows,
  totalRows,
  page,
  limit,
  activityColumnLabel,
}: AdminInternshipStudentsTabProps) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
      <div className="border-b border-[#ece9e4] px-5 py-4">
        <h2 className="text-[14px] font-bold text-[#1a1a1a]">{title}</h2>
        <p className="text-[11px] text-[#a0a0a0]">
          {totalRows.toLocaleString()}{" "}
          {totalRows === 1 ? "student" : "students"}
        </p>
      </div>

      <div className="overflow-x-auto px-5 pb-1 pt-1 [zoom:0.95]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#fafaf8]">
              {["Student", "School", "Email", activityColumnLabel].map(
                (heading) => (
                  <th
                    key={heading}
                    className="border-b border-[#ece9e4] px-4 py-[10px] text-left text-[10px] font-bold uppercase tracking-[0.8px] text-[#a0a0a0]"
                  >
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-[13px] text-[#a0a0a0]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const isLastRow = index === rows.length - 1;
                const cellBorder = isLastRow ? "" : "border-b border-[#ece9e4]";

                return (
                  <tr
                    key={row.studentId}
                    className="transition-colors hover:bg-[#f0f7f2]"
                  >
                    <td className={`${cellBorder} px-4 py-3`}>
                      <Link
                        href={`/admin/users/students/${row.studentId}`}
                        className="font-semibold text-[#1a1a1a] hover:text-[#2D6A4F]"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td
                      className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}
                    >
                      {row.school}
                    </td>
                    <td
                      className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}
                    >
                      {row.email}
                    </td>
                    <td
                      className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}
                    >
                      {row.activityLabel}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[#ece9e4] px-5 py-3">
        <Pagination
          totalRows={totalRows}
          page={page}
          limit={limit}
          limitOptions={LIMIT_OPTIONS}
          pageParam="studentsPage"
          limitParam="studentsLimit"
        />
      </div>
    </div>
  );
}

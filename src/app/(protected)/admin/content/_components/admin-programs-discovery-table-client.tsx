"use client";

import { Pagination } from "@/components/pagination";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { getAdminProgramDiscoveryDetailHref } from "../_lib/admin-program-detail-href";
import type { AdminProgramDiscoveryTableRow } from "../_lib/fetch-admin-programs-discovery-page";
import type { AdminProgramsDiscoveryStatusFilter } from "../_lib/parse-admin-programs-discovery-search-params";

const LIMIT_OPTIONS = [10, 20, 30, 50] as const;

const SELECT_CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237a7a7a' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")";

const filterSelectClass =
  "min-w-[120px] cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat py-[7px] pl-[10px] pr-9 text-[12px] text-[#4a4a4a] outline-none transition-colors focus:border-[#40916C]";

function StatusBadge({ active }: { active: boolean }) {
  if (!active) {
    return (
      <span className="inline-flex rounded-full bg-[#f3f2f0] px-2.5 py-0.5 text-[10px] font-semibold text-[#8a8a8a]">
        Inactive
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-[#e8f5ee] px-2.5 py-0.5 text-[10px] font-semibold text-[#2D6A4F]">
      Active
    </span>
  );
}

export type AdminProgramsDiscoveryTableClientProps = {
  rows: AdminProgramDiscoveryTableRow[];
  totalRows: number;
  page: number;
  limit: number;
  q: string;
  category: string;
  status: AdminProgramsDiscoveryStatusFilter;
  categoryOptions: string[];
};

export function AdminProgramsDiscoveryTableClient({
  rows,
  totalRows,
  page,
  limit,
  q,
  category,
  status,
  categoryOptions,
}: AdminProgramsDiscoveryTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  function updateParams(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = {
      q,
      category,
      status,
      page: String(page),
      limit: String(limit),
      ...patch,
    };

    for (const [key, value] of Object.entries(merged)) {
      if (!value || (key === "status" && value === "all")) continue;
      params.set(key, value);
    }

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-4">
        <div>
          <h2 className="text-[14px] font-bold text-[#1a1a1a]">Program Discovery</h2>
          <p className="text-[11px] text-[#a0a0a0]">
            {totalRows.toLocaleString()} {totalRows === 1 ? "program" : "programs"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            defaultValue={q}
            placeholder="Search title, slug, category…"
            className="min-w-[220px] rounded-[8px] border border-[#e0deda] px-3 py-[7px] text-[12px] outline-none focus:border-[#40916C]"
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              updateParams({
                q: event.currentTarget.value.trim() || undefined,
                page: "1",
              });
            }}
          />
          <select
            value={category}
            className={filterSelectClass}
            style={{ backgroundImage: SELECT_CHEVRON }}
            onChange={(event) =>
              updateParams({
                category: event.target.value || undefined,
                page: "1",
              })
            }
          >
            <option value="">All categories</option>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            value={status}
            className={filterSelectClass}
            style={{ backgroundImage: SELECT_CHEVRON }}
            onChange={(event) =>
              updateParams({
                status: event.target.value,
                page: "1",
              })
            }
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#ece9e4] bg-[#faf9f7] text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
              <th className="px-5 py-3">Program</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Slug</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-[13px] text-[#a0a0a0]">
                  No programs yet. Add one or import from Excel.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[#ece9e4] text-[13px] text-[#4a4a4a] last:border-b-0"
                >
                  <td className="px-5 py-3">
                    <div className="font-medium text-[#1a1a1a]">{row.title}</div>
                    {row.featured ? (
                      <span className="mt-1 inline-flex rounded-full bg-[#FAEEDA] px-2 py-0.5 text-[10px] font-semibold text-[#854F0B]">
                        Featured
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3">{row.category}</td>
                  <td className="px-5 py-3 font-mono text-[12px]">{row.slug}</td>
                  <td className="px-5 py-3">
                    <StatusBadge active={row.active} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={getAdminProgramDiscoveryDetailHref(row.id)}
                      className="inline-flex rounded-[6px] border border-[#e0deda] px-3 py-1.5 text-[12px] font-semibold text-[#4a4a4a] hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
                    >
                      View & edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[#ece9e4] px-5 py-4">
        <Pagination
          totalRows={totalRows}
          page={page}
          limit={limit}
          limitOptions={LIMIT_OPTIONS}
        />
      </div>
    </div>
  );
}

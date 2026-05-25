"use client";

import { Pagination } from "@/components/pagination";
import { usePathname, useRouter } from "next/navigation";

import type { UsersTabId } from "../_data/users-tabs-data";
import { getAdminUserDetailHref } from "../_lib/admin-user-detail-href";
import {
  ADMIN_USERS_ROLE_FILTER_OPTIONS,
  ADMIN_USERS_STATUS_FILTER_OPTIONS,
  type AdminUsersRoleFilter,
  type AdminUsersStatusFilter,
} from "../_lib/parse-admin-users-search-params";
import type { AdminSchoolOption } from "../_lib/fetch-admin-school-options";
import type { AdminUserTableRow } from "../_lib/fetch-admin-users-page";
import { getAdminUsersTableColumns } from "./admin-users-table-columns";
import { RowActionsMenu } from "./row-actions-menu";

const LIMIT_OPTIONS = [10, 20, 30, 50] as const;

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

const filterSelectClass =
  "min-w-[140px] cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat py-[7px] pl-[10px] pr-9 text-[12px] text-[#4a4a4a] outline-none transition-colors focus:border-[#40916C]";

function displayName(row: AdminUserTableRow): string {
  const full = [row.firstName, row.lastName].filter(Boolean).join(" ").trim();
  return full || row.email || "User";
}

function showRoleFilter(tabId: UsersTabId): boolean {
  return tabId === "all";
}

function showSchoolFilter(tabId: UsersTabId): boolean {
  return tabId === "all" || tabId === "students" || tabId === "teachers";
}

export type AdminUsersTableClientProps = {
  tabId: UsersTabId;
  tabLabel: string;
  rows: AdminUserTableRow[];
  totalRows: number;
  page: number;
  limit: number;
  q: string;
  role: AdminUsersRoleFilter;
  schoolId: string;
  status: AdminUsersStatusFilter;
  schoolOptions: AdminSchoolOption[];
  embedMode?: boolean;
  embedTabParam?: string;
};

export function AdminUsersTableClient({
  tabId,
  tabLabel,
  rows,
  totalRows,
  page,
  limit,
  q,
  role,
  schoolId,
  status,
  schoolOptions,
  embedMode = false,
  embedTabParam,
}: AdminUsersTableClientProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const filtersActive =
    q.trim().length > 0 ||
    role !== "" ||
    (!embedMode && schoolId.trim().length > 0) ||
    status !== "";
  const columns = getAdminUsersTableColumns(
    tabId,
    (row) => (
      <RowActionsMenu
        tabId={tabId}
        userId={row.id}
        userName={displayName(row)}
        isActive={row.isActive}
      />
    ),
    embedMode
      ? { hideSchoolColumn: true, hideRoleColumn: true }
      : undefined,
  );

  return (
    <div className="overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-4">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-[14px] font-bold text-[#1a1a1a]">{tabLabel}</h2>
          <span className="text-[11px] text-[#a0a0a0]">
            {totalRows.toLocaleString()} total
          </span>
        </div>

        <form
          className="flex min-w-[220px] flex-1 flex-wrap items-center justify-end gap-2"
          action={pathname}
          method="get"
        >
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="limit" value={String(limit)} />
          {embedMode && embedTabParam ? (
            <input type="hidden" name="tab" value={embedTabParam} />
          ) : null}
          {embedMode && schoolId ? (
            <input type="hidden" name="school" value={schoolId} />
          ) : null}

          <div className="relative w-full max-w-[220px]">
            <svg
              className="pointer-events-none absolute left-[10px] top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[#a0a0a0]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <label htmlFor="admin-users-search" className="sr-only">
              Search name or email
            </label>
            <input
              id="admin-users-search"
              key={`${q}-${role}-${schoolId}-${status}`}
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search name or email..."
              className="w-full rounded-[8px] border border-[#e0deda] bg-white py-[7px] pl-8 pr-3 text-[12px] text-[#1a1a1a] outline-none transition-colors placeholder:text-[#a0a0a0] focus:border-[#40916C]"
            />
          </div>

          {showRoleFilter(tabId) ? (
            <select
              name="role"
              aria-label="Filter by role"
              className={filterSelectClass}
              style={{ backgroundImage: SELECT_CHEVRON }}
              defaultValue={role}
            >
              {ADMIN_USERS_ROLE_FILTER_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : null}

          {showSchoolFilter(tabId) && !embedMode ? (
            <select
              name="school"
              aria-label="Filter by school"
              className={`${filterSelectClass} max-w-[220px]`}
              style={{ backgroundImage: SELECT_CHEVRON }}
              defaultValue={schoolId}
            >
              <option value="">All Schools</option>
              {schoolOptions.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          ) : null}

          <select
            name="status"
            aria-label="Filter by status"
            className={filterSelectClass}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={status}
          >
            {ADMIN_USERS_STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value || "all-statuses"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-[7px] text-[12px] font-semibold text-[#4a4a4a] transition-all duration-150 hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
          >
            Apply
          </button>
        </form>
      </div>

      <div className="overflow-x-auto px-5 pb-1 pt-1 [zoom:0.95]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#fafaf8]">
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={`border-b border-[#ece9e4] px-4 py-[10px] text-[10px] font-bold uppercase tracking-[0.8px] text-[#a0a0a0] ${
                    column.align === "center" ? "text-center" : "text-left"
                  }`}
                >
                  {column.heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-[13px] text-[#a0a0a0]"
                >
                  {filtersActive
                    ? "No users match your filters."
                    : "No users found."}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const isLastRow = index === rows.length - 1;
                const cellBorder = isLastRow ? "" : "border-b border-[#ece9e4]";
                const detailHref = getAdminUserDetailHref(row, tabId);
                const isRowClickable = Boolean(detailHref);

                function openDetail() {
                  if (detailHref) router.push(detailHref);
                }

                return (
                  <tr
                    key={`${row.role}-${row.id}`}
                    className={`transition-colors hover:bg-[#f0f7f2] ${
                      isRowClickable ? "cursor-pointer" : ""
                    }`}
                    onClick={isRowClickable ? openDetail : undefined}
                    onKeyDown={
                      isRowClickable
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openDetail();
                            }
                          }
                        : undefined
                    }
                    tabIndex={isRowClickable ? 0 : undefined}
                    role={isRowClickable ? "link" : undefined}
                    aria-label={
                      isRowClickable
                        ? `View ${displayName(row)} details`
                        : undefined
                    }
                  >
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={`${cellBorder} px-4 py-3 ${
                          column.align === "center" ? "text-center" : ""
                        } ${column.cellClassName ?? ""}`}
                        onClick={
                          column.id === "actions"
                            ? (event) => event.stopPropagation()
                            : undefined
                        }
                      >
                        {column.render(row)}
                      </td>
                    ))}
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
        />
      </div>
    </div>
  );
}

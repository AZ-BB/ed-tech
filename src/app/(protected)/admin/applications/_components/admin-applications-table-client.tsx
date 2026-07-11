"use client";

import { Pagination } from "@/components/pagination";
import { format } from "date-fns";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import {
  assignAdminApplicationAssignee,
  updateAdminApplicationStatus,
} from "@/actions/admin-applications";
import {
  assignAdminAdvisorSessionAdvisor,
  updateAdminSessionStatus,
} from "@/actions/admin-sessions";
import type { AdminSchoolOption } from "@/app/(protected)/admin/users/_lib/fetch-admin-school-options";
import { ADMIN_ADVISOR_SESSION_STATUS_FILTER_OPTIONS } from "@/app/(protected)/admin/sessions/_lib/session-status-labels";

import type { AdminApplicationAdminOption } from "../_lib/fetch-admin-application-admin-options";
import { adminAssigneeOptionValue } from "../_lib/fetch-admin-application-admin-options";
import type { AdminApplicationAdvisorOption } from "../_lib/fetch-admin-application-advisor-options";
import { ADMIN_APPLICATIONS_UNASSIGNED_FILTER } from "../_lib/fetch-admin-application-advisor-options";
import type { AdminApplicationSupportTableRow } from "../_lib/fetch-admin-applications-page";
import {
  ADMIN_APPLICATION_STATUS_FILTER_OPTIONS,
  type AdminApplicationStatusFilter,
} from "../_lib/application-status-labels";
import type { AdminApplicationsAssignedToFilter } from "../_lib/parse-admin-applications-search-params";
import type { AdminApplicationSupportTypeFilter } from "../_lib/parse-admin-applications-search-params";

const LIMIT_OPTIONS = [10, 20, 30, 50] as const;

const TYPE_FILTER_OPTIONS = [
  { value: "", label: "All types" },
  { value: "application_support", label: "App Support" },
  { value: "advisor_session", label: "Advisor Session" },
] as const;

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

const filterSelectClass =
  "min-w-[140px] cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat py-[7px] pl-[10px] pr-9 text-[12px] text-[#4a4a4a] outline-none transition-colors focus:border-[#40916C]";

const rowSelectClass =
  "max-w-[180px] cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat py-1.5 pl-2 pr-7 text-[11px] text-[#4a4a4a] outline-none transition-colors focus:border-[#40916C] disabled:cursor-wait disabled:opacity-60";

function formatBookedAt(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "MMM d, yyyy · h:mm a");
  } catch {
    return "—";
  }
}

function typeBadgeClass(kind: AdminApplicationSupportTableRow["kind"]): string {
  if (kind === "application_support") {
    return "bg-[#e8f5ee] text-[#2D6A4F]";
  }
  return "bg-[#E3F2FD] text-[#3498DB]";
}

function typeLabel(kind: AdminApplicationSupportTableRow["kind"]): string {
  return kind === "application_support" ? "App Support" : "Advisor Session";
}

function applicationAssigneeValue(row: Extract<AdminApplicationSupportTableRow, { kind: "application_support" }>): string {
  if (!row.assigneeId || !row.assigneeKind) return "unassigned";
  return adminAssigneeOptionValue(row.assigneeKind, row.assigneeId);
}

function buildAppSupportAssigneeOptions(
  adminOptions: AdminApplicationAdminOption[],
  advisorOptions: AdminApplicationAdvisorOption[],
  row?: Extract<AdminApplicationSupportTableRow, { kind: "application_support" }>,
): {
  admins: AdminApplicationAdminOption[];
  advisors: AdminApplicationAdvisorOption[];
} {
  const admins = [...adminOptions];
  const adminIds = new Set(admins.map((option) => option.id));

  if (
    row?.assigneeKind === "admin" &&
    row.assigneeId &&
    !adminIds.has(row.assigneeId)
  ) {
    admins.unshift({
      id: row.assigneeId,
      label: row.assigneeName?.trim() || "Admin",
    });
  }

  return { admins, advisors: advisorOptions };
}

function sessionAssigneeValue(row: Extract<AdminApplicationSupportTableRow, { kind: "advisor_session" }>): string {
  return row.assigneeId;
}

function statusFilterOptions(type: AdminApplicationSupportTypeFilter) {
  if (type === "application_support") {
    return ADMIN_APPLICATION_STATUS_FILTER_OPTIONS;
  }
  if (type === "advisor_session") {
    return ADMIN_ADVISOR_SESSION_STATUS_FILTER_OPTIONS;
  }
  return [{ value: "", label: "All Status" }] as const;
}

export type AdminApplicationsTableClientProps = {
  rows: AdminApplicationSupportTableRow[];
  totalRows: number;
  page: number;
  limit: number;
  q: string;
  type: AdminApplicationSupportTypeFilter;
  status: AdminApplicationStatusFilter | string;
  assignedTo: AdminApplicationsAssignedToFilter;
  schoolId: string;
  advisorOptions: AdminApplicationAdvisorOption[];
  adminOptions: AdminApplicationAdminOption[];
  schoolOptions: AdminSchoolOption[];
};

export function AdminApplicationsTableClient({
  rows,
  totalRows,
  page,
  limit,
  q,
  type,
  status,
  assignedTo,
  schoolId,
  advisorOptions,
  adminOptions,
  schoolOptions,
}: AdminApplicationsTableClientProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const filtersActive =
    q.trim().length > 0 ||
    type !== "" ||
    status !== "" ||
    assignedTo !== "" ||
    schoolId !== "";

  const statusOptions = statusFilterOptions(type);

  async function handleApplicationAssigneeChange(
    row: Extract<AdminApplicationSupportTableRow, { kind: "application_support" }>,
    nextValue: string,
  ) {
    const key = `assign-app-${row.id}`;
    setBusyKey(key);
    setRowError(null);

    const result = await assignAdminApplicationAssignee(String(row.id), nextValue);
    setBusyKey(null);

    if (!result.ok) {
      setRowError(result.error);
      return;
    }

    router.refresh();
  }

  async function handleSessionAssigneeChange(
    row: Extract<AdminApplicationSupportTableRow, { kind: "advisor_session" }>,
    nextAdvisorId: string,
  ) {
    const key = `assign-session-${row.id}`;
    setBusyKey(key);
    setRowError(null);

    const result = await assignAdminAdvisorSessionAdvisor(String(row.id), nextAdvisorId);
    setBusyKey(null);

    if (!result.ok) {
      setRowError(result.error);
      return;
    }

    router.refresh();
  }

  async function handleApplicationStatusChange(
    row: Extract<AdminApplicationSupportTableRow, { kind: "application_support" }>,
    nextStatus: string,
  ) {
    const key = `status-app-${row.id}`;
    setBusyKey(key);
    setRowError(null);

    const result = await updateAdminApplicationStatus(String(row.id), nextStatus);
    setBusyKey(null);

    if (!result.ok) {
      setRowError(result.error);
      return;
    }

    router.refresh();
  }

  async function handleSessionStatusChange(
    row: Extract<AdminApplicationSupportTableRow, { kind: "advisor_session" }>,
    nextStatus: string,
  ) {
    const key = `status-session-${row.id}`;
    setBusyKey(key);
    setRowError(null);

    const result = await updateAdminSessionStatus("advisor", String(row.id), nextStatus);
    setBusyKey(null);

    if (!result.ok) {
      setRowError(result.error);
      return;
    }

    router.refresh();
  }

  function stopRowNavigation(event: React.SyntheticEvent) {
    event.stopPropagation();
  }

  return (
    <div className="overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-4">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-[14px] font-bold text-[#1a1a1a]">All Applications</h2>
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
            <label htmlFor="admin-applications-search" className="sr-only">
              Search students
            </label>
            <input
              id="admin-applications-search"
              key={`${q}-${type}-${status}-${assignedTo}-${schoolId}`}
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search students..."
              className="w-full rounded-[8px] border border-[#e0deda] bg-white py-[7px] pl-8 pr-3 text-[12px] text-[#1a1a1a] outline-none transition-colors placeholder:text-[#a0a0a0] focus:border-[#40916C]"
            />
          </div>

          <select
            name="school"
            aria-label="Filter by school"
            className={`${filterSelectClass} max-w-[220px]`}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={schoolId}
          >
            <option value="">All schools</option>
            {schoolOptions.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>

          <select
            name="type"
            aria-label="Filter by type"
            className={filterSelectClass}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={type}
          >
            {TYPE_FILTER_OPTIONS.map((option) => (
              <option key={option.value || "all-types"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            name="assignedTo"
            aria-label="Filter by advisor or admin"
            className={filterSelectClass}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={assignedTo}
          >
            <option value="">All owners</option>
            <option value={ADMIN_APPLICATIONS_UNASSIGNED_FILTER}>Unassigned</option>
            <optgroup label="Admins">
              {adminOptions.map((option) => (
                <option key={`admin-${option.id}`} value={option.id}>
                  {option.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Advisors">
              {advisorOptions.map((option) => (
                <option key={`advisor-${option.id}`} value={option.id}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          </select>

          <select
            name="status"
            aria-label="Filter by status"
            className={filterSelectClass}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={status}
            disabled={type === ""}
          >
            {statusOptions.map((option) => (
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

      {rowError ? (
        <div className="border-b border-[#ece9e4] bg-[#FCEBEB] px-5 py-2 text-[12px] text-[#E74C3C]">
          {rowError}
        </div>
      ) : null}

      <div className="overflow-x-auto px-5 pb-1 pt-1 [zoom:0.95]">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="bg-[#fafaf8]">
              {["Student", "Type", "Advisor / Admin", "Booked at", "Status"].map((heading) => (
                <th
                  key={heading}
                  className="border-b border-[#ece9e4] px-4 py-[10px] text-left text-[10px] font-bold uppercase tracking-[0.8px] text-[#a0a0a0]"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-[13px] text-[#a0a0a0]"
                >
                  {filtersActive
                    ? "No records match your filters."
                    : "No application support or advisor session records yet."}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const isLastRow = index === rows.length - 1;
                const cellBorder = isLastRow ? "" : "border-b border-[#ece9e4]";
                const assignBusyKey =
                  row.kind === "application_support"
                    ? `assign-app-${row.id}`
                    : `assign-session-${row.id}`;
                const statusBusyKey =
                  row.kind === "application_support"
                    ? `status-app-${row.id}`
                    : `status-session-${row.id}`;
                const isAssignBusy = busyKey === assignBusyKey;
                const isStatusBusy = busyKey === statusBusyKey;

                return (
                  <tr
                    key={`${row.kind}-${row.id}`}
                    className="cursor-pointer transition-colors hover:bg-[#f0f7f2]"
                    onClick={() => router.push(row.detailHref)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(row.detailHref);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`View ${typeLabel(row.kind)} for ${row.studentName}`}
                  >
                    <td className={`${cellBorder} px-4 py-3`}>
                      <div className="text-[13px] font-semibold text-[#1a1a1a]">
                        {row.studentName}
                      </div>
                      <div className="mt-px text-[11px] text-[#a0a0a0]">
                        {row.schoolName}
                      </div>
                    </td>
                    <td className={`${cellBorder} px-4 py-3`}>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${typeBadgeClass(row.kind)}`}
                      >
                        {typeLabel(row.kind)}
                      </span>
                    </td>
                    <td className={`${cellBorder} px-4 py-3`} onClick={stopRowNavigation}>
                      {row.kind === "application_support" ? (
                        (() => {
                          const assigneeOptions = buildAppSupportAssigneeOptions(
                            adminOptions,
                            advisorOptions,
                            row,
                          );

                          return (
                            <select
                              className={rowSelectClass}
                              style={{ backgroundImage: SELECT_CHEVRON }}
                              value={applicationAssigneeValue(row)}
                              disabled={isAssignBusy}
                              aria-label={`Assign admin or advisor for ${row.studentName}`}
                              onChange={(event) =>
                                void handleApplicationAssigneeChange(row, event.target.value)
                              }
                            >
                              <option value="unassigned">Unassigned</option>
                              {assigneeOptions.admins.length > 0 ? (
                                <optgroup label="Admins">
                                  {assigneeOptions.admins.map((option) => (
                                    <option
                                      key={`admin-${option.id}`}
                                      value={adminAssigneeOptionValue("admin", option.id)}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </optgroup>
                              ) : null}
                              <optgroup label="Advisors">
                                {assigneeOptions.advisors.map((option) => (
                                  <option
                                    key={`advisor-${option.id}`}
                                    value={adminAssigneeOptionValue("advisor", option.id)}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          );
                        })()
                      ) : (
                        <select
                          className={rowSelectClass}
                          style={{ backgroundImage: SELECT_CHEVRON }}
                          value={sessionAssigneeValue(row)}
                          disabled={isAssignBusy}
                          aria-label={`Assign advisor for ${row.studentName}`}
                          onChange={(event) =>
                            void handleSessionAssigneeChange(row, event.target.value)
                          }
                        >
                          {advisorOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td
                      className={`${cellBorder} whitespace-nowrap px-4 py-3 text-[13px] text-[#4a4a4a]`}
                    >
                      {formatBookedAt(row.bookedAt)}
                    </td>
                    <td className={`${cellBorder} px-4 py-3`} onClick={stopRowNavigation}>
                      {row.kind === "application_support" ? (
                        <select
                          className={rowSelectClass}
                          style={{ backgroundImage: SELECT_CHEVRON }}
                          value={row.status}
                          disabled={isStatusBusy}
                          aria-label={`Status for ${row.studentName}`}
                          onChange={(event) =>
                            void handleApplicationStatusChange(row, event.target.value)
                          }
                        >
                          {ADMIN_APPLICATION_STATUS_FILTER_OPTIONS.filter((o) => o.value).map(
                            (option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ),
                          )}
                        </select>
                      ) : (
                        <select
                          className={rowSelectClass}
                          style={{ backgroundImage: SELECT_CHEVRON }}
                          value={row.status}
                          disabled={isStatusBusy}
                          aria-label={`Status for ${row.studentName}`}
                          onChange={(event) =>
                            void handleSessionStatusChange(row, event.target.value)
                          }
                        >
                          {ADMIN_ADVISOR_SESSION_STATUS_FILTER_OPTIONS.filter((o) => o.value).map(
                            (option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ),
                          )}
                        </select>
                      )}
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
        />
      </div>
    </div>
  );
}

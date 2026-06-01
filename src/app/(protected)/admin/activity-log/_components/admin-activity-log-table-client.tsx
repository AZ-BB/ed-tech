"use client";

import { Pagination } from "@/components/pagination";
import {
  getActivityLogActorUserDetailHref,
  getActivityLogEntityUserDetailHref,
} from "@/lib/activity-log-user-links";
import {
  formatActivityLogAction,
  formatActivityLogActorType,
  formatActivityLogEntityType,
} from "@/lib/student-activity-logs";
import { format } from "date-fns";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import type { AdminActivityLogTableRow } from "../_lib/fetch-admin-activity-log-page";
import {
  ADMIN_ACTIVITY_LOG_ACTOR_TYPE_FILTER_OPTIONS,
  type AdminActivityLogActorTypeFilter,
} from "../_lib/parse-admin-activity-log-search-params";

const LIMIT_OPTIONS = [10, 20, 30, 50] as const;

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

const filterSelectClass =
  "min-w-[140px] cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat py-[7px] pl-[10px] pr-9 text-[12px] text-[#4a4a4a] outline-none transition-colors focus:border-[#40916C]";

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "MMM d, yyyy · h:mm a");
  } catch {
    return "—";
  }
}

const linkClassName = "font-semibold text-[#1a1a1a] hover:text-[#2D6A4F]";

function ActivityLogUserLink({
  href,
  children,
  className = linkClassName,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export type AdminActivityLogTableClientProps = {
  rows: AdminActivityLogTableRow[];
  totalRows: number;
  page: number;
  limit: number;
  q: string;
  action: string;
  entityType: string;
  actorType: AdminActivityLogActorTypeFilter;
  actionOptions: string[];
  entityTypeOptions: string[];
};

export function AdminActivityLogTableClient({
  rows,
  totalRows,
  page,
  limit,
  q,
  action,
  entityType,
  actorType,
  actionOptions,
  entityTypeOptions,
}: AdminActivityLogTableClientProps) {
  const pathname = usePathname() ?? "";
  const filtersActive =
    q.trim().length > 0 ||
    action !== "" ||
    entityType !== "" ||
    actorType !== "";

  return (
    <div className="overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-4">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-[14px] font-bold text-[#1a1a1a]">Activity Log</h2>
          <span className="text-[11px] text-[#a0a0a0]">
            {totalRows.toLocaleString()} {totalRows === 1 ? "entry" : "entries"}
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
            <label htmlFor="admin-activity-log-search" className="sr-only">
              Search activity logs
            </label>
            <input
              id="admin-activity-log-search"
              key={`${q}-${action}-${entityType}-${actorType}`}
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search logs..."
              className="w-full rounded-[8px] border border-[#e0deda] bg-white py-[7px] pl-8 pr-3 text-[12px] text-[#1a1a1a] outline-none transition-colors placeholder:text-[#a0a0a0] focus:border-[#40916C]"
            />
          </div>

          <select
            name="action"
            aria-label="Filter by action"
            className={filterSelectClass}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={action}
          >
            <option value="">All actions</option>
            {actionOptions.map((option) => (
              <option key={option} value={option}>
                {formatActivityLogAction(option)}
              </option>
            ))}
          </select>

          <select
            name="entityType"
            aria-label="Filter by entity type"
            className={filterSelectClass}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={entityType}
          >
            <option value="">All entity types</option>
            {entityTypeOptions.map((option) => (
              <option key={option} value={option}>
                {formatActivityLogEntityType(option)}
              </option>
            ))}
          </select>

          <select
            name="actorType"
            aria-label="Filter by actor type"
            className={filterSelectClass}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={actorType}
          >
            {ADMIN_ACTIVITY_LOG_ACTOR_TYPE_FILTER_OPTIONS.map((option) => (
              <option key={option.value || "all-actors"} value={option.value}>
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
        <table className="w-full min-w-[860px] border-collapse">
          <thead>
            <tr className="bg-[#fafaf8]">
              {["Date", "Action", "Message", "Entity", "Actor"].map((heading) => (
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
                  {filtersActive ? "No activity logs found." : "No activity logs recorded yet."}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const isLastRow = index === rows.length - 1;
                const cellBorder = isLastRow ? "" : "border-b border-[#ece9e4]";
                const entityHref = getActivityLogEntityUserDetailHref(
                  row.entityType,
                  row.entityId,
                );
                const actorHref = getActivityLogActorUserDetailHref(
                  row.createdByType,
                  row.actorUserId,
                );

                return (
                  <tr key={row.id} className="transition-colors hover:bg-[#f0f7f2]">
                    <td
                      className={`${cellBorder} px-4 py-3 whitespace-nowrap text-[13px] text-[#4a4a4a]`}
                    >
                      {formatWhen(row.createdAt)}
                    </td>
                    <td className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}>
                      {formatActivityLogAction(row.action)}
                    </td>
                    <td
                      className={`${cellBorder} max-w-[360px] px-4 py-3 text-[13px] leading-snug text-[#4a4a4a]`}
                    >
                      {row.message}
                    </td>
                    <td className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}>
                      {entityHref ? (
                        <ActivityLogUserLink href={entityHref}>
                          {formatActivityLogEntityType(row.entityType)}
                        </ActivityLogUserLink>
                      ) : (
                        <div>{formatActivityLogEntityType(row.entityType)}</div>
                      )}
                      {entityHref ? (
                        <ActivityLogUserLink
                          href={entityHref}
                          className="mt-0.5 block text-[11px] text-[#a0a0a0] hover:text-[#2D6A4F]"
                        >
                          {row.entityId}
                        </ActivityLogUserLink>
                      ) : (
                        <div className="mt-0.5 text-[11px] text-[#a0a0a0]">{row.entityId}</div>
                      )}
                    </td>
                    <td className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}>
                      {actorHref ? (
                        <ActivityLogUserLink href={actorHref}>
                          {row.actorName ?? "—"}
                        </ActivityLogUserLink>
                      ) : (
                        <div>{row.actorName ?? "—"}</div>
                      )}
                      <div className="mt-0.5 text-[11px] text-[#a0a0a0]">
                        {formatActivityLogActorType(row.createdByType)}
                      </div>
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

"use client";

import { Pagination } from "@/components/pagination";
import { format } from "date-fns";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { AdminPaymentTableRow } from "../_lib/fetch-admin-payments-page";
import {
  ADMIN_PAYMENT_STATUS_FILTER_OPTIONS,
  ADMIN_PAYMENT_TYPE_FILTER_OPTIONS,
  type AdminPaymentStatusFilter,
  type AdminPaymentTypeFilter,
} from "../_lib/parse-admin-payments-search-params";

const LIMIT_OPTIONS = [10, 20, 30, 50] as const;

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

const filterSelectClass =
  "min-w-[140px] cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat py-[7px] pl-[10px] pr-9 text-[12px] text-[#4a4a4a] outline-none transition-colors focus:border-[#40916C]";

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "MMM d, yyyy · h:mm a");
  } catch {
    return "—";
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "MMM d, yyyy");
  } catch {
    return "—";
  }
}

function paymentStatusClass(status: string): string {
  if (status === "paid") return "bg-[#e8f5ee] text-[#2D6A4F]";
  if (status === "failed") return "bg-[#FCEBEB] text-[#E74C3C]";
  return "bg-[#FFF3E0] text-[#E67E22]";
}

function paymentChannelLabel(channel: "manual" | "stripe"): string {
  return channel === "stripe" ? "Stripe" : "Manual";
}

function paymentChannelClass(channel: "manual" | "stripe"): string {
  return channel === "stripe"
    ? "bg-[#eef2ff] text-[#4338ca]"
    : "bg-[#f3f4f6] text-[#4b5563]";
}

export type AdminPaymentsTableClientProps = {
  rows: AdminPaymentTableRow[];
  totalRows: number;
  page: number;
  limit: number;
  q: string;
  status: AdminPaymentStatusFilter;
  type: AdminPaymentTypeFilter;
};

export function AdminPaymentsTableClient({
  rows,
  totalRows,
  page,
  limit,
  q,
  status,
  type,
}: AdminPaymentsTableClientProps) {
  const pathname = usePathname() ?? "";
  const filtersActive = q.trim().length > 0 || status !== "" || type !== "";

  return (
    <div className="overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-4">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-[14px] font-bold text-[#1a1a1a]">Payments</h2>
          <span className="text-[11px] text-[#a0a0a0]">
            {totalRows.toLocaleString()} {totalRows === 1 ? "payment" : "payments"}
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
            <label htmlFor="admin-payments-search" className="sr-only">
              Search payments
            </label>
            <input
              id="admin-payments-search"
              key={`${q}-${status}-${type}`}
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by student or ID..."
              className="w-full rounded-[8px] border border-[#e0deda] bg-white py-[7px] pl-8 pr-3 text-[12px] text-[#1a1a1a] outline-none transition-colors placeholder:text-[#a0a0a0] focus:border-[#40916C]"
            />
          </div>

          <select
            name="status"
            aria-label="Filter by status"
            className={filterSelectClass}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={status}
          >
            {ADMIN_PAYMENT_STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value || "all-statuses"} value={option.value}>
                {option.label}
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
            {ADMIN_PAYMENT_TYPE_FILTER_OPTIONS.map((option) => (
              <option key={option.value || "all-types"} value={option.value}>
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
        <table className="w-full min-w-[960px] border-collapse">
          <thead>
            <tr className="bg-[#fafaf8]">
              {[
                "ID",
                "Student",
                "Type",
                "Reference",
                "Amount",
                "Payment type",
                "Status",
                "Due date",
                "Requested by",
                "Created",
                "Paid at",
              ].map((heading) => (
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
                  colSpan={11}
                  className="border-b border-[#ece9e4] px-4 py-10 text-center text-[13px] text-[#a0a0a0]"
                >
                  {filtersActive
                    ? "No payments match your filters."
                    : "No payments recorded yet."}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-[#ece9e4] last:border-b-0">
                  <td className="px-4 py-3 text-[13px] font-medium text-[#4a4a4a]">
                    #{row.id}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/students/${row.studentId}`}
                      className="font-semibold text-[#1a1a1a] hover:text-[#2D6A4F]"
                    >
                      {row.studentName}
                    </Link>
                    {row.studentEmail !== "—" ? (
                      <div className="mt-0.5 text-[11px] text-[#a0a0a0]">
                        {row.studentEmail}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#4a4a4a]">
                    {row.kind === "post_admission" ? "Post-admission" : "Application"}
                  </td>
                  <td className="px-4 py-3 text-[13px]">
                    <Link
                      href={row.referenceHref}
                      className="font-semibold text-[#2D6A4F] hover:underline"
                    >
                      {row.referenceLabel}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-[#1a1a1a]">
                    {row.amount.toLocaleString()} AED
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${paymentChannelClass(row.paymentChannel)}`}
                    >
                      {paymentChannelLabel(row.paymentChannel)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${paymentStatusClass(row.status)}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#4a4a4a]">
                    {formatDate(row.dueDate)}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#4a4a4a]">
                    {row.requestedByLabel}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#4a4a4a]">
                    {formatDateTime(row.sentAt ?? row.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#4a4a4a]">
                    {row.status === "paid" ? formatDateTime(row.paidAt) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[#ece9e4] px-5 py-4">
        <Pagination
          page={page}
          limit={limit}
          totalRows={totalRows}
          limitOptions={LIMIT_OPTIONS}
        />
      </div>
    </div>
  );
}

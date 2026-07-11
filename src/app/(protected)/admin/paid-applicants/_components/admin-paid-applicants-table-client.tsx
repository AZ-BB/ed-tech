"use client";

import { sendApplicationPaymentRequest } from "@/actions/admin-application-payments";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { AdminPlanOption } from "@/app/(protected)/admin/applications/_lib/fetch-admin-plan-options";
import {
  SendPaymentRequestDialog,
  type SendPaymentRequestApplicationOption,
} from "@/components/application-support/send-payment-request-dialog";
import { Pagination } from "@/components/pagination";
import type { ApplicationPlanCatalogRow } from "@/lib/applications-plans";
import type { SendPaymentRequestInput } from "@/lib/payment-request-email-content";
import type { AdminPaidApplicantTableRow } from "../_lib/fetch-admin-paid-applicants-page";
import type { AdminSchoolOption } from "@/app/(protected)/admin/users/_lib/fetch-admin-school-options";

const LIMIT_OPTIONS = [10, 20, 30, 50] as const;

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

const filterSelectClass =
  "min-w-[140px] cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat py-[7px] pl-[10px] pr-9 text-[12px] text-[#4a4a4a] outline-none transition-colors focus:border-[#40916C]";

function formatPaidAt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(amount: number): string {
  return `${amount.toLocaleString()} AED`;
}

export type AdminPaidApplicantsTableClientProps = {
  rows: AdminPaidApplicantTableRow[];
  totalRows: number;
  page: number;
  limit: number;
  q: string;
  schoolId: string;
  planId: string;
  paymentRequestApplications: SendPaymentRequestApplicationOption[];
  availablePlans: ApplicationPlanCatalogRow[];
  adminName: string;
  adminEmail: string;
  fromEmailDisplay: string;
  schoolOptions: AdminSchoolOption[];
  planOptions: AdminPlanOption[];
};

export function AdminPaidApplicantsTableClient({
  rows,
  totalRows,
  page,
  limit,
  q,
  schoolId,
  planId,
  paymentRequestApplications,
  availablePlans,
  adminName,
  adminEmail,
  fromEmailDisplay,
  schoolOptions,
  planOptions,
}: AdminPaidApplicantsTableClientProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [paymentRequestOpen, setPaymentRequestOpen] = useState(false);
  const [requestPaymentError, setRequestPaymentError] = useState<string | null>(null);
  const [requestPaymentMessage, setRequestPaymentMessage] = useState<string | null>(null);
  const filtersActive =
    q.trim().length > 0 || schoolId !== "" || planId !== "";
  const hasPaymentTargets = paymentRequestApplications.length > 0;

  function handleOpenRequestPayment() {
    setRequestPaymentError(null);
    setPaymentRequestOpen(true);
  }

  function handleSendPaymentRequest(input: SendPaymentRequestInput) {
    setRequestPaymentError(null);
    startTransition(async () => {
      const result = await sendApplicationPaymentRequest(input);
      if (!result.ok) {
        setRequestPaymentError(result.error);
        return;
      }
      setPaymentRequestOpen(false);
      setRequestPaymentMessage(
        `Payment request for ${input.amountAed.toLocaleString()} AED sent to ${result.email}.`,
      );
      router.refresh();
    });
  }

  return (
    <div className={isPending ? "opacity-75" : ""} aria-busy={isPending}>
      {hasPaymentTargets ? (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={handleOpenRequestPayment}
            disabled={isPending}
            className="cursor-pointer rounded-[8px] border-[1.5px] border-[#2D6A4F] bg-[#2D6A4F] px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Request payment
          </button>
        </div>
      ) : null}

      {requestPaymentMessage ? (
        <p className="mb-3 text-[12px] font-medium text-[#2D6A4F]">
          {requestPaymentMessage}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-4">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-[14px] font-bold text-[#1a1a1a]">Paid Applicants</h2>
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
              <label htmlFor="admin-paid-applicants-search" className="sr-only">
                Search students
              </label>
              <input
                id="admin-paid-applicants-search"
                key={`${q}-${schoolId}-${planId}`}
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
              name="package"
              aria-label="Filter by package"
              className={filterSelectClass}
              style={{ backgroundImage: SELECT_CHEVRON }}
              defaultValue={planId}
            >
              <option value="">All packages</option>
              {planOptions.map((plan) => (
                <option key={plan.id} value={String(plan.id)}>
                  {plan.label}
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
              {["Student", "School", "Package", "Paid amount", "Paid at"].map((heading) => (
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
                    ? "No paid applicants match your filters."
                    : "No paid applicants yet."}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const isLastRow = index === rows.length - 1;
                const cellBorder = isLastRow ? "" : "border-b border-[#ece9e4]";
                const detailHref = `/admin/applications/${row.applicationId}`;

                function openDetail() {
                  router.push(detailHref);
                }

                return (
                  <tr
                    key={row.applicationId}
                    className="cursor-pointer transition-colors hover:bg-[#f0f7f2]"
                    onClick={openDetail}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDetail();
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`View paid application for ${row.studentName}`}
                  >
                    <td className={`${cellBorder} px-4 py-3`}>
                      <div className="text-[13px] font-semibold text-[#1a1a1a]">
                        {row.studentName}
                      </div>
                    </td>
                    <td
                      className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {row.schoolId ? (
                        <Link
                          href={`/admin/schools/${row.schoolId}`}
                          className="font-medium text-[#2D6A4F] hover:underline"
                        >
                          {row.schoolName}
                        </Link>
                      ) : (
                        row.schoolName
                      )}
                    </td>
                    <td className={`${cellBorder} px-4 py-3 text-[13px] text-[#4a4a4a]`}>
                      {row.packageLabel}
                    </td>
                    <td className={`${cellBorder} px-4 py-3 text-[13px] font-medium text-[#4a4a4a]`}>
                      {formatAmount(row.paidAmount)}
                    </td>
                    <td className={`${cellBorder} whitespace-nowrap px-4 py-3 text-[13px] text-[#4a4a4a]`}>
                      {formatPaidAt(row.paidAt)}
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

      <SendPaymentRequestDialog
        open={paymentRequestOpen}
        onClose={() => {
          if (!isPending) setPaymentRequestOpen(false);
        }}
        applicationOptions={paymentRequestApplications}
        availablePlans={availablePlans}
        senderName={adminName}
        senderEmail={adminEmail}
        fromEmailDisplay={fromEmailDisplay}
        onSubmit={handleSendPaymentRequest}
        isSubmitting={isPending}
        error={requestPaymentError}
      />
    </div>
  );
}

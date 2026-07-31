"use client";

import {
  createAdminApplicationPaymentLink,
  sendAdminLeadApplicationPaymentRequest,
} from "@/actions/admin-application-payments";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { format } from "date-fns";

import {
  LeadPaymentRequestDialog,
  type LeadPaymentRequestApplicationOption,
} from "@/components/application-support/lead-payment-request-dialog";
import { Pagination } from "@/components/pagination";
import type {
  LeadApplicationPaymentEmailInput,
  LeadApplicationPaymentLinkInput,
} from "@/lib/lead-application-payment-types";
import type { AdminPaidApplicantTableRow } from "../_lib/fetch-admin-paid-applicants-page";

const LIMIT_OPTIONS = [10, 20, 50] as const;

function formatPaidOn(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "d MMM yyyy");
  } catch {
    return "—";
  }
}

function statusBadgeClass(label: "Active" | "Submitted"): string {
  if (label === "Submitted") {
    return "bg-[#dbeafe] text-[#1e40af]";
  }
  return "bg-[#E8F5EE] text-[#2D6A4F]";
}

export type AdminPaidApplicantsTableClientProps = {
  rows: AdminPaidApplicantTableRow[];
  totalRows: number;
  page: number;
  limit: number;
  search: string;
  paymentRequestApplications: LeadPaymentRequestApplicationOption[];
  adminName: string;
  adminEmail: string;
  fromEmailDisplay: string;
};

export function AdminPaidApplicantsTableClient({
  rows,
  totalRows,
  page,
  limit,
  search,
  paymentRequestApplications,
  adminName,
  adminEmail,
  fromEmailDisplay,
}: AdminPaidApplicantsTableClientProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(search);
  const [requestPaymentOpen, setRequestPaymentOpen] = useState(false);
  const [requestPaymentError, setRequestPaymentError] = useState<string | null>(null);
  const [requestPaymentMessage, setRequestPaymentMessage] = useState<string | null>(null);
  const [generatedPayUrl, setGeneratedPayUrl] = useState<string | null>(null);

  const hasPaymentTargets = paymentRequestApplications.length > 0;

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const applySearch = useCallback(
    (value: string) => {
      startTransition(() => {
        const next = new URLSearchParams(searchParams.toString());
        const trimmed = value.trim();
        if (trimmed) {
          next.set("search", trimmed);
        } else {
          next.delete("search");
        }
        next.set("page", "1");
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (searchInput.trim() === search.trim()) return;
      applySearch(searchInput);
    }, 300);

    return () => window.clearTimeout(handle);
  }, [searchInput, search, applySearch]);

  const countLabel =
    totalRows === 1 ? "1 paying applicant" : `${totalRows} paying applicants`;

  function handleOpenRequestPayment() {
    setRequestPaymentError(null);
    setGeneratedPayUrl(null);
    setRequestPaymentOpen(true);
  }

  function handleGeneratePaymentLink(input: LeadApplicationPaymentLinkInput) {
    setRequestPaymentError(null);
    startTransition(async () => {
      const result = await createAdminApplicationPaymentLink(input);
      if (!result.ok) {
        setRequestPaymentError(result.error);
        return;
      }
      setGeneratedPayUrl(result.payUrl);
      setRequestPaymentMessage(
        `Payment link generated for ${input.amountAed.toLocaleString()} AED.`,
      );
      router.refresh();
    });
  }

  function handleSendLeadApplicationPayment(input: LeadApplicationPaymentEmailInput) {
    setRequestPaymentError(null);
    startTransition(async () => {
      const result = await sendAdminLeadApplicationPaymentRequest(input);
      if (!result.ok) {
        setRequestPaymentError(result.error);
        return;
      }
      setRequestPaymentOpen(false);
      setGeneratedPayUrl(null);
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
        <p className="mb-3 text-[12px] font-medium text-[#2D6A4F]">{requestPaymentMessage}</p>
      ) : null}

      <div
        className="overflow-hidden rounded-[14px] border border-[#ece9e4] bg-white"
      >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e4] px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-[10px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#a0a0a0]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search paying applicants..."
              className="w-[240px] max-w-full rounded-[8px] border-[1.5px] border-[#e0deda] bg-[#fafaf8] py-[7px] pl-8 pr-3 text-[12.5px] text-[#1a1a1a] outline-none transition-colors placeholder:text-[#a0a0a0] focus:border-[#40916C] focus:bg-white"
            />
          </div>
          <span className="inline-flex rounded-full border border-[#ece9e4] bg-[#fafaf8] px-2.5 py-1 text-[11px] font-semibold text-[#4a4a4a]">
            {countLabel}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#fafaf8] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#a0a0a0]">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Advisor</th>
              <th className="px-4 py-3">Package purchased</th>
              <th className="px-4 py-3">Amount paid</th>
              <th className="px-4 py-3">Paid on</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-[#a0a0a0]"
                >
                  {search.trim()
                    ? "No paying applicants match your search."
                    : "No paying applicants yet. Applicants appear here after a student completes payment."}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const detailHref = `/admin/applications/${row.applicationId}`;

                function openDetail() {
                  router.push(detailHref);
                }

                return (
                  <tr
                    key={row.applicationId}
                    className="cursor-pointer border-t border-[#ece9e4] transition-colors hover:bg-[#f0f7f2]"
                    onClick={openDetail}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDetail();
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`View application for ${row.studentName}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5 text-[#1a1a1a]">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E8F5EE] text-[11.5px] font-bold text-[#2D6A4F]">
                          {row.studentInitials}
                        </span>
                        <span className="font-semibold">{row.studentName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#888]">{row.studentEmail}</td>
                    <td
                      className="px-4 py-3 text-[#4a4a4a]"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {row.advisorId ? (
                        <Link
                          href={`/admin/users/advisors/${row.advisorId}`}
                          className="font-medium text-[#2D6A4F] hover:underline"
                        >
                          {row.advisorName}
                        </Link>
                      ) : (
                        row.advisorName
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#1a1a1a]">
                      {row.packagePurchased}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#1a1a1a]">
                      AED {row.amountPaidAed.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[#888]">
                      {formatPaidOn(row.paidOn)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusBadgeClass(row.statusLabel)}`}
                      >
                        {row.statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[#ece9e4] px-4 py-3">
        <Pagination
          totalRows={totalRows}
          page={page}
          limit={limit}
          limitOptions={LIMIT_OPTIONS}
        />
      </div>
      </div>

      <LeadPaymentRequestDialog
        open={requestPaymentOpen}
        onClose={() => {
          if (!isPending) {
            setRequestPaymentOpen(false);
            setGeneratedPayUrl(null);
            setRequestPaymentError(null);
          }
        }}
        applicationOptions={paymentRequestApplications}
        senderName={adminName}
        senderEmail={adminEmail}
        fromEmailDisplay={fromEmailDisplay}
        onGenerateLink={handleGeneratePaymentLink}
        onSendEmail={handleSendLeadApplicationPayment}
        isSubmitting={isPending}
        error={requestPaymentError}
        generatedPayUrl={generatedPayUrl}
      />
    </div>
  );
}

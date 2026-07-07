"use client";

import { sendAdvisorApplicationPaymentRequest } from "@/actions/advisor-application-payments";
import { sendAdvisorPostAdmissionPaymentRequest } from "@/actions/advisor-post-admission-payments";
import type {
  AdvisorPaymentRequestStatusFilter,
  AdvisorPaymentsPanelProps,
  AdvisorPaymentsTab,
  AdvisorPayoutStatusFilter,
} from "@/app/(protected)/advisor/payments/_lib/fetch-advisor-payments-page";
import { SendPaymentRequestDialog } from "@/components/application-support/send-payment-request-dialog";
import {
  SendPostAdmissionPaymentRequestDialog,
  type PostAdmissionSendPaymentRequestInput,
} from "@/components/post-admission-support/send-post-admission-payment-request-dialog";
import type { SendPaymentRequestInput } from "@/lib/payment-request-email-content";
import { Pagination } from "@/components/pagination";
import { format } from "date-fns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

const PAYMENT_REQUESTS_LIMIT_OPTIONS = [10, 20, 50] as const;
const PAYOUTS_LIMIT_OPTIONS = [10, 20, 50] as const;

const TAB_DEFS: { id: AdvisorPaymentsTab; label: string }[] = [
  { id: "requests", label: "Payment requests" },
  { id: "payouts", label: "My payouts" },
];

const PAYMENT_REQUEST_STATUS_OPTIONS: {
  value: AdvisorPaymentRequestStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
];

const PAYOUT_STATUS_OPTIONS: {
  value: AdvisorPayoutStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
];

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "d MMM yyyy");
  } catch {
    return "—";
  }
}

function paymentStatusClass(status: string): string {
  if (status === "paid") return "bg-[#e8f5ee] text-[#2D6A4F]";
  if (status === "failed") return "bg-[#FCEBEB] text-[#E74C3C]";
  return "bg-[#FFF3E0] text-[#E67E22]";
}

function payoutStatusClass(status: string): string {
  if (status === "paid") return "bg-[#e8f5ee] text-[#2D6A4F]";
  if (status === "canceled") return "bg-[#FCEBEB] text-[#E74C3C]";
  return "bg-[#FFF3E0] text-[#E67E22]";
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
        {label}
      </div>
      <div className="mt-1 text-[13px] font-medium text-[var(--text)]">{value}</div>
    </div>
  );
}

export function AdvisorPaymentsClient({
  tab: initialTab,
  payoutPercentage,
  advisorName,
  advisorEmail,
  fromEmailDisplay,
  availablePlans,
  paymentRequestApplications,
  paymentRequestPostAdmissionCases,
  paymentRequests,
  payouts,
}: AdvisorPaymentsPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<AdvisorPaymentsTab>(initialTab);
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(paymentRequests.search);
  const [requestPaymentOpen, setRequestPaymentOpen] = useState(false);
  const [requestPostAdmissionPaymentOpen, setRequestPostAdmissionPaymentOpen] =
    useState(false);
  const [requestPaymentError, setRequestPaymentError] = useState<string | null>(null);
  const [requestPaymentMessage, setRequestPaymentMessage] = useState<string | null>(null);

  const hasApplicationPaymentTargets = paymentRequestApplications.length > 0;
  const hasPostAdmissionPaymentTargets =
    paymentRequestPostAdmissionCases.length > 0;

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setSearchInput(paymentRequests.search);
  }, [paymentRequests.search]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString());
    const currentTab = next.get("tab");

    if (tab === "requests") {
      if (!currentTab || currentTab === "requests") return;
      next.delete("tab");
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
      return;
    }

    if (currentTab === tab) return;
    next.set("tab", tab);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [tab, pathname, router, searchParams]);

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
        next.set("paymentRequestsPage", "1");
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const switchPaymentStatus = useCallback(
    (nextStatus: AdvisorPaymentRequestStatusFilter) => {
      if (nextStatus === paymentRequests.status) return;
      startTransition(() => {
        const next = new URLSearchParams(searchParams.toString());
        if (nextStatus === "all") {
          next.delete("paymentStatus");
        } else {
          next.set("paymentStatus", nextStatus);
        }
        next.set("paymentRequestsPage", "1");
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [pathname, paymentRequests.status, router, searchParams],
  );

  const switchPayoutStatus = useCallback(
    (nextStatus: AdvisorPayoutStatusFilter) => {
      if (nextStatus === payouts.status) return;
      startTransition(() => {
        const next = new URLSearchParams(searchParams.toString());
        if (nextStatus === "all") {
          next.delete("payoutStatus");
        } else {
          next.set("payoutStatus", nextStatus);
        }
        next.set("payoutsPage", "1");
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [pathname, payouts.status, router, searchParams],
  );

  useEffect(() => {
    if (tab !== "requests") return;
    const handle = window.setTimeout(() => {
      if (searchInput.trim() === paymentRequests.search.trim()) return;
      applySearch(searchInput);
    }, 300);

    return () => window.clearTimeout(handle);
  }, [searchInput, paymentRequests.search, applySearch, tab]);

  const requestsCountLabel =
    paymentRequests.totalRows === 1
      ? "1 payment request"
      : `${paymentRequests.totalRows} payment requests`;

  function handleOpenRequestPayment() {
    setRequestPaymentError(null);
    setRequestPaymentOpen(true);
  }

  function handleOpenPostAdmissionRequestPayment() {
    setRequestPaymentError(null);
    setRequestPostAdmissionPaymentOpen(true);
  }

  function handleSendRequestPayment(input: SendPaymentRequestInput) {
    setRequestPaymentError(null);
    startTransition(async () => {
      const result = await sendAdvisorApplicationPaymentRequest(input);
      if (!result.ok) {
        setRequestPaymentError(result.error);
        return;
      }
      setRequestPaymentOpen(false);
      setRequestPaymentMessage(
        `Payment request for ${input.amountAed.toLocaleString()} AED sent to ${result.email}.`,
      );
      router.refresh();
    });
  }

  function handleSendPostAdmissionRequestPayment(
    input: PostAdmissionSendPaymentRequestInput,
  ) {
    setRequestPaymentError(null);
    startTransition(async () => {
      const result = await sendAdvisorPostAdmissionPaymentRequest(input);
      if (!result.ok) {
        setRequestPaymentError(result.error);
        return;
      }
      setRequestPostAdmissionPaymentOpen(false);
      setRequestPaymentMessage(
        `Payment request for ${input.amountAed.toLocaleString()} AED sent to ${result.email}.`,
      );
      router.refresh();
    });
  }

  function paymentRequestDetailHref(row: (typeof paymentRequests.rows)[number]) {
    if (row.kind === "post_admission") {
      return `/advisor/post-admission/${row.referenceId}?tab=payments`;
    }
    return `/advisor/applications/${row.referenceId}?tab=payments`;
  }

  function payoutDetailHref(row: (typeof payouts.rows)[number]) {
    if (row.kind === "post_admission") {
      return `/advisor/post-admission/${row.referenceId}?tab=payouts`;
    }
    return `/advisor/applications/${row.referenceId}?tab=payouts`;
  }

  return (
    <div className={isPending ? "opacity-75" : ""} aria-busy={isPending}>
      <div className="mb-4 flex gap-0.5 overflow-x-auto rounded-[10px] border border-[var(--border-light)] bg-white p-1">
        {TAB_DEFS.map((tabDef) => {
          const active = tab === tabDef.id;
          return (
            <button
              key={tabDef.id}
              type="button"
              onClick={() => setTab(tabDef.id)}
              className={`shrink-0 cursor-pointer rounded-[8px] px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${
                active
                  ? "bg-[var(--green)] text-white"
                  : "text-[var(--text-mid)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]"
              }`}
            >
              {tabDef.label}
            </button>
          );
        })}
      </div>

      {tab === "requests" ? (
        <div className="overflow-hidden rounded-[14px] border border-[var(--border-light)] bg-white">
          <div className="flex flex-wrap gap-1 border-b border-[var(--border-light)] px-4 pt-3">
            {PAYMENT_REQUEST_STATUS_OPTIONS.map((option) => {
              const active = option.value === paymentRequests.status;
              const count = paymentRequests.statusCounts[option.value];
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => switchPaymentStatus(option.value)}
                  className={
                    active
                      ? "-mb-px border-b-2 border-[var(--green)] px-3 py-2 text-[13px] font-semibold text-[var(--green-dark)]"
                      : "px-3 py-2 text-[13px] font-medium text-[var(--text-mid)] hover:text-[var(--text)]"
                  }
                >
                  {option.label}
                  <span className="ml-1.5 text-[11px] font-normal text-[var(--text-hint)]">
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-light)] px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-[10px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[var(--text-hint)]"
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
                  placeholder="Search payment requests..."
                  className="w-[240px] max-w-full rounded-[8px] border-[1.5px] border-[var(--border)] bg-[#faf9f4] py-[7px] pl-8 pr-3 text-[12.5px] text-[var(--text)] outline-none transition-colors focus:border-[var(--green-light)] focus:bg-white"
                />
              </div>
              <span className="inline-flex rounded-full border border-[var(--border-light)] bg-[#faf9f4] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-mid)]">
                {requestsCountLabel}
              </span>
            </div>
            {hasApplicationPaymentTargets || hasPostAdmissionPaymentTargets ? (
              <div className="flex flex-wrap gap-2">
                {hasApplicationPaymentTargets ? (
                  <button
                    type="button"
                    onClick={handleOpenRequestPayment}
                    disabled={isPending}
                    className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-3.5 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {hasPostAdmissionPaymentTargets
                      ? "Request application payment"
                      : "Request payment"}
                  </button>
                ) : null}
                {hasPostAdmissionPaymentTargets ? (
                  <button
                    type="button"
                    onClick={handleOpenPostAdmissionRequestPayment}
                    disabled={isPending}
                    className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[var(--green-dark)] transition-colors hover:bg-[var(--green-pale)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {hasApplicationPaymentTargets
                      ? "Request post-admission payment"
                      : "Request payment"}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {requestPaymentMessage ? (
            <p className="border-b border-[var(--border-light)] px-4 py-3 text-[12px] font-medium text-[var(--green-dark)]">
              {requestPaymentMessage}
            </p>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Due date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Sent on</th>
                  <th className="px-4 py-3">Paid on</th>
                </tr>
              </thead>
              <tbody>
                {paymentRequests.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-[var(--text-light)]"
                    >
                      {paymentRequests.search.trim()
                        ? "No payment requests match your search."
                        : paymentRequests.status === "pending"
                          ? "No pending payment requests for your assigned applications or post-admission cases."
                          : paymentRequests.status === "completed"
                            ? "No completed payment requests yet."
                            : "No payment requests sent yet for your assigned applications or post-admission cases."}
                    </td>
                  </tr>
                ) : (
                  paymentRequests.rows.map((row) => {
                    const detailHref = paymentRequestDetailHref(row);

                    function openDetail() {
                      router.push(detailHref);
                    }

                    return (
                      <tr
                        key={row.id}
                        className="cursor-pointer border-t border-[var(--border-light)] transition-colors hover:bg-[#faf9f4]"
                        onClick={openDetail}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openDetail();
                          }
                        }}
                        tabIndex={0}
                        role="link"
                        aria-label={`View payment request for ${row.studentName}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5 text-[var(--text)]">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] text-[11.5px] font-bold text-[var(--green-dark)]">
                              {row.studentInitials}
                            </span>
                            <span className="font-semibold">{row.studentName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-light)]">
                          {row.studentEmail}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-mid)]">
                          {row.kind === "post_admission"
                            ? "Post-admission"
                            : "Application"}
                        </td>
                        <td className="px-4 py-3 font-medium text-[var(--green-dark)]">
                          {row.referenceLabel}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[var(--text)]">
                          AED {row.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-light)]">
                          {formatDate(row.dueDate)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${paymentStatusClass(row.status)}`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-light)]">
                          {formatDate(row.sentAt ?? row.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-light)]">
                          {row.status === "paid" ? formatDate(row.paidAt) : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[var(--border-light)] px-4 py-3">
            <Pagination
              totalRows={paymentRequests.totalRows}
              page={paymentRequests.page}
              limit={paymentRequests.limit}
              limitOptions={PAYMENT_REQUESTS_LIMIT_OPTIONS}
              pageParam="paymentRequestsPage"
              limitParam="paymentRequestsLimit"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard
              label="Payout percentage"
              value={`${payoutPercentage}%`}
            />
            <SummaryCard
              label="Total pending"
              value={`${payouts.summary.totalPending.toLocaleString()} AED / ${payouts.summary.pendingCount} payout${payouts.summary.pendingCount === 1 ? "" : "s"}`}
            />
            <SummaryCard
              label="Total paid"
              value={`${payouts.summary.totalPaidToAdvisor.toLocaleString()} AED / ${payouts.summary.paidCount} payout${payouts.summary.paidCount === 1 ? "" : "s"}`}
            />
          </div>

          <div className="overflow-hidden rounded-[14px] border border-[var(--border-light)] bg-white">
            <div className="flex flex-wrap gap-1 border-b border-[var(--border-light)] px-4 pt-3">
              {PAYOUT_STATUS_OPTIONS.map((option) => {
                const active = option.value === payouts.status;
                const count = payouts.statusCounts[option.value];
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => switchPayoutStatus(option.value)}
                    className={
                      active
                        ? "-mb-px border-b-2 border-[var(--green)] px-3 py-2 text-[13px] font-semibold text-[var(--green-dark)]"
                        : "px-3 py-2 text-[13px] font-medium text-[var(--text-mid)] hover:text-[var(--text)]"
                    }
                  >
                    {option.label}
                    <span className="ml-1.5 text-[11px] font-normal text-[var(--text-hint)]">
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="border-b border-[var(--border-light)] px-4 py-3.5">
              <span className="inline-flex rounded-full border border-[var(--border-light)] bg-[#faf9f4] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-mid)]">
                {payouts.totalRows === 1
                  ? "1 payout"
                  : `${payouts.totalRows} payouts`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Payment (AED)</th>
                    <th className="px-4 py-3">Payout %</th>
                    <th className="px-4 py-3">Payout (AED)</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Paid at</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-10 text-center text-[var(--text-light)]"
                      >
                        {payouts.status === "pending"
                          ? "No pending payouts."
                          : payouts.status === "completed"
                            ? "No completed payouts yet."
                            : "No payouts yet. Payouts are created when students pay on requests you sent."}
                      </td>
                    </tr>
                  ) : (
                    payouts.rows.map((row) => {
                      const detailHref = payoutDetailHref(row);

                      function openDetail() {
                        router.push(detailHref);
                      }

                      return (
                        <tr
                          key={row.id}
                          className="cursor-pointer border-t border-[var(--border-light)] transition-colors hover:bg-[#faf9f4]"
                          onClick={openDetail}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openDetail();
                            }
                          }}
                          tabIndex={0}
                          role="link"
                          aria-label={`View payout for ${row.referenceLabel}`}
                        >
                          <td className="px-4 py-3 text-[var(--text-mid)]">
                            {row.kind === "post_admission"
                              ? "Post-admission"
                              : "Application"}
                          </td>
                          <td className="px-4 py-3 font-medium text-[var(--green-dark)]">
                            {row.referenceLabel}
                          </td>
                          <td className="px-4 py-3 text-[var(--text-mid)]">
                            {row.studentName ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            {row.paymentAmount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">{row.percentage}%</td>
                          <td className="px-4 py-3 font-medium">
                            {row.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${payoutStatusClass(row.status)}`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-[var(--text-mid)]">
                            {formatDateTime(row.paidAt ?? row.createdAt)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-[var(--border-light)] px-4 py-3">
              <Pagination
                totalRows={payouts.totalRows}
                page={payouts.page}
                limit={payouts.limit}
                limitOptions={PAYOUTS_LIMIT_OPTIONS}
                pageParam="payoutsPage"
                limitParam="payoutsLimit"
              />
            </div>
          </div>
        </div>
      )}

      <SendPaymentRequestDialog
        open={requestPaymentOpen}
        onClose={() => {
          if (!isPending) setRequestPaymentOpen(false);
        }}
        applicationOptions={paymentRequestApplications}
        availablePlans={availablePlans}
        senderName={advisorName}
        senderEmail={advisorEmail}
        fromEmailDisplay={fromEmailDisplay}
        onSubmit={handleSendRequestPayment}
        isSubmitting={isPending}
        error={requestPaymentError}
      />

      <SendPostAdmissionPaymentRequestDialog
        open={requestPostAdmissionPaymentOpen}
        onClose={() => {
          if (!isPending) setRequestPostAdmissionPaymentOpen(false);
        }}
        caseOptions={paymentRequestPostAdmissionCases}
        senderName={advisorName}
        senderEmail={advisorEmail}
        fromEmailDisplay={fromEmailDisplay}
        onSubmit={handleSendPostAdmissionRequestPayment}
        isSubmitting={isPending}
        error={requestPaymentError}
      />
    </div>
  );
}

"use client";

import { sendAdvisorApplicationPaymentRequest } from "@/actions/advisor-application-payments";
import { updateAdvisorApplicationStatus } from "@/actions/advisor-applications";
import type { AdvisorNewLeadsPanelProps } from "@/app/(protected)/advisor/leads/_lib/fetch-advisor-new-leads-page";
import {
  SendPaymentRequestDialog,
  type SendPaymentRequestApplicationOption,
} from "@/components/application-support/send-payment-request-dialog";
import type { SendPaymentRequestInput } from "@/lib/payment-request-email-content";
import { Pagination } from "@/components/pagination";
import { format } from "date-fns";
import { Send } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

const LEADS_LIMIT_OPTIONS = [10, 20, 50] as const;

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "d MMM yyyy");
  } catch {
    return "—";
  }
}

export function AdvisorNewLeadsTable({
  rows,
  totalRows,
  page,
  limit,
  search,
  availablePlans,
  advisorName,
  advisorEmail,
  fromEmailDisplay,
}: AdvisorNewLeadsPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(search);
  const [requestPaymentOpen, setRequestPaymentOpen] = useState(false);
  const [selectedPaymentOption, setSelectedPaymentOption] =
    useState<SendPaymentRequestApplicationOption | null>(null);
  const [requestPaymentError, setRequestPaymentError] = useState<string | null>(
    null,
  );
  const [requestPaymentMessage, setRequestPaymentMessage] = useState<
    string | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [markingNotSuitableId, setMarkingNotSuitableId] = useState<
    number | null
  >(null);

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
        next.set("leadsPage", "1");
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

  function handleOpenRequestPayment(
    option: SendPaymentRequestApplicationOption,
  ) {
    setRequestPaymentError(null);
    setSelectedPaymentOption(option);
    setRequestPaymentOpen(true);
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
      setSelectedPaymentOption(null);
      setRequestPaymentMessage(
        `Payment request for ${input.amountAed.toLocaleString()} AED sent to ${result.email}.`,
      );
      router.refresh();
    });
  }

  function openApplication(applicationId: number) {
    router.push(`/advisor/applications/${applicationId}`);
  }

  function handleMarkNotSuitable(applicationId: number) {
    setActionError(null);
    setMarkingNotSuitableId(applicationId);
    startTransition(async () => {
      const result = await updateAdvisorApplicationStatus(
        String(applicationId),
        "not_suitable",
      );
      setMarkingNotSuitableId(null);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      className={`overflow-hidden rounded-[14px] border border-[var(--border-light)] bg-white ${isPending ? "opacity-75" : ""}`}
      aria-busy={isPending}
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-light)] px-4 py-3.5">
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
            placeholder="Search new leads..."
            className="w-[240px] max-w-full rounded-[8px] border-[1.5px] border-[var(--border)] bg-[#faf9f4] py-[7px] pl-8 pr-3 text-[12.5px] text-[var(--text)] outline-none transition-colors focus:border-[var(--green-light)] focus:bg-white"
          />
        </div>
      </div>

      {requestPaymentMessage ? (
        <p className="border-b border-[var(--border-light)] px-4 py-3 text-[12px] font-medium text-[var(--green-dark)]">
          {requestPaymentMessage}
        </p>
      ) : null}

      {actionError ? (
        <p
          className="border-b border-[var(--border-light)] px-4 py-3 text-[12px] font-medium text-[#c0392b]"
          role="alert"
        >
          {actionError}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
              <th className="px-4 py-3">Student name</th>
              <th className="px-4 py-3">Student email</th>
              <th className="px-4 py-3">School</th>
              <th className="px-4 py-3">Date booked</th>
              <th className="px-4 py-3">Meeting date</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-[var(--text-light)]"
                >
                  {search.trim()
                    ? "No new leads match your search."
                    : "No new leads right now. Leads are assigned applications without payment that are not yet active."}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const canSendPayment =
                  !row.paymentRequestOption.hasPendingPaymentRequest &&
                  row.paymentRequestOption.studentEmail.trim().length > 0;

                return (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-t border-[var(--border-light)] transition-colors hover:bg-[#faf9f4]"
                    onClick={() => openApplication(row.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openApplication(row.id);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`Open application #${row.id} for ${row.studentName}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] text-[11.5px] font-bold text-[var(--green-dark)]">
                          {row.studentInitials}
                        </span>
                        <div>
                          <div className="font-semibold text-[var(--green-dark)]">
                            {row.studentName}
                          </div>
                          <div className="text-[11px] text-[var(--text-hint)]">
                            #{row.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-light)]">
                      {row.studentEmail}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-mid)]">
                      {row.schoolName}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-light)]">
                      {formatWhen(row.dateBooked)}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-light)]">
                      {formatWhen(row.meetingDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={isPending || !canSendPayment}
                          aria-label={
                            row.paymentRequestOption.hasPendingPaymentRequest
                              ? "Payment request pending"
                              : "Send payment request"
                          }
                          title={
                            row.paymentRequestOption.hasPendingPaymentRequest
                              ? "A payment request is already pending for this application"
                              : !row.paymentRequestOption.studentEmail.trim()
                                ? "Student email is required to send a payment request"
                                : "Send payment request"
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenRequestPayment(row.paymentRequestOption);
                          }}
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] border border-[#e0deda] bg-white text-[var(--green-dark)] transition-colors hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Send
                            className="h-4 w-4"
                            strokeWidth={2.25}
                            aria-hidden
                          />
                        </button>
                        <button
                          type="button"
                          disabled={
                            isPending || markingNotSuitableId === row.id
                          }
                          aria-label="Mark as not suitable"
                          title="Mark as not suitable"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleMarkNotSuitable(row.id);
                          }}
                          className="cursor-pointer rounded-[8px] border border-[#f0c4c4] bg-[#FCEBEB] px-3 py-1.5 text-[11.5px] font-semibold text-[#8c2d22] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {markingNotSuitableId === row.id
                            ? "Updating..."
                            : "Mark as not suitable"}
                        </button>
                      </div>
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
          totalRows={totalRows}
          page={page}
          limit={limit}
          limitOptions={LEADS_LIMIT_OPTIONS}
          pageParam="leadsPage"
          limitParam="leadsLimit"
        />
      </div>

      {selectedPaymentOption ? (
        <SendPaymentRequestDialog
          open={requestPaymentOpen}
          onClose={() => {
            if (!isPending) {
              setRequestPaymentOpen(false);
              setSelectedPaymentOption(null);
            }
          }}
          fixedApplication={selectedPaymentOption}
          availablePlans={availablePlans}
          senderName={advisorName}
          senderEmail={advisorEmail}
          fromEmailDisplay={fromEmailDisplay}
          onSubmit={handleSendRequestPayment}
          isSubmitting={isPending}
          error={requestPaymentError}
        />
      ) : null}
    </div>
  );
}

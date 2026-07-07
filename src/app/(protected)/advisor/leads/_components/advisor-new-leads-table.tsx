"use client";

import { sendAdvisorApplicationPaymentRequest } from "@/actions/advisor-application-payments";
import { sendAdvisorPostAdmissionPaymentRequest } from "@/actions/advisor-post-admission-payments";
import { updateAdvisorApplicationStatus } from "@/actions/advisor-applications";
import { updateAdvisorPostAdmissionStatus } from "@/actions/advisor-post-admission";
import type { AdvisorNewLeadsPanelProps } from "@/app/(protected)/advisor/leads/_lib/fetch-advisor-new-leads-page";
import {
  SendPaymentRequestDialog,
  type SendPaymentRequestApplicationOption,
} from "@/components/application-support/send-payment-request-dialog";
import {
  SendPostAdmissionPaymentRequestDialog,
  type PostAdmissionSendPaymentRequestInput,
} from "@/components/post-admission-support/send-post-admission-payment-request-dialog";
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

function kindLabel(kind: "application" | "post_admission"): string {
  return kind === "application" ? "Application" : "Post-admission";
}

function kindBadgeClass(kind: "application" | "post_admission"): string {
  return kind === "application"
    ? "bg-[#FCEBEB] text-[#A32D2D]"
    : "bg-[#DCFCE7] text-[#166534]";
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
  const [applicationPaymentOpen, setApplicationPaymentOpen] = useState(false);
  const [postAdmissionPaymentOpen, setPostAdmissionPaymentOpen] = useState(false);
  const [selectedApplicationPayment, setSelectedApplicationPayment] =
    useState<SendPaymentRequestApplicationOption | null>(null);
  const [selectedPostAdmissionPayment, setSelectedPostAdmissionPayment] =
    useState<AdvisorNewLeadsPanelProps["rows"][number] | null>(null);
  const [requestPaymentError, setRequestPaymentError] = useState<string | null>(
    null,
  );
  const [requestPaymentMessage, setRequestPaymentMessage] = useState<
    string | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [markingNotSuitableKey, setMarkingNotSuitableKey] = useState<
    string | null
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

  function openLead(row: AdvisorNewLeadsPanelProps["rows"][number]) {
    if (row.kind === "application") {
      router.push(`/advisor/applications/${row.id}`);
    } else {
      router.push(`/advisor/post-admission/${row.id}`);
    }
  }

  function handleOpenRequestPayment(row: AdvisorNewLeadsPanelProps["rows"][number]) {
    setRequestPaymentError(null);
    if (row.kind === "application") {
      setSelectedApplicationPayment(row.paymentRequestOption);
      setApplicationPaymentOpen(true);
    } else {
      setSelectedPostAdmissionPayment(row);
      setPostAdmissionPaymentOpen(true);
    }
  }

  function handleSendApplicationPayment(input: SendPaymentRequestInput) {
    setRequestPaymentError(null);
    startTransition(async () => {
      const result = await sendAdvisorApplicationPaymentRequest(input);
      if (!result.ok) {
        setRequestPaymentError(result.error);
        return;
      }
      setApplicationPaymentOpen(false);
      setSelectedApplicationPayment(null);
      setRequestPaymentMessage(
        `Payment request for ${input.amountAed.toLocaleString()} AED sent to ${result.email}.`,
      );
      router.refresh();
    });
  }

  function handleSendPostAdmissionPayment(input: PostAdmissionSendPaymentRequestInput) {
    setRequestPaymentError(null);
    startTransition(async () => {
      const result = await sendAdvisorPostAdmissionPaymentRequest(input);
      if (!result.ok) {
        setRequestPaymentError(result.error);
        return;
      }
      setPostAdmissionPaymentOpen(false);
      setSelectedPostAdmissionPayment(null);
      setRequestPaymentMessage(
        `Payment request for ${input.amountAed.toLocaleString()} AED sent to ${result.email}.`,
      );
      router.refresh();
    });
  }

  function handleMarkNotSuitable(row: AdvisorNewLeadsPanelProps["rows"][number]) {
    const key = `${row.kind}:${row.id}`;
    setActionError(null);
    setMarkingNotSuitableKey(key);
    startTransition(async () => {
      const result =
        row.kind === "application"
          ? await updateAdvisorApplicationStatus(String(row.id), "not_suitable")
          : await updateAdvisorPostAdmissionStatus(row.id, "not_suitable");
      setMarkingNotSuitableKey(null);
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
        <table className="w-full min-w-[1060px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
              <th className="px-4 py-3">Type</th>
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
                  colSpan={7}
                  className="px-4 py-10 text-center text-[var(--text-light)]"
                >
                  {search.trim()
                    ? "No new leads match your search."
                    : "No new leads right now."}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const canSendPayment =
                  !row.paymentRequestOption.hasPendingPaymentRequest &&
                  row.paymentRequestOption.studentEmail.trim().length > 0;
                const rowKey = `${row.kind}:${row.id}`;

                return (
                  <tr
                    key={rowKey}
                    className="cursor-pointer border-t border-[var(--border-light)] transition-colors hover:bg-[#faf9f4]"
                    onClick={() => openLead(row)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openLead(row);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`Open ${kindLabel(row.kind)} #${row.id} for ${row.studentName}`}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${kindBadgeClass(row.kind)}`}
                      >
                        {kindLabel(row.kind)}
                      </span>
                    </td>
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
                          aria-label="Send payment request"
                          title={
                            row.paymentRequestOption.hasPendingPaymentRequest
                              ? "A payment request is already pending"
                              : !row.paymentRequestOption.studentEmail.trim()
                                ? "Student email is required"
                                : "Send payment request"
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenRequestPayment(row);
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
                          disabled={isPending || markingNotSuitableKey === rowKey}
                          aria-label="Mark as not suitable"
                          title="Mark as not suitable"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleMarkNotSuitable(row);
                          }}
                          className="cursor-pointer rounded-[8px] border border-[#f0c4c4] bg-[#FCEBEB] px-3 py-1.5 text-[11.5px] font-semibold text-[#8c2d22] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {markingNotSuitableKey === rowKey
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

      {selectedApplicationPayment ? (
        <SendPaymentRequestDialog
          open={applicationPaymentOpen}
          onClose={() => {
            if (!isPending) {
              setApplicationPaymentOpen(false);
              setSelectedApplicationPayment(null);
            }
          }}
          fixedApplication={selectedApplicationPayment}
          availablePlans={availablePlans}
          senderName={advisorName}
          senderEmail={advisorEmail}
          fromEmailDisplay={fromEmailDisplay}
          onSubmit={handleSendApplicationPayment}
          isSubmitting={isPending}
          error={requestPaymentError}
        />
      ) : null}

      {selectedPostAdmissionPayment?.kind === "post_admission" ? (
        <SendPostAdmissionPaymentRequestDialog
          key={selectedPostAdmissionPayment.paymentRequestOption.caseId}
          open={postAdmissionPaymentOpen}
          onClose={() => {
            if (!isPending) {
              setPostAdmissionPaymentOpen(false);
              setSelectedPostAdmissionPayment(null);
            }
          }}
          fixedCase={selectedPostAdmissionPayment.paymentRequestOption}
          senderName={advisorName}
          senderEmail={advisorEmail}
          fromEmailDisplay={fromEmailDisplay}
          onSubmit={handleSendPostAdmissionPayment}
          isSubmitting={isPending}
          error={requestPaymentError}
        />
      ) : null}
    </div>
  );
}

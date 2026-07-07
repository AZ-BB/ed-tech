"use client";

import {
  buildPostAdmissionPaymentRequestEmailBody,
  POST_ADMISSION_PAYMENT_REQUEST_EMAIL_SUBJECT,
} from "@/lib/post-admission-payment-request-email-content";
import {
  defaultPaymentDueDateString,
  todayDateString,
} from "@/lib/payment-request-utils";
import { useEffect, useMemo, useState } from "react";

const fontSerif = '"DM Serif Display", Georgia, serif' as const;

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 viewBox=%220 0 10 6%22 fill=%22none%22%3E%3Cpath d=%22M1 1l4 4 4-4%22 stroke=%22%236a6a6a%22 stroke-width=%221.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E")';

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C] disabled:cursor-not-allowed disabled:opacity-60";

const selectClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none appearance-none bg-[length:10px_6px] bg-[position:right_12px_center] bg-no-repeat pr-9 transition-colors focus:border-[#40916C] disabled:cursor-not-allowed disabled:opacity-60";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

export type PostAdmissionSendPaymentRequestInput = {
  caseId: number;
  amountAed: number;
  dueDate: string;
  emailBody: string;
  internalNote?: string | null;
};

export type SendPostAdmissionPaymentRequestOption = {
  caseId: number;
  studentName: string;
  studentFirstName: string;
  studentEmail: string;
  hasPendingPaymentRequest: boolean;
  pendingPaymentAmountAed: number | null;
  pendingPaymentDueDate: string | null;
  label: string;
};

export type SendPostAdmissionPaymentRequestDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: PostAdmissionSendPaymentRequestInput) => void;
  isSubmitting: boolean;
  error: string | null;
  senderName: string;
  senderEmail?: string;
  fromEmailDisplay: string;
  /** List mode: multiple assigned cases */
  caseOptions?: SendPostAdmissionPaymentRequestOption[];
  /** Single mode: fixed case */
  fixedCase?: SendPostAdmissionPaymentRequestOption;
  /** @deprecated Use fixedCase instead */
  caseId?: number;
  /** @deprecated Use fixedCase instead */
  studentName?: string;
  /** @deprecated Use fixedCase instead */
  studentFirstName?: string;
  /** @deprecated Use fixedCase instead */
  studentEmail?: string;
  /** @deprecated Use fixedCase instead */
  hasPendingPaymentRequest?: boolean;
  /** @deprecated Use fixedCase instead */
  pendingPaymentAmountAed?: number | null;
  /** @deprecated Use fixedCase instead */
  pendingPaymentDueDate?: string | null;
};

function resolveSelectedCaseOption(
  caseOptions: SendPostAdmissionPaymentRequestOption[] | undefined,
  fixedCase: SendPostAdmissionPaymentRequestOption | undefined,
  selectedCaseId: string,
): SendPostAdmissionPaymentRequestOption | null {
  if (fixedCase) return fixedCase;
  if (!caseOptions?.length || !selectedCaseId) return null;
  return (
    caseOptions.find(
      (option) => option.caseId === Number.parseInt(selectedCaseId, 10),
    ) ?? null
  );
}

function buildLegacyFixedCase(
  props: Pick<
    SendPostAdmissionPaymentRequestDialogProps,
    | "fixedCase"
    | "caseId"
    | "studentName"
    | "studentFirstName"
    | "studentEmail"
    | "hasPendingPaymentRequest"
    | "pendingPaymentAmountAed"
    | "pendingPaymentDueDate"
  >,
): SendPostAdmissionPaymentRequestOption | undefined {
  if (props.fixedCase) return props.fixedCase;
  if (props.caseId == null) return undefined;
  const studentName = props.studentName?.trim() || "Student";
  return {
    caseId: props.caseId,
    studentName,
    studentFirstName: props.studentFirstName?.trim() || studentName.split(/\s+/)[0] || "Student",
    studentEmail: props.studentEmail?.trim() || "",
    hasPendingPaymentRequest: props.hasPendingPaymentRequest ?? false,
    pendingPaymentAmountAed: props.pendingPaymentAmountAed ?? null,
    pendingPaymentDueDate: props.pendingPaymentDueDate ?? null,
    label: `${studentName} — Post-admission #${props.caseId}`,
  };
}

export function SendPostAdmissionPaymentRequestDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  senderName,
  senderEmail = "",
  fromEmailDisplay,
  caseOptions,
  fixedCase: fixedCaseProp,
  caseId,
  studentName,
  studentFirstName,
  studentEmail,
  hasPendingPaymentRequest,
  pendingPaymentAmountAed,
  pendingPaymentDueDate,
}: SendPostAdmissionPaymentRequestDialogProps) {
  const fixedCase = useMemo(
    () =>
      buildLegacyFixedCase({
        fixedCase: fixedCaseProp,
        caseId,
        studentName,
        studentFirstName,
        studentEmail,
        hasPendingPaymentRequest,
        pendingPaymentAmountAed,
        pendingPaymentDueDate,
      }),
    [
      fixedCaseProp,
      caseId,
      studentName,
      studentFirstName,
      studentEmail,
      hasPendingPaymentRequest,
      pendingPaymentAmountAed,
      pendingPaymentDueDate,
    ],
  );

  const isListMode = !fixedCase && (caseOptions?.length ?? 0) > 0;

  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(defaultPaymentDueDateString());
  const [internalNote, setInternalNote] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailBodyCustomized, setEmailBodyCustomized] = useState(false);

  const selectedOption = useMemo(
    () => resolveSelectedCaseOption(caseOptions, fixedCase, selectedCaseId),
    [caseOptions, fixedCase, selectedCaseId],
  );

  const parsedAmount = Number.parseFloat(amount.trim());
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const hasStudentEmail = (selectedOption?.studentEmail.trim() ?? "") !== "";
  const hasPendingPaymentRequestActive =
    selectedOption?.hasPendingPaymentRequest ?? false;

  const fieldsLocked =
    !selectedOption || hasPendingPaymentRequestActive || !hasStudentEmail;

  const submitDisabled =
    fieldsLocked || !amountValid || !dueDate.trim() || !emailBody.trim();

  const defaultEmailBody = useMemo(() => {
    if (!selectedOption) return "";
    return buildPostAdmissionPaymentRequestEmailBody(
      {
        studentFirstName: selectedOption.studentFirstName,
        amountAed: amountValid ? parsedAmount : 0,
        dueDate,
        payUrl: "",
        senderName,
        recipientEmail: selectedOption.studentEmail,
        fromEmailDisplay,
      },
      { usePlaceholderLink: true, amountPending: !amountValid },
    );
  }, [
    selectedOption,
    amountValid,
    parsedAmount,
    dueDate,
    senderName,
    fromEmailDisplay,
  ]);

  useEffect(() => {
    if (!open) return;

    setDueDate(defaultPaymentDueDateString());
    setInternalNote("");
    setEmailBodyCustomized(false);
    setEmailBody("");

    if (fixedCase) {
      setSelectedCaseId(String(fixedCase.caseId));
      setAmount("");
      return;
    }

    setSelectedCaseId("");
    setAmount("");
  }, [open, fixedCase?.caseId]);

  useEffect(() => {
    if (!open) return;
    if (emailBodyCustomized) return;
    setEmailBody(defaultEmailBody);
  }, [open, defaultEmailBody, emailBodyCustomized]);

  useEffect(() => {
    if (!open || !selectedOption) return;
    setEmailBodyCustomized(false);
  }, [open, selectedOption?.caseId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, isSubmitting]);

  if (!open) return null;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOption || submitDisabled) return;

    onSubmit({
      caseId: selectedOption.caseId,
      amountAed: parsedAmount,
      dueDate,
      emailBody: emailBody.trim(),
      internalNote: internalNote.trim() || null,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(27,67,50,0.4)] p-5 backdrop-blur-[3px]"
      onClick={isSubmitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-post-admission-payment-title"
        className="flex max-h-[92vh] w-full max-w-[780px] flex-col overflow-hidden rounded-[14px] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-light)] px-6 py-5">
          <h2
            id="send-post-admission-payment-title"
            className="text-[20px] text-[var(--text)]"
            style={{ fontFamily: fontSerif }}
          >
            Send payment request
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="cursor-pointer rounded-[6px] p-1.5 text-[var(--text-light)] transition-colors hover:bg-[var(--cream)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="flex-1 overflow-y-auto px-6 py-[22px]">
            <div className="space-y-4">
              {isListMode ? (
                <div>
                  <label htmlFor="pa-payment-case" className={labelClassName}>
                    Student
                  </label>
                  <select
                    id="pa-payment-case"
                    style={{ backgroundImage: SELECT_CHEVRON }}
                    className={selectClassName}
                    value={selectedCaseId}
                    disabled={isSubmitting}
                    onChange={(event) => setSelectedCaseId(event.target.value)}
                  >
                    <option value="">Select student</option>
                    {caseOptions?.map((option) => (
                      <option key={option.caseId} value={String(option.caseId)}>
                        {option.label}
                        {option.hasPendingPaymentRequest ? " (Pending payment)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {selectedOption ? (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="pa-payment-student-name" className={labelClassName}>
                        Student
                      </label>
                      <input
                        id="pa-payment-student-name"
                        readOnly
                        value={selectedOption.studentName}
                        className={`${inputClassName} bg-[#faf9f4]`}
                      />
                    </div>
                    <div>
                      <label htmlFor="pa-payment-recipient-email" className={labelClassName}>
                        Recipient email
                      </label>
                      <input
                        id="pa-payment-recipient-email"
                        readOnly
                        type="email"
                        value={selectedOption.studentEmail}
                        className={`${inputClassName} bg-[#faf9f4]`}
                      />
                    </div>
                  </div>

                  {hasPendingPaymentRequestActive ? (
                    <p className="text-[12px] font-medium text-[#E67E22]" role="status">
                      There is already a pending payment request
                      {selectedOption.pendingPaymentAmountAed != null
                        ? ` for AED ${selectedOption.pendingPaymentAmountAed.toLocaleString()}`
                        : ""}
                      {selectedOption.pendingPaymentDueDate
                        ? ` (due ${new Date(`${selectedOption.pendingPaymentDueDate}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })})`
                        : ""}
                      .
                    </p>
                  ) : null}

                  {!hasStudentEmail ? (
                    <p className="text-[12px] font-medium text-[#E74C3C]" role="alert">
                      This case has no student email on file.
                    </p>
                  ) : null}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="pa-payment-amount" className={labelClassName}>
                        Amount (AED)
                      </label>
                      <input
                        id="pa-payment-amount"
                        type="number"
                        min={1}
                        step="0.01"
                        required
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        className={inputClassName}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label htmlFor="pa-payment-due-date" className={labelClassName}>
                        Due date
                      </label>
                      <input
                        id="pa-payment-due-date"
                        type="date"
                        required
                        value={dueDate}
                        min={todayDateString()}
                        onChange={(event) => setDueDate(event.target.value)}
                        className={inputClassName}
                        disabled={isSubmitting || fieldsLocked}
                      />
                    </div>
                  </div>

                  {amount.trim() !== "" && !amountValid ? (
                    <p className="text-[12px] text-[#E74C3C]">
                      Enter a valid amount greater than 0.
                    </p>
                  ) : null}

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label htmlFor="pa-payment-email-body" className={labelClassName}>
                        Email message
                      </label>
                      {emailBodyCustomized ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEmailBodyCustomized(false);
                            setEmailBody(defaultEmailBody);
                          }}
                          disabled={isSubmitting || fieldsLocked || !defaultEmailBody}
                          className="cursor-pointer text-[11px] font-semibold text-[var(--green)] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reset to template
                        </button>
                      ) : null}
                    </div>
                    <div className="rounded-[8px] border border-[var(--border-light)] bg-[var(--cream)] px-[18px] py-4">
                      <div className="mb-1.5 text-[12px]">
                        <b className="inline-block min-w-[60px] text-[var(--text)]">To:</b>{" "}
                        {selectedOption.studentEmail || "—"}
                      </div>
                      <div className="mb-1.5 text-[12px]">
                        <b className="inline-block min-w-[60px] text-[var(--text)]">From:</b>{" "}
                        {senderName} &lt;{senderEmail || fromEmailDisplay}&gt;
                      </div>
                      <div className="mb-3 text-[12px]">
                        <b className="inline-block min-w-[60px] text-[var(--text)]">Subject:</b>{" "}
                        {POST_ADMISSION_PAYMENT_REQUEST_EMAIL_SUBJECT}
                      </div>
                      <textarea
                        id="pa-payment-email-body"
                        rows={10}
                        value={emailBody}
                        onChange={(event) => {
                          setEmailBody(event.target.value);
                          setEmailBodyCustomized(true);
                        }}
                        placeholder="Complete the form above to preview the email."
                        className={`${inputClassName} min-h-[200px] resize-y bg-white leading-relaxed`}
                        disabled={isSubmitting || fieldsLocked}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="pa-payment-internal-note" className={labelClassName}>
                      Advisor note (optional, internal)
                    </label>
                    <input
                      id="pa-payment-internal-note"
                      type="text"
                      value={internalNote}
                      onChange={(event) => setInternalNote(event.target.value)}
                      placeholder="Anything to record for the team"
                      className={inputClassName}
                      disabled={isSubmitting}
                    />
                  </div>
                </>
              ) : isListMode ? (
                <p className="text-[13px] text-[var(--text-light)]">
                  Select a student to continue.
                </p>
              ) : null}
            </div>

            {error ? (
              <p className="mt-4 text-[12px] font-medium text-[#E74C3C]" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 border-t border-[var(--border-light)] bg-[var(--cream)] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[13px] font-semibold text-[#4a4a4a] transition-colors hover:bg-[#faf9f4] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || submitDisabled}
              className="inline-flex cursor-pointer items-center gap-2 rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              {isSubmitting ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

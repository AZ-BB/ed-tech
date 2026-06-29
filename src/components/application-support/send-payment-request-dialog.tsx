"use client";

import type { ApplicationPlanCatalogRow } from "@/lib/applications-plans";
import {
  buildPaymentRequestEmailBody,
  PAYMENT_REQUEST_EMAIL_SUBJECT,
  type SendPaymentRequestInput,
} from "@/lib/payment-request-email-content";
import {
  defaultPaymentDueDateString,
  formatPlanDisplayName,
  formatPlanSelectLabel,
  isCustomApplicationPlan,
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

export type SendPaymentRequestApplicationOption = {
  applicationId: number;
  planId: number;
  studentName: string;
  studentFirstName: string;
  studentEmail: string;
  planPrice: number;
  universitiesTotal: number;
  totalPaid: number;
  /** Sum of all payment amounts on this application (any status). */
  totalPaymentsAed: number;
  hasPendingPaymentRequest: boolean;
  label: string;
};

export type SendPaymentRequestDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: SendPaymentRequestInput) => void;
  isSubmitting: boolean;
  error: string | null;
  availablePlans: ApplicationPlanCatalogRow[];
  senderName: string;
  senderEmail: string;
  fromEmailDisplay: string;
  /** List mode: multiple applications */
  applicationOptions?: SendPaymentRequestApplicationOption[];
  /** Single mode: fixed application */
  fixedApplication?: SendPaymentRequestApplicationOption;
};

function resolveSelectedOption(
  applicationOptions: SendPaymentRequestApplicationOption[] | undefined,
  fixedApplication: SendPaymentRequestApplicationOption | undefined,
  selectedApplicationId: string,
): SendPaymentRequestApplicationOption | null {
  if (fixedApplication) return fixedApplication;
  if (!applicationOptions?.length || !selectedApplicationId) return null;
  return (
    applicationOptions.find(
      (option) => option.applicationId === Number.parseInt(selectedApplicationId, 10),
    ) ?? null
  );
}

export function SendPaymentRequestDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  availablePlans,
  senderName,
  senderEmail,
  fromEmailDisplay,
  applicationOptions,
  fixedApplication,
}: SendPaymentRequestDialogProps) {
  const isListMode = !fixedApplication && (applicationOptions?.length ?? 0) > 0;

  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [amount, setAmount] = useState("");
  const [customUniversitiesCount, setCustomUniversitiesCount] = useState("");
  const [dueDate, setDueDate] = useState(defaultPaymentDueDateString());
  const [internalNote, setInternalNote] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailBodyCustomized, setEmailBodyCustomized] = useState(false);

  const selectedOption = useMemo(
    () =>
      resolveSelectedOption(applicationOptions, fixedApplication, selectedApplicationId),
    [applicationOptions, fixedApplication, selectedApplicationId],
  );

  const selectedPlan = useMemo(() => {
    const planId = Number.parseInt(selectedPlanId, 10);
    if (!Number.isFinite(planId)) return null;
    return availablePlans.find((plan) => plan.id === planId) ?? null;
  }, [availablePlans, selectedPlanId]);

  const isCustomPlan = selectedPlan ? isCustomApplicationPlan(selectedPlan) : false;

  const parsedCustomCount = Number.parseInt(customUniversitiesCount.trim(), 10);
  const customCountValid =
    !isCustomPlan || (Number.isFinite(parsedCustomCount) && parsedCustomCount >= 1);

  const parsedAmount = Number.parseFloat(amount.trim());
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;

  const hasStudentEmail = (selectedOption?.studentEmail.trim() ?? "") !== "";
  const hasPendingPaymentRequest = selectedOption?.hasPendingPaymentRequest ?? false;

  /** Locks fields when the application cannot receive a request — not when plan is unselected yet. */
  const fieldsLocked =
    !selectedOption || hasPendingPaymentRequest || !hasStudentEmail;

  const submitDisabled =
    fieldsLocked ||
    !selectedPlan ||
    !amountValid ||
    !customCountValid ||
    !dueDate.trim() ||
    !emailBody.trim();

  function initializeFromOption(option: SendPaymentRequestApplicationOption) {
    setSelectedPlanId(String(option.planId));
    const plan = availablePlans.find((p) => p.id === option.planId);
    if (plan && !isCustomApplicationPlan(plan)) {
      setAmount(String(plan.price));
    } else {
      setAmount("");
    }
    setCustomUniversitiesCount(
      option.universitiesTotal > 0 ? String(option.universitiesTotal) : "",
    );
  }

  useEffect(() => {
    if (!open) return;

    setDueDate(defaultPaymentDueDateString());
    setInternalNote("");
    setEmailBodyCustomized(false);
    setEmailBody("");

    if (fixedApplication) {
      setSelectedApplicationId(String(fixedApplication.applicationId));
      initializeFromOption(fixedApplication);
      return;
    }

    setSelectedApplicationId("");
    setSelectedPlanId("");
    setAmount("");
    setCustomUniversitiesCount("");
  }, [open, fixedApplication, availablePlans]);

  useEffect(() => {
    if (!open || fixedApplication || !selectedOption) return;
    initializeFromOption(selectedOption);
  }, [open, fixedApplication, selectedOption, availablePlans]);

  const packageDisplayName = useMemo(() => {
    if (!selectedPlan) return "";
    return formatPlanDisplayName(
      selectedPlan,
      isCustomPlan ? parsedCustomCount : null,
    );
  }, [selectedPlan, isCustomPlan, parsedCustomCount]);

  const defaultEmailBody = useMemo(() => {
    if (!selectedOption || !selectedPlan || !amountValid) return "";
    return buildPaymentRequestEmailBody(
      {
        studentFirstName: selectedOption.studentFirstName,
        packageDisplayName,
        amountAed: parsedAmount,
        payUrl: "",
        senderName,
        recipientEmail: selectedOption.studentEmail,
        fromEmailDisplay,
      },
      { usePlaceholderLink: true },
    );
  }, [
    selectedOption,
    selectedPlan,
    amountValid,
    packageDisplayName,
    parsedAmount,
    senderName,
    fromEmailDisplay,
  ]);

  useEffect(() => {
    if (!open) return;
    if (emailBodyCustomized) return;
    setEmailBody(defaultEmailBody);
  }, [open, defaultEmailBody, emailBodyCustomized]);

  useEffect(() => {
    if (!open || !selectedOption) return;
    setEmailBodyCustomized(false);
  }, [open, selectedOption?.applicationId]);

  useEffect(() => {
    if (!selectedPlan || isCustomApplicationPlan(selectedPlan)) return;
    setAmount(String(selectedPlan.price));
  }, [selectedPlan]);

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
    if (!selectedOption || !selectedPlan || submitDisabled) {
      return;
    }

    onSubmit({
      applicationId: selectedOption.applicationId,
      planId: selectedPlan.id,
      amountAed: parsedAmount,
      dueDate,
      emailBody: emailBody.trim(),
      customUniversitiesCount: isCustomPlan ? parsedCustomCount : null,
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
        aria-labelledby="send-payment-request-title"
        className="flex max-h-[92vh] w-full max-w-[780px] flex-col overflow-hidden rounded-[14px] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-light)] px-6 py-5">
          <h2
            id="send-payment-request-title"
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
                  <label htmlFor="payment-application" className={labelClassName}>
                    Student — application
                  </label>
                  <select
                    id="payment-application"
                    style={{ backgroundImage: SELECT_CHEVRON }}
                    className={selectClassName}
                    value={selectedApplicationId}
                    disabled={isSubmitting}
                    onChange={(event) => setSelectedApplicationId(event.target.value)}
                  >
                    <option value="">Select student — application</option>
                    {applicationOptions?.map((option) => (
                      <option key={option.applicationId} value={String(option.applicationId)}>
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
                      <label htmlFor="payment-student-name" className={labelClassName}>
                        Student
                      </label>
                      <input
                        id="payment-student-name"
                        readOnly
                        value={selectedOption.studentName}
                        className={`${inputClassName} bg-[#faf9f4]`}
                      />
                    </div>
                    <div>
                      <label htmlFor="payment-recipient-email" className={labelClassName}>
                        Recipient email
                      </label>
                      <input
                        id="payment-recipient-email"
                        readOnly
                        type="email"
                        value={selectedOption.studentEmail}
                        className={`${inputClassName} bg-[#faf9f4]`}
                      />
                    </div>
                  </div>

                  {hasPendingPaymentRequest ? (
                    <p className="text-[12px] font-medium text-[#E67E22]" role="status">
                      This application already has a pending payment request.
                    </p>
                  ) : null}

                  {!hasStudentEmail ? (
                    <p className="text-[12px] font-medium text-[#E74C3C]" role="alert">
                      This application has no student email on file.
                    </p>
                  ) : null}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="payment-package" className={labelClassName}>
                        Package
                      </label>
                      <select
                        id="payment-package"
                        style={{ backgroundImage: SELECT_CHEVRON }}
                        className={selectClassName}
                        value={selectedPlanId}
                        disabled={isSubmitting || fieldsLocked}
                        onChange={(event) => setSelectedPlanId(event.target.value)}
                      >
                        <option value="">Select package</option>
                        {availablePlans.map((plan) => (
                          <option key={plan.id} value={String(plan.id)}>
                            {formatPlanSelectLabel(plan)}
                          </option>
                        ))}
                      </select>
                    </div>
                    {isCustomPlan ? (
                      <div>
                        <label htmlFor="payment-custom-universities" className={labelClassName}>
                          Number of universities
                        </label>
                        <input
                          id="payment-custom-universities"
                          type="number"
                          min={1}
                          step={1}
                          required
                          value={customUniversitiesCount}
                          onChange={(event) => setCustomUniversitiesCount(event.target.value)}
                          className={inputClassName}
                          disabled={isSubmitting || fieldsLocked}
                        />
                      </div>
                    ) : (
                      <div />
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="payment-amount" className={labelClassName}>
                        Amount (AED)
                      </label>
                      <input
                        id="payment-amount"
                        type="number"
                        min={1}
                        step="0.01"
                        required
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        className={inputClassName}
                        disabled={isSubmitting}
                      />
                      {selectedOption.totalPaymentsAed > 0 ? (
                        <p className="mt-1 text-[11px] text-[var(--text-light)]">
                          Total of all payments on this application:{" "}
                          <span className="font-semibold text-[var(--text-mid)]">
                            {selectedOption.totalPaymentsAed.toLocaleString()} AED
                          </span>
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <label htmlFor="payment-due-date" className={labelClassName}>
                        Due date
                      </label>
                      <input
                        id="payment-due-date"
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

                  {isCustomPlan && customUniversitiesCount.trim() !== "" && !customCountValid ? (
                    <p className="text-[12px] text-[#E74C3C]">
                      Enter at least 1 university for the custom package.
                    </p>
                  ) : null}

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label htmlFor="payment-email-body" className={labelClassName}>
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
                        {PAYMENT_REQUEST_EMAIL_SUBJECT}
                      </div>
                      <textarea
                        id="payment-email-body"
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
                    <label htmlFor="payment-internal-note" className={labelClassName}>
                      Advisor note (optional, internal)
                    </label>
                    <input
                      id="payment-internal-note"
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
                  Select a student application to continue.
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

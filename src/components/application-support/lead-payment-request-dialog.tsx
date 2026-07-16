"use client";

import type {
  LeadApplicationPaymentEmailInput,
  LeadApplicationPaymentLinkInput,
} from "@/lib/lead-application-payment-types";
import {
  buildPaymentRequestEmailBody,
  PAYMENT_REQUEST_EMAIL_SUBJECT,
} from "@/lib/payment-request-email-content";
import { Check, Copy } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

const fontSerif = '"DM Serif Display", Georgia, serif' as const;

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 viewBox=%220 0 10 6%22 fill=%22none%22%3E%3Cpath d=%22M1 1l4 4 4-4%22 stroke=%22%236a6a6a%22 stroke-width=%221.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E")';

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C] disabled:cursor-not-allowed disabled:opacity-60";

const selectClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none appearance-none bg-[length:10px_6px] bg-[position:right_12px_center] bg-no-repeat pr-9 transition-colors focus:border-[#40916C] disabled:cursor-not-allowed disabled:opacity-60";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

type TabId = "payment_link" | "send_email";

export type LeadPaymentRequestApplicationOption = {
  applicationId: number;
  studentName: string;
  studentEmail: string;
  label: string;
};

function formatUniversitiesPackageName(universitiesCount: number): string {
  return `${universitiesCount}-University Application Package`;
}

function firstNameFromDisplayName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first || "there";
}

export type LeadPaymentRequestDialogProps = {
  open: boolean;
  onClose: () => void;
  senderName: string;
  senderEmail: string;
  fromEmailDisplay: string;
  isSubmitting: boolean;
  error: string | null;
  generatedPayUrl: string | null;
  onGenerateLink: (input: LeadApplicationPaymentLinkInput) => void;
  onSendEmail: (input: LeadApplicationPaymentEmailInput) => void;
  /** Fixed application (leads row). */
  applicationId?: number;
  studentName?: string;
  studentEmail?: string;
  /** List mode (payments page). */
  applicationOptions?: LeadPaymentRequestApplicationOption[];
};

export function LeadPaymentRequestDialog({
  open,
  onClose,
  applicationId: fixedApplicationId,
  studentName: fixedStudentName,
  studentEmail: fixedStudentEmail,
  applicationOptions,
  senderName,
  senderEmail,
  fromEmailDisplay,
  isSubmitting,
  error,
  generatedPayUrl,
  onGenerateLink,
  onSendEmail,
}: LeadPaymentRequestDialogProps) {
  const isListMode = (applicationOptions?.length ?? 0) > 0;

  const [tab, setTab] = useState<TabId>("payment_link");
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [amount, setAmount] = useState("");
  const [universitiesCount, setUniversitiesCount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailBodyCustomized, setEmailBodyCustomized] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedOption = useMemo(() => {
    if (!isListMode || !applicationOptions) return null;
    const id = Number.parseInt(selectedApplicationId, 10);
    if (!Number.isFinite(id)) return null;
    return (
      applicationOptions.find((option) => option.applicationId === id) ?? null
    );
  }, [isListMode, applicationOptions, selectedApplicationId]);

  const applicationId = isListMode
    ? selectedOption?.applicationId ?? null
    : fixedApplicationId ?? null;
  const studentName = isListMode
    ? selectedOption?.studentName ?? ""
    : fixedStudentName ?? "";
  const studentEmail = isListMode
    ? selectedOption?.studentEmail ?? ""
    : fixedStudentEmail ?? "";

  const parsedUniversitiesCount = Number.parseInt(universitiesCount.trim(), 10);
  const universitiesCountValid =
    Number.isFinite(parsedUniversitiesCount) && parsedUniversitiesCount >= 1;

  const parsedAmount = Number.parseFloat(amount.trim());
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim());
  const nameValid = recipientName.trim().length > 0;
  const hasApplication = applicationId != null && applicationId > 0;

  const linkSubmitDisabled =
    !hasApplication ||
    !amountValid ||
    !universitiesCountValid ||
    isSubmitting ||
    Boolean(generatedPayUrl);

  const emailSubmitDisabled =
    !hasApplication ||
    !amountValid ||
    !universitiesCountValid ||
    !emailValid ||
    !nameValid ||
    !emailBody.trim() ||
    isSubmitting;

  const defaultEmailBody = useMemo(() => {
    const packageDisplayName = universitiesCountValid
      ? formatUniversitiesPackageName(parsedUniversitiesCount)
      : "Application Support Package";

    return buildPaymentRequestEmailBody(
      {
        studentFirstName: firstNameFromDisplayName(
          recipientName.trim() || studentName,
        ),
        packageDisplayName,
        amountAed: amountValid ? parsedAmount : 0,
        payUrl: "",
        senderName,
        recipientEmail: recipientEmail.trim() || studentEmail,
        fromEmailDisplay,
      },
      { usePlaceholderLink: true },
    );
  }, [
    universitiesCountValid,
    parsedUniversitiesCount,
    recipientName,
    studentName,
    amountValid,
    parsedAmount,
    senderName,
    recipientEmail,
    studentEmail,
    fromEmailDisplay,
  ]);

  useEffect(() => {
    if (!open) return;
    setTab("payment_link");
    setAmount("");
    setUniversitiesCount("");
    setEmailBodyCustomized(false);
    setCopied(false);
    setSelectedApplicationId("");

    if (!isListMode) {
      setRecipientName(fixedStudentName ?? "");
      setRecipientEmail(fixedStudentEmail ?? "");
    } else {
      setRecipientName("");
      setRecipientEmail("");
    }
  }, [open, isListMode, fixedStudentName, fixedStudentEmail]);

  useEffect(() => {
    if (!open || !isListMode || !selectedOption) return;
    setRecipientName(selectedOption.studentName);
    setRecipientEmail(selectedOption.studentEmail);
    setEmailBodyCustomized(false);
  }, [open, isListMode, selectedOption?.applicationId]);

  useEffect(() => {
    if (!open) return;
    if (emailBodyCustomized) return;
    setEmailBody(defaultEmailBody);
  }, [open, defaultEmailBody, emailBodyCustomized]);

  useEffect(() => {
    if (!generatedPayUrl) setCopied(false);
  }, [generatedPayUrl]);

  if (!open) return null;

  function handleGenerateLink(event: FormEvent) {
    event.preventDefault();
    if (linkSubmitDisabled || applicationId == null) return;
    onGenerateLink({
      applicationId,
      amountAed: parsedAmount,
      universitiesCount: parsedUniversitiesCount,
    });
  }

  function handleSendEmail(event: FormEvent) {
    event.preventDefault();
    if (emailSubmitDisabled || applicationId == null) return;
    onSendEmail({
      applicationId,
      amountAed: parsedAmount,
      universitiesCount: parsedUniversitiesCount,
      recipientName: recipientName.trim(),
      recipientEmail: recipientEmail.trim(),
      emailBody: emailBody.trim(),
    });
  }

  async function handleCopy() {
    if (!generatedPayUrl) return;
    try {
      await navigator.clipboard.writeText(generatedPayUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const applicationSelect = isListMode ? (
    <div>
      <label htmlFor="lead-payment-application" className={labelClassName}>
        Application
      </label>
      <select
        id="lead-payment-application"
        value={selectedApplicationId}
        disabled={isSubmitting || Boolean(generatedPayUrl)}
        onChange={(event) => setSelectedApplicationId(event.target.value)}
        className={selectClassName}
        style={{ backgroundImage: SELECT_CHEVRON }}
      >
        <option value="">Select application</option>
        {applicationOptions?.map((option) => (
          <option key={option.applicationId} value={option.applicationId}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  ) : null;

  const subtitle = studentName
    ? `For ${studentName}. Once paid, the application moves to Paying Customers.`
    : "Select an application, then generate a payment link or send an email.";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(15,30,20,0.45)] p-4"
      role="presentation"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-payment-title"
        className="w-full max-w-[560px] max-h-[90vh] overflow-y-auto rounded-[14px] border border-[#ece9e4] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[#ece9e4] px-5 py-4">
          <h2
            id="lead-payment-title"
            className="text-[22px] tracking-[-0.01em] text-[#1a1a1a]"
            style={{ fontFamily: fontSerif }}
          >
            Payment request
          </h2>
          <p className="mt-1 text-[12.5px] text-[#6a6a6a]">{subtitle}</p>
        </div>

        <div className="flex border-b border-[#ece9e4] px-5">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setTab("payment_link")}
            className={`cursor-pointer border-b-2 px-1 py-2.5 text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed ${
              tab === "payment_link"
                ? "border-[#2D6A4F] text-[#2D6A4F]"
                : "border-transparent text-[#6a6a6a] hover:text-[#1a1a1a]"
            }`}
          >
            Payment link
          </button>
          <button
            type="button"
            disabled={isSubmitting || Boolean(generatedPayUrl)}
            onClick={() => setTab("send_email")}
            className={`ml-4 cursor-pointer border-b-2 px-1 py-2.5 text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              tab === "send_email"
                ? "border-[#2D6A4F] text-[#2D6A4F]"
                : "border-transparent text-[#6a6a6a] hover:text-[#1a1a1a]"
            }`}
          >
            Send Email
          </button>
        </div>

        <div className="px-5 py-4">
          {tab === "payment_link" ? (
            generatedPayUrl ? (
              <div className="space-y-3.5">
                {applicationSelect}
                <p className="text-[13px] text-[#4a4a4a]">
                  Payment link created. Share it with the student. When they pay,
                  the application is activated automatically.
                </p>
                <div>
                  <label htmlFor="lead-pay-url" className={labelClassName}>
                    Stripe payment link
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="lead-pay-url"
                      type="text"
                      readOnly
                      value={generatedPayUrl}
                      className={inputClassName}
                    />
                    <button
                      type="button"
                      onClick={() => void handleCopy()}
                      className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-3 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5" aria-hidden />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" aria-hidden />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-3.5 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerateLink} className="space-y-3.5">
                {applicationSelect}
                <div>
                  <label htmlFor="lead-link-unis" className={labelClassName}>
                    Number of universities
                  </label>
                  <input
                    id="lead-link-unis"
                    type="number"
                    min={1}
                    step={1}
                    value={universitiesCount}
                    disabled={isSubmitting}
                    onChange={(event) => setUniversitiesCount(event.target.value)}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="lead-link-amount" className={labelClassName}>
                    Amount (AED)
                  </label>
                  <input
                    id="lead-link-amount"
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={amount}
                    disabled={isSubmitting}
                    onChange={(event) => setAmount(event.target.value)}
                    className={inputClassName}
                  />
                </div>

                {error ? (
                  <p
                    className="rounded-[8px] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={onClose}
                    className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-3.5 py-2 text-[12.5px] font-medium text-[#4a4a4a] transition-colors hover:bg-[#faf9f4] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={linkSubmitDisabled}
                    className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-3.5 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Generating..." : "Generate link"}
                  </button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={handleSendEmail} className="space-y-3.5">
              {applicationSelect}
              <div>
                <label htmlFor="lead-email-name" className={labelClassName}>
                  Recipient name
                </label>
                <input
                  id="lead-email-name"
                  type="text"
                  value={recipientName}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setRecipientName(event.target.value);
                    setEmailBodyCustomized(false);
                  }}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="lead-email-to" className={labelClassName}>
                  Recipient email
                </label>
                <input
                  id="lead-email-to"
                  type="email"
                  value={recipientEmail}
                  disabled={isSubmitting}
                  onChange={(event) => setRecipientEmail(event.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="lead-email-unis" className={labelClassName}>
                  Number of universities
                </label>
                <input
                  id="lead-email-unis"
                  type="number"
                  min={1}
                  step={1}
                  value={universitiesCount}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setUniversitiesCount(event.target.value);
                    setEmailBodyCustomized(false);
                  }}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="lead-email-amount" className={labelClassName}>
                  Amount (AED)
                </label>
                <input
                  id="lead-email-amount"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={amount}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setEmailBodyCustomized(false);
                  }}
                  className={inputClassName}
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label htmlFor="lead-email-body" className={labelClassName}>
                    Email message
                  </label>
                  {emailBodyCustomized ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEmailBodyCustomized(false);
                        setEmailBody(defaultEmailBody);
                      }}
                      disabled={isSubmitting || !defaultEmailBody}
                      className="cursor-pointer text-[11px] font-semibold text-[#2D6A4F] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reset to template
                    </button>
                  ) : null}
                </div>
                <div className="rounded-[8px] border border-[#ece9e4] bg-[#faf9f4] px-[18px] py-4">
                  <div className="mb-1.5 text-[12px]">
                    <b className="inline-block min-w-[60px] text-[#1a1a1a]">To:</b>{" "}
                    {recipientEmail.trim() || "—"}
                  </div>
                  <div className="mb-1.5 text-[12px]">
                    <b className="inline-block min-w-[60px] text-[#1a1a1a]">From:</b>{" "}
                    {senderName} &lt;{senderEmail || fromEmailDisplay}&gt;
                  </div>
                  <div className="mb-3 text-[12px]">
                    <b className="inline-block min-w-[60px] text-[#1a1a1a]">Subject:</b>{" "}
                    {PAYMENT_REQUEST_EMAIL_SUBJECT}
                  </div>
                  <textarea
                    id="lead-email-body"
                    rows={10}
                    value={emailBody}
                    onChange={(event) => {
                      setEmailBody(event.target.value);
                      setEmailBodyCustomized(true);
                    }}
                    placeholder=""
                    className={`${inputClassName} min-h-[200px] resize-y bg-white leading-relaxed`}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {error ? (
                <p
                  className="rounded-[8px] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={onClose}
                  className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-3.5 py-2 text-[12.5px] font-medium text-[#4a4a4a] transition-colors hover:bg-[#faf9f4] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emailSubmitDisabled}
                  className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-3.5 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Sending..." : "Send email"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { createPostAdmissionCase } from "@/actions/post-admission-support";
import {
  buildCalendlySchedulingPageUrl,
  postAdmissionUtmContent,
} from "@/lib/calendly-scheduling";
import type { ApplicationReceivingAdvisor } from "@/lib/advisor-receiving-flags";
import { useLocale } from "@/lib/i18n/locale-context";
import type { StudentFormDefaults } from "@/lib/load-student-form-defaults";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { PostAdmissionCalendlyModal } from "./post-admission-calendly-modal";

type BookSessionOptions = {
  serviceLabel?: string;
};

type PostAdmissionBookingContextValue = {
  canBook: boolean;
  isPending: boolean;
  error: string | null;
  bookSession: (options?: BookSessionOptions) => void;
  clearError: () => void;
};

const PostAdmissionBookingContext =
  createContext<PostAdmissionBookingContextValue | null>(null);

export function usePostAdmissionBooking(): PostAdmissionBookingContextValue {
  const context = useContext(PostAdmissionBookingContext);
  if (!context) {
    throw new Error(
      "usePostAdmissionBooking must be used within PostAdmissionBookingProvider",
    );
  }
  return context;
}

type PostAdmissionBookingProviderProps = {
  children: ReactNode;
  postAdmissionReceivingAdvisor: ApplicationReceivingAdvisor | null;
  profileDefaults: StudentFormDefaults | null;
};

export function PostAdmissionBookingProvider({
  children,
  postAdmissionReceivingAdvisor,
  profileDefaults,
}: PostAdmissionBookingProviderProps) {
  const { dict } = useLocale();
  const t = dict.student.postAdmission;
  const [modalOpen, setModalOpen] = useState(false);
  const [caseId, setCaseId] = useState<number | null>(null);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [serviceLabel, setServiceLabel] = useState(t.landing.genericServiceLabel);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fullName = profileDefaults?.fullName?.trim() ?? "";
  const email = profileDefaults?.email?.trim() ?? "";
  const schoolName = profileDefaults?.schoolName?.trim() ?? "";

  const calendlySchedulingUrl =
    postAdmissionReceivingAdvisor?.calendlySchedulingUrl?.trim() ?? "";
  const canBook = Boolean(calendlySchedulingUrl);
  const receivingAdvisorName = postAdmissionReceivingAdvisor
    ? `${postAdmissionReceivingAdvisor.firstName} ${postAdmissionReceivingAdvisor.lastName}`.trim()
    : "";

  const calendlyUrl = useMemo(() => {
    if (!canBook || !calendlySchedulingUrl || caseId == null) return "";
    const ctx: string[] = [`Service: ${serviceLabel}`];
    if (schoolName) ctx.push(`School: ${schoolName}`);
    if (receivingAdvisorName) ctx.push(`Advisor: ${receivingAdvisorName}`);
    ctx.push(`Case ref: #${caseId}`);
    return buildCalendlySchedulingPageUrl({
      base: calendlySchedulingUrl,
      name: fullName,
      email,
      utmContent: postAdmissionUtmContent(caseId),
      ctxParts: ctx,
    });
  }, [
    calendlySchedulingUrl,
    canBook,
    caseId,
    email,
    fullName,
    receivingAdvisorName,
    schoolName,
    serviceLabel,
  ]);

  const bookSession = useCallback(
    (options?: BookSessionOptions) => {
      if (!canBook) return;
      setError(null);
      setServiceLabel(options?.serviceLabel?.trim() || t.landing.genericServiceLabel);
      startTransition(async () => {
        const result = await createPostAdmissionCase();
        if (!result.ok) {
          setError(result.error);
          return;
        }
        if (result.kind === "already_scheduled") {
          setScheduledAt(result.scheduledAt);
          setCaseId(null);
          setModalOpen(true);
          return;
        }
        setScheduledAt(null);
        setCaseId(result.caseId);
        setModalOpen(true);
      });
    },
    [canBook, t.landing.genericServiceLabel],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setScheduledAt(null);
  }, []);

  const value = useMemo(
    () => ({
      canBook,
      isPending,
      error,
      bookSession,
      clearError,
    }),
    [bookSession, canBook, clearError, error, isPending],
  );
  const modalTitle = scheduledAt
    ? t.modal.alreadyScheduledTitle
    : t.modal.title.includes("{service}")
      ? t.modal.title.replace("{service}", serviceLabel)
      : t.modal.title;

  return (
    <PostAdmissionBookingContext.Provider value={value}>
      {children}
      <PostAdmissionCalendlyModal
        open={modalOpen}
        onClose={closeModal}
        url={calendlyUrl}
        prefill={{ name: fullName, email }}
        title={modalTitle}
        scheduledAt={scheduledAt}
      />
    </PostAdmissionBookingContext.Provider>
  );
}

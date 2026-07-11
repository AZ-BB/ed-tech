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
  formatPostAdmissionServiceLabel,
  type PostAdmissionServiceKey,
} from "@/lib/post-admission-services";
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
import { PostAdmissionServiceSelectionDialog } from "./post-admission-service-selection-dialog";

type BookSessionOptions = {
  preselectedServiceKey?: PostAdmissionServiceKey;
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
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [preselectedServiceKey, setPreselectedServiceKey] = useState<
    PostAdmissionServiceKey | undefined
  >();
  const [calendlyModalOpen, setCalendlyModalOpen] = useState(false);
  const [caseId, setCaseId] = useState<number | null>(null);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<PostAdmissionServiceKey | null>(
    null,
  );
  const [serviceOtherDetail, setServiceOtherDetail] = useState<string | null>(null);
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

  const serviceLabel = useMemo(
    () =>
      formatPostAdmissionServiceLabel(selectedService, serviceOtherDetail) ||
      t.landing.genericServiceLabel,
    [selectedService, serviceOtherDetail, t.landing.genericServiceLabel],
  );

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
      setPreselectedServiceKey(options?.preselectedServiceKey);
      setServiceDialogOpen(true);
    },
    [canBook],
  );

  const handleServiceConfirm = useCallback(
    (input: {
      selectedService: PostAdmissionServiceKey;
      serviceOtherDetail?: string;
    }) => {
      setError(null);
      startTransition(async () => {
        const result = await createPostAdmissionCase({
          selectedService: input.selectedService,
          serviceOtherDetail: input.serviceOtherDetail,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }

        setSelectedService(input.selectedService);
        setServiceOtherDetail(
          input.selectedService === "other"
            ? input.serviceOtherDetail?.trim() || null
            : null,
        );
        setServiceDialogOpen(false);

        if (result.kind === "already_scheduled") {
          setScheduledAt(result.scheduledAt);
          setCaseId(null);
          setCalendlyModalOpen(true);
          return;
        }

        setScheduledAt(null);
        setCaseId(result.caseId);
        setCalendlyModalOpen(true);
      });
    },
    [],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const closeServiceDialog = useCallback(() => {
    if (isPending) return;
    setServiceDialogOpen(false);
    setPreselectedServiceKey(undefined);
  }, [isPending]);

  const closeCalendlyModal = useCallback(() => {
    setCalendlyModalOpen(false);
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

  const calendlyModalTitle = scheduledAt
    ? t.modal.alreadyScheduledTitle
    : t.modal.title.includes("{service}")
      ? t.modal.title.replace("{service}", serviceLabel)
      : t.modal.title;

  return (
    <PostAdmissionBookingContext.Provider value={value}>
      {children}
      <PostAdmissionServiceSelectionDialog
        open={serviceDialogOpen}
        preselectedServiceKey={preselectedServiceKey}
        isPending={isPending}
        onClose={closeServiceDialog}
        onConfirm={handleServiceConfirm}
      />
      <PostAdmissionCalendlyModal
        open={calendlyModalOpen}
        onClose={closeCalendlyModal}
        url={calendlyUrl}
        prefill={{ name: fullName, email }}
        title={calendlyModalTitle}
        scheduledAt={scheduledAt}
      />
    </PostAdmissionBookingContext.Provider>
  );
}

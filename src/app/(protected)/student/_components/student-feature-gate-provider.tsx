"use client";

import {
  defaultStudentFeatureAccess,
  type StudentFeatureAccess,
  type StudentFeatureKey,
} from "@/lib/student-feature-access";
import type {
  AiDailyLimitFeatureKey,
  StudentAiDailyLimitStatus,
} from "@/lib/student-ai-daily-limit";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { CustomApplicationSupportWarningModal } from "./custom-application-support-warning-modal";
import {
  setCustomApplicationSupportWarningAcknowledged,
} from "@/lib/custom-application-support-warning";
import {
  StudentAiDailyLimitModal,
  type AiUsageLimitKind,
} from "./student-ai-daily-limit-modal";
import { StudentDisabledFeaturesModal } from "./student-disabled-features-modal";
import { StudentSubscriptionModal } from "./student-subscription-modal";

type OpenAiDailyLimitModalOptions = {
  featureKey: AiDailyLimitFeatureKey;
  status?: StudentAiDailyLimitStatus | null;
  limitKind?: AiUsageLimitKind;
};

type StudentFeatureGateContextValue = {
  openDisabledFeaturesModal: (featureKey?: StudentFeatureKey) => void;
  /** True for unpaid funnel students who must subscribe for apply/book actions. */
  requiresFunnelSubscription: boolean;
  openSubscriptionModal: (featureKey?: StudentFeatureKey) => void;
  openAiDailyLimitModal: (options: OpenAiDailyLimitModalOptions) => void;
  /**
   * If the student needs a funnel subscription, opens the modal and returns false.
   * Otherwise returns true so the caller can proceed.
   */
  guardFunnelSubscriptionAction: (featureKey?: StudentFeatureKey) => boolean;
  guardAiDailyLimitAction: (
    featureKey: AiDailyLimitFeatureKey,
    status: StudentAiDailyLimitStatus,
    limitKind?: AiUsageLimitKind,
  ) => boolean;
  /** Custom students must acknowledge paid-service warning before app support. */
  isCustomStudent: boolean;
  requestApplicationSupportAccess: (
    onProceed: () => void,
    onCancel?: () => void,
  ) => void;
  guardApplicationSupportClick: (
    event: MouseEvent,
    onProceed: () => void,
    onCancel?: () => void,
  ) => void;
};

const StudentFeatureGateContext =
  createContext<StudentFeatureGateContextValue | null>(null);

export function StudentFeatureGateProvider({
  children,
  featureAccess = defaultStudentFeatureAccess(true),
  showFunnelSubscribeCta = false,
  isCustomStudent = false,
}: {
  children: ReactNode;
  featureAccess?: StudentFeatureAccess;
  showFunnelSubscribeCta?: boolean;
  isCustomStudent?: boolean;
}) {
  const [disabledOpen, setDisabledOpen] = useState(false);
  const [highlightedFeature, setHighlightedFeature] =
    useState<StudentFeatureKey | null>(null);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [subscriptionFeature, setSubscriptionFeature] =
    useState<StudentFeatureKey | null>(null);
  const [aiDailyLimitOpen, setAiDailyLimitOpen] = useState(false);
  const [aiDailyLimitFeature, setAiDailyLimitFeature] =
    useState<AiDailyLimitFeatureKey | null>(null);
  const [aiDailyLimitStatus, setAiDailyLimitStatus] =
    useState<StudentAiDailyLimitStatus | null>(null);
  const [aiLimitKind, setAiLimitKind] = useState<AiUsageLimitKind>("daily");
  const [customAppSupportWarningOpen, setCustomAppSupportWarningOpen] =
    useState(false);
  const customAppSupportProceedRef = useRef<(() => void) | null>(null);
  const customAppSupportCancelRef = useRef<(() => void) | null>(null);

  const closeCustomApplicationSupportWarning = useCallback(() => {
    setCustomAppSupportWarningOpen(false);
    const onCancel = customAppSupportCancelRef.current;
    customAppSupportProceedRef.current = null;
    customAppSupportCancelRef.current = null;
    onCancel?.();
  }, []);

  const confirmCustomApplicationSupportWarning = useCallback(() => {
    setCustomAppSupportWarningOpen(false);
    const onProceed = customAppSupportProceedRef.current;
    customAppSupportProceedRef.current = null;
    customAppSupportCancelRef.current = null;
    setCustomApplicationSupportWarningAcknowledged();
    onProceed?.();
  }, []);

  const requestApplicationSupportAccess = useCallback(
    (onProceed: () => void, onCancel?: () => void) => {
      if (!isCustomStudent) {
        onProceed();
        return;
      }
      customAppSupportProceedRef.current = onProceed;
      customAppSupportCancelRef.current = onCancel ?? null;
      setCustomAppSupportWarningOpen(true);
    },
    [isCustomStudent],
  );

  const guardApplicationSupportClick = useCallback(
    (
      event: MouseEvent,
      onProceed: () => void,
      onCancel?: () => void,
    ) => {
      if (!isCustomStudent) return;
      event.preventDefault();
      requestApplicationSupportAccess(onProceed, onCancel);
    },
    [isCustomStudent, requestApplicationSupportAccess],
  );

  const openDisabledFeaturesModal = useCallback(
    (featureKey?: StudentFeatureKey) => {
      setHighlightedFeature(featureKey ?? null);
      setDisabledOpen(true);
    },
    [],
  );

  const closeDisabledModal = useCallback(() => {
    setDisabledOpen(false);
    setHighlightedFeature(null);
  }, []);

  const openSubscriptionModal = useCallback((featureKey?: StudentFeatureKey) => {
    setSubscriptionFeature(featureKey ?? null);
    setSubscriptionOpen(true);
  }, []);

  const closeSubscriptionModal = useCallback(() => {
    setSubscriptionOpen(false);
    setSubscriptionFeature(null);
  }, []);

  const openAiDailyLimitModal = useCallback(
    ({ featureKey, status = null, limitKind = "daily" }: OpenAiDailyLimitModalOptions) => {
      setAiDailyLimitFeature(featureKey);
      setAiDailyLimitStatus(status);
      setAiLimitKind(limitKind);
      setAiDailyLimitOpen(true);
    },
    [],
  );

  const closeAiDailyLimitModal = useCallback(() => {
    setAiDailyLimitOpen(false);
    setAiDailyLimitFeature(null);
    setAiDailyLimitStatus(null);
    setAiLimitKind("daily");
  }, []);

  const guardAiDailyLimitAction = useCallback(
    (
      featureKey: AiDailyLimitFeatureKey,
      status: StudentAiDailyLimitStatus,
      limitKind: AiUsageLimitKind = "daily",
    ) => {
      if (status.allowed) return true;
      openAiDailyLimitModal({ featureKey, status, limitKind });
      return false;
    },
    [openAiDailyLimitModal],
  );

  const guardFunnelSubscriptionAction = useCallback(
    (featureKey?: StudentFeatureKey) => {
      if (!showFunnelSubscribeCta) return true;
      setSubscriptionFeature(featureKey ?? null);
      setSubscriptionOpen(true);
      return false;
    },
    [showFunnelSubscribeCta],
  );

  const value = useMemo(
    () => ({
      openDisabledFeaturesModal,
      requiresFunnelSubscription: showFunnelSubscribeCta,
      openSubscriptionModal,
      openAiDailyLimitModal,
      guardFunnelSubscriptionAction,
      guardAiDailyLimitAction,
      isCustomStudent,
      requestApplicationSupportAccess,
      guardApplicationSupportClick,
    }),
    [
      openDisabledFeaturesModal,
      showFunnelSubscribeCta,
      openSubscriptionModal,
      openAiDailyLimitModal,
      guardFunnelSubscriptionAction,
      guardAiDailyLimitAction,
      isCustomStudent,
      requestApplicationSupportAccess,
      guardApplicationSupportClick,
    ],
  );

  return (
    <StudentFeatureGateContext.Provider value={value}>
      {children}
      <StudentDisabledFeaturesModal
        open={disabledOpen}
        onClose={closeDisabledModal}
        featureAccess={featureAccess}
        highlightedFeature={highlightedFeature}
        showFunnelSubscribeCta={showFunnelSubscribeCta}
      />
      {showFunnelSubscribeCta ? (
        <StudentSubscriptionModal
          open={subscriptionOpen}
          onClose={closeSubscriptionModal}
          featureKey={subscriptionFeature}
        />
      ) : null}
      <StudentAiDailyLimitModal
        open={aiDailyLimitOpen}
        onClose={closeAiDailyLimitModal}
        featureKey={aiDailyLimitFeature}
        status={aiDailyLimitStatus}
        limitKind={aiLimitKind}
      />
      {isCustomStudent ? (
        <CustomApplicationSupportWarningModal
          open={customAppSupportWarningOpen}
          onClose={closeCustomApplicationSupportWarning}
          onContinue={confirmCustomApplicationSupportWarning}
        />
      ) : null}
    </StudentFeatureGateContext.Provider>
  );
}

export function useStudentFeatureGate(): StudentFeatureGateContextValue {
  const ctx = useContext(StudentFeatureGateContext);
  if (!ctx) {
    throw new Error(
      "useStudentFeatureGate must be used within StudentFeatureGateProvider",
    );
  }
  return ctx;
}

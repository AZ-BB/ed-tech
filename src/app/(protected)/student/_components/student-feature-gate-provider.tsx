"use client";

import {
  defaultStudentFeatureAccess,
  type StudentFeatureAccess,
  type StudentFeatureKey,
} from "@/lib/student-feature-access";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { StudentDisabledFeaturesModal } from "./student-disabled-features-modal";
import { StudentSubscriptionModal } from "./student-subscription-modal";

type StudentFeatureGateContextValue = {
  openDisabledFeaturesModal: (featureKey?: StudentFeatureKey) => void;
  /** True for unpaid funnel students who must subscribe for apply/book actions. */
  requiresFunnelSubscription: boolean;
  openSubscriptionModal: (featureKey?: StudentFeatureKey) => void;
  /**
   * If the student needs a funnel subscription, opens the modal and returns false.
   * Otherwise returns true so the caller can proceed.
   */
  guardFunnelSubscriptionAction: (featureKey?: StudentFeatureKey) => boolean;
};

const StudentFeatureGateContext =
  createContext<StudentFeatureGateContextValue | null>(null);

export function StudentFeatureGateProvider({
  children,
  featureAccess = defaultStudentFeatureAccess(true),
  showFunnelSubscribeCta = false,
}: {
  children: ReactNode;
  featureAccess?: StudentFeatureAccess;
  showFunnelSubscribeCta?: boolean;
}) {
  const [disabledOpen, setDisabledOpen] = useState(false);
  const [highlightedFeature, setHighlightedFeature] =
    useState<StudentFeatureKey | null>(null);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [subscriptionFeature, setSubscriptionFeature] =
    useState<StudentFeatureKey | null>(null);

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
      guardFunnelSubscriptionAction,
    }),
    [
      openDisabledFeaturesModal,
      showFunnelSubscribeCta,
      openSubscriptionModal,
      guardFunnelSubscriptionAction,
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

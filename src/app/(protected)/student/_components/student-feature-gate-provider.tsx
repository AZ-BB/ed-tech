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

type StudentFeatureGateContextValue = {
  openDisabledFeaturesModal: (featureKey?: StudentFeatureKey) => void;
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
  const [open, setOpen] = useState(false);
  const [highlightedFeature, setHighlightedFeature] =
    useState<StudentFeatureKey | null>(null);

  const openDisabledFeaturesModal = useCallback(
    (featureKey?: StudentFeatureKey) => {
      setHighlightedFeature(featureKey ?? null);
      setOpen(true);
    },
    [],
  );

  const closeModal = useCallback(() => {
    setOpen(false);
    setHighlightedFeature(null);
  }, []);

  const value = useMemo(
    () => ({ openDisabledFeaturesModal }),
    [openDisabledFeaturesModal],
  );

  return (
    <StudentFeatureGateContext.Provider value={value}>
      {children}
      <StudentDisabledFeaturesModal
        open={open}
        onClose={closeModal}
        featureAccess={featureAccess}
        highlightedFeature={highlightedFeature}
        showFunnelSubscribeCta={showFunnelSubscribeCta}
      />
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

"use client";

import {
  hasCustomApplicationSupportWarningAcknowledged,
} from "@/lib/custom-application-support-warning";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useStudentFeatureGate } from "../../_components/student-feature-gate-provider";

export function CustomApplicationSupportIntakeGate({
  children,
  isCustomStudent,
}: {
  children: ReactNode;
  isCustomStudent: boolean;
}) {
  const router = useRouter();
  const { requestApplicationSupportAccess } = useStudentFeatureGate();
  const [allowed, setAllowed] = useState(!isCustomStudent);

  useEffect(() => {
    if (!isCustomStudent || allowed) return;

    if (hasCustomApplicationSupportWarningAcknowledged()) {
      setAllowed(true);
      return;
    }

    requestApplicationSupportAccess(
      () => setAllowed(true),
      () => router.replace("/student"),
    );
  }, [allowed, isCustomStudent, requestApplicationSupportAccess, router]);

  if (!allowed) return null;
  return children;
}

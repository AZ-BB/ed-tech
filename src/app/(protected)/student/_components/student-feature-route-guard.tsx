"use client";

import {
  featureForStudentPath,
  isStudentFeatureEnabled,
  type StudentFeatureAccess,
} from "@/lib/student-feature-access";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStudentFeatureGate } from "./student-feature-gate-provider";

function normalizePath(pathname: string): string {
  return pathname.replace(/\/$/, "") || "/";
}

function isProgramFitTestPath(pathname: string): boolean {
  const normalized = normalizePath(pathname);
  return (
    normalized === "/student/program-fit-test" ||
    normalized.startsWith("/student/program-fit-test/")
  );
}

/** Redirects away from feature routes the student is not allowed to use. */
export function StudentFeatureRouteGuard({
  featureAccess,
}: {
  featureAccess: StudentFeatureAccess;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { requiresFunnelSubscription, openSubscriptionModal } =
    useStudentFeatureGate();

  useEffect(() => {
    if (requiresFunnelSubscription && isProgramFitTestPath(pathname)) {
      openSubscriptionModal("program_discovery");
      router.replace("/student/programs");
      return;
    }

    const feature = featureForStudentPath(pathname);
    if (feature && !isStudentFeatureEnabled(featureAccess, feature)) {
      router.replace("/student");
    }
  }, [
    pathname,
    featureAccess,
    router,
    requiresFunnelSubscription,
    openSubscriptionModal,
  ]);

  return null;
}

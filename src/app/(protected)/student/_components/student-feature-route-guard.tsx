"use client";

import {
  featureForStudentPath,
  isStudentFeatureEnabled,
  type StudentFeatureAccess,
} from "@/lib/student-feature-access";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/** Redirects away from feature routes the student is not allowed to use. */
export function StudentFeatureRouteGuard({
  featureAccess,
}: {
  featureAccess: StudentFeatureAccess;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const feature = featureForStudentPath(pathname);
    if (feature && !isStudentFeatureEnabled(featureAccess, feature)) {
      router.replace("/student");
    }
  }, [pathname, featureAccess, router]);

  return null;
}

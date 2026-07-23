import type { Database } from "@/database.types";
import {
  defaultStudentFeatureAccess,
  parseStudentFeatureAccess,
  type StudentFeatureAccess,
} from "@/lib/student-feature-access";
import type { Json } from "@/database.types";

export type StudentSubscriptionStatus =
  Database["public"]["Enums"]["student_subscription_status"];

export type StudentType = Database["public"]["Enums"]["student_type"];

export type StudentSubscriptionSnapshot = {
  studentType: StudentType;
  subscriptionStatus: StudentSubscriptionStatus;
  subscriptionCurrentPeriodEnd: string | null;
  subscriptionCancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
};

const ACTIVE_STATUSES = new Set<StudentSubscriptionStatus>([
  "active",
  "trialing",
  "past_due",
]);

export function isStudentSubscriptionActive(
  status: StudentSubscriptionStatus | null | undefined,
): boolean {
  return status != null && ACTIVE_STATUSES.has(status);
}

export function canManageFunnelSubscription(
  snapshot: Pick<StudentSubscriptionSnapshot, "studentType">,
): boolean {
  return snapshot.studentType === "funnel";
}

/** Free funnel student: can browse gated surfaces but must subscribe for apply/book actions. */
export function requiresFunnelSubscription(
  snapshot: Pick<
    StudentSubscriptionSnapshot,
    "studentType" | "subscriptionStatus"
  >,
): boolean {
  return (
    canManageFunnelSubscription(snapshot) &&
    !isStudentSubscriptionActive(snapshot.subscriptionStatus)
  );
}

export function resolveStudentFeatureAccess(input: {
  studentType: StudentType;
  subscriptionStatus: StudentSubscriptionStatus;
  storedFeatureAccess: Json | null | undefined;
}): StudentFeatureAccess {
  const stored = parseStudentFeatureAccess(input.storedFeatureAccess, {
    studentType: input.studentType,
  });
  if (
    input.studentType === "funnel" &&
    isStudentSubscriptionActive(input.subscriptionStatus)
  ) {
    return defaultStudentFeatureAccess(true);
  }
  return stored;
}

export function mapStripeSubscriptionStatus(
  stripeStatus: string,
): StudentSubscriptionStatus {
  switch (stripeStatus) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
    case "paused":
      return stripeStatus;
    default:
      return "none";
  }
}

/** Counselor interaction kinds (matches `student_counselor_interactions.interaction_kind` CHECK). */
export const STUDENT_INTERACTION_KINDS = [
  "meeting",
  "call",
  "email",
  "parent",
  "intervention",
] as const;

export type StudentInteractionKind = (typeof STUDENT_INTERACTION_KINDS)[number];

export const STUDENT_INTERACTION_KIND_LABELS: Record<
  StudentInteractionKind,
  string
> = {
  meeting: "In-person meeting",
  call: "Phone call",
  email: "Email exchange",
  parent: "Parent contact",
  intervention: "Intervention",
};

/** Outcomes (matches DB CHECK on `student_counselor_interactions.outcome`). */
export const STUDENT_INTERACTION_OUTCOMES = [
  "Productive",
  "Follow-up needed",
  "Concern raised",
  "Resolved",
  "No-show",
] as const;

export type StudentInteractionOutcome =
  (typeof STUDENT_INTERACTION_OUTCOMES)[number];

export function isStudentInteractionKind(
  v: string,
): v is StudentInteractionKind {
  return (STUDENT_INTERACTION_KINDS as readonly string[]).includes(v);
}

export function isStudentInteractionOutcome(
  v: string,
): v is StudentInteractionOutcome {
  return (STUDENT_INTERACTION_OUTCOMES as readonly string[]).includes(v);
}

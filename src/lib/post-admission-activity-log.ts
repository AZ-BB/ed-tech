export const POST_ADMISSION_ACTIVITY_ENTITY_TYPE = "post_admission" as const;

export function postAdmissionActivityEntityId(caseId: number): string {
  return String(caseId);
}

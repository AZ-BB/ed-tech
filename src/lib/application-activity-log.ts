export const APPLICATION_ACTIVITY_ENTITY_TYPE = "application" as const;

export type ApplicationActivityLogAudience = "admin" | "advisor";

/** Advisor application actions are stored with created_by_type admin and null admin_id. */
export const ADVISOR_APPLICATION_ACTIVITY_LOG_CREATED_BY_TYPE = "admin" as const;

export function applicationActivityEntityId(applicationId: number): string {
  return String(applicationId);
}

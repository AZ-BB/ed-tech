export const APPLICATION_ACTIVITY_ENTITY_TYPE = "application" as const;

export function applicationActivityEntityId(applicationId: number): string {
  return String(applicationId);
}

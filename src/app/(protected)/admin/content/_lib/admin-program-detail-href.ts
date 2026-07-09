import { ADMIN_PROGRAMS_DISCOVERY_HOME } from "../_data/content-tabs-data";

export function getAdminProgramDiscoveryDetailHref(id: string): string {
  return `${ADMIN_PROGRAMS_DISCOVERY_HOME}/${id}`;
}

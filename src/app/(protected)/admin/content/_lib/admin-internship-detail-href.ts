import { ADMIN_INTERNSHIPS_HOME } from "../_data/content-tabs-data";

export function getAdminInternshipDetailHref(id: string): string {
  return `${ADMIN_INTERNSHIPS_HOME}/${id}`;
}

import { ADMIN_SCHOLARSHIPS_HOME } from "../_data/content-tabs-data";

export function getAdminScholarshipDetailHref(id: string): string {
  return `${ADMIN_SCHOLARSHIPS_HOME}/${id}`;
}

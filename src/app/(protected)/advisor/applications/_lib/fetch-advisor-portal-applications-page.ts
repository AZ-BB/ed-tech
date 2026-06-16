import { resolveCurrentAdvisorId } from "@/lib/advisor-access";
import { createSupabaseServerClient } from "@/utils/supabase-server";

import {
  fetchAdvisorApplicationsPanel,
  parseAdvisorApplicationStatusFilter,
  type AdminAdvisorApplicationsPanelProps,
} from "@/app/(protected)/admin/users/advisors/[id]/_lib/fetch-advisor-applications-page";

export type AdvisorPortalApplicationsPanelProps = AdminAdvisorApplicationsPanelProps;

export async function fetchAdvisorPortalApplicationsPanel(
  status: ReturnType<typeof parseAdvisorApplicationStatusFilter>,
  options: { page: number; limit: number },
): Promise<AdvisorPortalApplicationsPanelProps | null> {
  const supabase = await createSupabaseServerClient();
  const advisorId = await resolveCurrentAdvisorId(supabase);
  if (!advisorId) return null;

  return fetchAdvisorApplicationsPanel(advisorId, status, {
    page: options.page,
    limit: options.limit,
    client: supabase,
  });
}

export { parseAdvisorApplicationStatusFilter };

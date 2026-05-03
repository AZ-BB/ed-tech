import { createSupabaseSecretClient } from "@/utils/supabase-server";

import { ApplicationSupportClient } from "./_components/application-support-client";

export const dynamic = "force-dynamic";

export default async function StudentApplicationSupportPage() {
  const secret = await createSupabaseSecretClient();
  const { data: plans } = await secret
    .from("applications_plans")
    .select("*")
    .eq("is_active", true)
    .order("universities_count", { ascending: true });

  return <ApplicationSupportClient plans={plans ?? []} />;
}

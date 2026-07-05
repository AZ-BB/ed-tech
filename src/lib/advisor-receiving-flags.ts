import "server-only";

import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type ApplicationReceivingAdvisor = {
  id: string;
  firstName: string;
  lastName: string;
  calendlySchedulingUrl: string | null;
};

type AdvisorReceivingSecret = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export async function clearOtherApplicationSupportReceivers(
  service: AdvisorReceivingSecret,
  advisorId: string,
): Promise<void> {
  const { error } = await service
    .from("advisors")
    .update({ receives_application_support: false })
    .neq("id", advisorId)
    .eq("receives_application_support", true);

  if (error) {
    throw new Error("Could not update application receiving advisor.");
  }
}

export async function clearOtherPostAdmissionSupportReceivers(
  service: AdvisorReceivingSecret,
  advisorId: string,
): Promise<void> {
  const { error } = await service
    .from("advisors")
    .update({ receives_post_admission_support: false })
    .neq("id", advisorId)
    .eq("receives_post_admission_support", true);

  if (error) {
    throw new Error("Could not update post-admission receiving advisor.");
  }
}

export async function applyAdvisorReceivingFlags(
  service: AdvisorReceivingSecret,
  advisorId: string,
  flags: {
    receivesApplicationSupport: boolean;
    receivesPostAdmissionSupport: boolean;
  },
): Promise<void> {
  if (flags.receivesApplicationSupport) {
    await clearOtherApplicationSupportReceivers(service, advisorId);
  }
  if (flags.receivesPostAdmissionSupport) {
    await clearOtherPostAdmissionSupportReceivers(service, advisorId);
  }

  const { error } = await service
    .from("advisors")
    .update({
      receives_application_support: flags.receivesApplicationSupport,
      receives_post_admission_support: flags.receivesPostAdmissionSupport,
      updated_at: new Date().toISOString(),
    })
    .eq("id", advisorId);

  if (error) {
    if (error.code === "23505") {
      throw new Error("Another advisor already holds this receiving role. Please try again.");
    }
    throw new Error(error.message || "Could not save advisor receiving flags.");
  }
}

export async function fetchApplicationReceivingAdvisor(): Promise<ApplicationReceivingAdvisor | null> {
  const secret = await createSupabaseSecretClient();
  const { data, error } = await secret
    .from("advisors")
    .select("id, first_name, last_name, calendly_scheduling_url")
    .eq("is_active", true)
    .eq("receives_application_support", true)
    .maybeSingle();

  if (error) {
    console.error("[fetchApplicationReceivingAdvisor]", error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    firstName: data.first_name?.trim() ?? "",
    lastName: data.last_name?.trim() ?? "",
    calendlySchedulingUrl: data.calendly_scheduling_url?.trim() || null,
  };
}

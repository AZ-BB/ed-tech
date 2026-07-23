import "server-only";

import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type ApplicationReceivingAdvisor = {
  id: string;
  firstName: string;
  lastName: string;
  calendlySchedulingUrl: string | null;
};

type AdvisorReceivingSecret = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

type ApplicationReceivingAdvisorRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  calendly_scheduling_url: string | null;
};

function mapReceivingAdvisorRow(
  row: ApplicationReceivingAdvisorRow,
): ApplicationReceivingAdvisor {
  return {
    id: row.id,
    firstName: row.first_name?.trim() ?? "",
    lastName: row.last_name?.trim() ?? "",
    calendlySchedulingUrl: row.calendly_scheduling_url?.trim() || null,
  };
}

async function queryApplicationReceivingAdvisor(
  service: AdvisorReceivingSecret,
): Promise<ApplicationReceivingAdvisor | null> {
  const { data, error } = await service
    .from("advisors")
    .select("id, first_name, last_name, calendly_scheduling_url")
    .eq("receives_application_support", true)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[queryApplicationReceivingAdvisor]", error);
    return null;
  }

  if (!data) return null;
  return mapReceivingAdvisorRow(data);
}

/** Assign a newly created application to the flagged application-support advisor. */
export async function assignApplicationToReceivingAdvisor(
  service: AdvisorReceivingSecret,
  input: { applicationId: number; studentId: string },
): Promise<{ assigned: boolean; advisorName?: string }> {
  const receivingAdvisor = await queryApplicationReceivingAdvisor(service);
  if (!receivingAdvisor) {
    console.warn(
      "[assignApplicationToReceivingAdvisor] No active advisor with receives_application_support",
      { applicationId: input.applicationId },
    );
    return { assigned: false };
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateErr } = await service
    .from("applications")
    .update({
      assigned_to: receivingAdvisor.id,
      assigned_at: now,
      updated_at: now,
    })
    .eq("id", input.applicationId)
    .select("id, assigned_to")
    .maybeSingle();

  if (updateErr) {
    console.error("[assignApplicationToReceivingAdvisor] update failed", updateErr, {
      applicationId: input.applicationId,
      advisorId: receivingAdvisor.id,
    });
    return { assigned: false };
  }

  if (!updated?.assigned_to) {
    console.error("[assignApplicationToReceivingAdvisor] update returned no row", {
      applicationId: input.applicationId,
      advisorId: receivingAdvisor.id,
    });
    return { assigned: false };
  }

  const advisorName =
    `${receivingAdvisor.firstName} ${receivingAdvisor.lastName}`.trim() || "Advisor";

  return { assigned: true, advisorName };
}

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

export async function clearOtherFreeFunnelApplicationSupportReceivers(
  service: AdvisorReceivingSecret,
  advisorId: string,
): Promise<void> {
  const { error } = await service
    .from("advisors")
    .update({ receives_free_funnel_application_support: false })
    .neq("id", advisorId)
    .eq("receives_free_funnel_application_support", true);

  if (error) {
    throw new Error("Could not update free-funnel application receiving advisor.");
  }
}

export async function applyAdvisorReceivingFlags(
  service: AdvisorReceivingSecret,
  advisorId: string,
  flags: {
    receivesApplicationSupport: boolean;
    receivesPostAdmissionSupport: boolean;
    receivesFreeFunnelApplicationSupport: boolean;
  },
): Promise<void> {
  if (flags.receivesApplicationSupport) {
    await clearOtherApplicationSupportReceivers(service, advisorId);
  }
  if (flags.receivesPostAdmissionSupport) {
    await clearOtherPostAdmissionSupportReceivers(service, advisorId);
  }
  if (flags.receivesFreeFunnelApplicationSupport) {
    await clearOtherFreeFunnelApplicationSupportReceivers(service, advisorId);
  }

  const { error } = await service
    .from("advisors")
    .update({
      receives_application_support: flags.receivesApplicationSupport,
      receives_post_admission_support: flags.receivesPostAdmissionSupport,
      receives_free_funnel_application_support: flags.receivesFreeFunnelApplicationSupport,
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
  return queryApplicationReceivingAdvisor(secret);
}

async function queryPostAdmissionReceivingAdvisor(
  service: AdvisorReceivingSecret,
): Promise<ApplicationReceivingAdvisor | null> {
  const { data, error } = await service
    .from("advisors")
    .select("id, first_name, last_name, calendly_scheduling_url")
    .eq("receives_post_admission_support", true)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[queryPostAdmissionReceivingAdvisor]", error);
    return null;
  }

  if (!data) return null;
  return mapReceivingAdvisorRow(data);
}

/** Assign a newly created post-admission case to the flagged receiving advisor. */
export async function assignPostAdmissionToReceivingAdvisor(
  service: AdvisorReceivingSecret,
  input: { caseId: number; studentId: string },
): Promise<{ assigned: boolean; advisorName?: string }> {
  const receivingAdvisor = await queryPostAdmissionReceivingAdvisor(service);
  if (!receivingAdvisor) {
    console.warn(
      "[assignPostAdmissionToReceivingAdvisor] No active advisor with receives_post_admission_support",
      { caseId: input.caseId },
    );
    return { assigned: false };
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateErr } = await service
    .from("post_admission_cases")
    .update({
      assigned_to: receivingAdvisor.id,
      assigned_at: now,
      updated_at: now,
    })
    .eq("id", input.caseId)
    .select("id, assigned_to")
    .maybeSingle();

  if (updateErr) {
    console.error("[assignPostAdmissionToReceivingAdvisor] update failed", updateErr, {
      caseId: input.caseId,
      advisorId: receivingAdvisor.id,
    });
    return { assigned: false };
  }

  if (!updated?.assigned_to) {
    return { assigned: false };
  }

  const advisorName =
    `${receivingAdvisor.firstName} ${receivingAdvisor.lastName}`.trim() || "Advisor";

  return { assigned: true, advisorName };
}

export async function fetchPostAdmissionReceivingAdvisor(): Promise<ApplicationReceivingAdvisor | null> {
  const secret = await createSupabaseSecretClient();
  return queryPostAdmissionReceivingAdvisor(secret);
}

async function queryFreeFunnelApplicationReceivingAdvisor(
  service: AdvisorReceivingSecret,
): Promise<ApplicationReceivingAdvisor | null> {
  const { data, error } = await service
    .from("advisors")
    .select("id, first_name, last_name, calendly_scheduling_url")
    .eq("receives_free_funnel_application_support", true)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[queryFreeFunnelApplicationReceivingAdvisor]", error);
    return null;
  }

  if (!data) return null;
  return mapReceivingAdvisorRow(data);
}

/** Assign a free-funnel application lead to the flagged receiving advisor. */
export async function assignFreeFunnelApplicationToReceivingAdvisor(
  service: AdvisorReceivingSecret,
  input: { applicationId: number; studentId: string },
): Promise<{ assigned: boolean; advisorName?: string }> {
  const receivingAdvisor = await queryFreeFunnelApplicationReceivingAdvisor(service);
  if (!receivingAdvisor) {
    console.warn(
      "[assignFreeFunnelApplicationToReceivingAdvisor] No active advisor with receives_free_funnel_application_support",
      { applicationId: input.applicationId },
    );
    return { assigned: false };
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateErr } = await service
    .from("applications")
    .update({
      assigned_to: receivingAdvisor.id,
      assigned_at: now,
      updated_at: now,
    })
    .eq("id", input.applicationId)
    .select("id, assigned_to")
    .maybeSingle();

  if (updateErr) {
    console.error("[assignFreeFunnelApplicationToReceivingAdvisor] update failed", updateErr, {
      applicationId: input.applicationId,
      advisorId: receivingAdvisor.id,
    });
    return { assigned: false };
  }

  if (!updated?.assigned_to) {
    return { assigned: false };
  }

  const advisorName =
    `${receivingAdvisor.firstName} ${receivingAdvisor.lastName}`.trim() || "Advisor";

  return { assigned: true, advisorName };
}

export async function fetchFreeFunnelApplicationReceivingAdvisor(): Promise<ApplicationReceivingAdvisor | null> {
  const secret = await createSupabaseSecretClient();
  return queryFreeFunnelApplicationReceivingAdvisor(secret);
}

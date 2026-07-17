"use server";

import { assertAdvisorAccess } from "@/lib/advisor-access";
import {
  advisorHasCalendlyConnection,
  disconnectAdvisorCalendly,
} from "@/lib/calendly-oauth";
import { logCalendlyError } from "@/lib/calendly-log";
import type { GeneralResponse } from "@/utils/response";
import { revalidatePath } from "next/cache";

export async function disconnectCalendlyAction(): Promise<GeneralResponse<null>> {
  const access = await assertAdvisorAccess();
  if (!access.ok) {
    return { data: null, error: access.error };
  }

  const advisorId = access.advisorId;

  const connected = await advisorHasCalendlyConnection(advisorId);
  if (!connected) {
    return { data: null, error: "Calendly is not connected." };
  }

  try {
    await disconnectAdvisorCalendly(advisorId);
  } catch (err) {
    logCalendlyError("oauth", "disconnectCalendlyAction failed", err, { advisorId });
    return {
      data: null,
      error: err instanceof Error ? err.message : "Could not disconnect Calendly.",
    };
  }

  revalidatePath("/advisor/settings");
  return { data: null, error: null };
}

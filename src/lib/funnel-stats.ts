import "server-only";

import {
  CUSTOM_WITH_FORM_LANDING_PAGE_PATH,
  getPageVisitCount,
  INFLUENCER_LANDING_PAGE_PATH,
} from "@/lib/page-visits";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export const MILAD_SIGNUP_SOURCE = "custom-signup" as const;
export const CUSTOM_WITH_FORM_SIGNUP_SOURCE = "custom-with-form-signup" as const;

export type FunnelSignupSource =
  | typeof MILAD_SIGNUP_SOURCE
  | typeof CUSTOM_WITH_FORM_SIGNUP_SOURCE;

export type FunnelStats = {
  landingPath: string;
  visits: number;
  signups: number;
};

export async function getFunnelSignupCount(source: FunnelSignupSource): Promise<number> {
  const supabase = await createSupabaseSecretClient();
  const { count, error } = await supabase
    .from("student_profiles")
    .select("id", { count: "exact", head: true })
    .eq("student_type", "custom")
    .filter("meta_data->>source", "eq", source);

  if (error) {
    console.error("[getFunnelSignupCount]", error);
    return 0;
  }

  return count ?? 0;
}

export async function getMiladFunnelStats(): Promise<FunnelStats> {
  const [visits, signups] = await Promise.all([
    getPageVisitCount(INFLUENCER_LANDING_PAGE_PATH),
    getFunnelSignupCount(MILAD_SIGNUP_SOURCE),
  ]);

  return {
    landingPath: INFLUENCER_LANDING_PAGE_PATH,
    visits,
    signups,
  };
}

export async function getCustomWithFormFunnelStats(): Promise<FunnelStats> {
  const [visits, signups] = await Promise.all([
    getPageVisitCount(CUSTOM_WITH_FORM_LANDING_PAGE_PATH),
    getFunnelSignupCount(CUSTOM_WITH_FORM_SIGNUP_SOURCE),
  ]);

  return {
    landingPath: CUSTOM_WITH_FORM_LANDING_PAGE_PATH,
    visits,
    signups,
  };
}

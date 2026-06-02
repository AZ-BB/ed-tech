"use server";

import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

import { fetchAdminReportData } from "../_lib/fetch-admin-report-data";
import { reportDateBoundsFromInputs } from "../_lib/report-date-range";
import type { AdminReportPayload } from "../_lib/report-payloads";
import { isAdminReportType } from "../_lib/report-types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type GenerateAdminReportInput = {
  schoolId: string;
  startDate: string;
  endDate: string;
  reportType: string;
};

export type GenerateAdminReportResult =
  | { ok: true; payload: AdminReportPayload }
  | { ok: false; error: string };

async function assertActiveAdmin(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return false;

  const service = await createSupabaseSecretClient();
  const { data: profile } = await service
    .from("admins")
    .select("is_active")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.is_active !== false;
}

export async function generateAdminReport(
  input: GenerateAdminReportInput,
): Promise<GenerateAdminReportResult> {
  const isAdmin = await assertActiveAdmin();
  if (!isAdmin) {
    return { ok: false, error: "Unauthorized" };
  }

  const schoolId = input.schoolId?.trim() ?? "";
  if (schoolId && !UUID_RE.test(schoolId)) {
    return { ok: false, error: "Invalid school" };
  }

  if (!isAdminReportType(input.reportType)) {
    return { ok: false, error: "Invalid report type" };
  }

  const bounds = reportDateBoundsFromInputs(
    input.startDate?.trim() ?? "",
    input.endDate?.trim() ?? "",
  );
  if (!bounds) {
    return { ok: false, error: "Invalid date range (max 366 days)" };
  }

  try {
    const payload = await fetchAdminReportData(
      {
        schoolId,
        startDate: bounds.startDate,
        endDate: bounds.endDate,
        reportType: input.reportType,
      },
      bounds,
    );
    return { ok: true, payload };
  } catch (e) {
    console.error("[generateAdminReport]", e);
    return { ok: false, error: "Failed to load report data" };
  }
}

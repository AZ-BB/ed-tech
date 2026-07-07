import type { Database } from "@/database.types";
import type { ApplicationPayoutRow } from "@/lib/advisor-payouts/types";
import { resolveCurrentAdvisorId } from "@/lib/advisor-access";
import { fetchPostAdmissionCalls } from "@/lib/fetch-post-admission-calls";
import {
  firstEmbed,
  mapPostAdmissionDetailPayload,
  type PostAdmissionDetailPayload,
} from "@/lib/post-admission-detail-mapper";
import { fetchPostAdmissionInternalNotes } from "@/lib/post-admission-internal-notes";
import {
  fetchPostAdmissionPayouts,
  fetchPostAdmissionPayoutSummary,
} from "@/lib/post-admission-payouts/fetch-post-admission-payouts";
import { expireOverduePendingPayments } from "@/lib/payment-request-utils";
import { resolvePaymentFromEmailDisplay } from "@/lib/resend/application-payment-request-email";
import type { ApplicationPayoutSummary } from "@/lib/advisor-payouts/types";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

export type AdvisorPostAdmissionDetailPayload = PostAdmissionDetailPayload & {
  postAdmissionPayouts: ApplicationPayoutRow[];
  payoutSummary: ApplicationPayoutSummary;
  paymentSender: { name: string; email: string };
  fromEmailDisplay: string;
  studentFirstName: string;
};

type CaseRow = Database["public"]["Tables"]["post_admission_cases"]["Row"] & {
  student_profiles:
    | {
        id: string;
        first_name: string;
        last_name: string;
        email: string | null;
        school_id: string | null;
      }
    | {
        id: string;
        first_name: string;
        last_name: string;
        email: string | null;
        school_id: string | null;
      }[]
    | null;
  schools: { id: string; name: string } | { id: string; name: string }[] | null;
  advisors:
    | { id: string; first_name: string; last_name: string; email: string | null }
    | { id: string; first_name: string; last_name: string; email: string | null }[]
    | null;
};

const POST_ADMISSION_DETAIL_SELECT = `
  *,
  student_profiles ( id, first_name, last_name, email, school_id ),
  schools ( id, name ),
  advisors:assigned_to ( id, first_name, last_name, email )
`;

export async function fetchAdvisorPostAdmissionDetail(
  caseIdRaw: string,
): Promise<AdvisorPostAdmissionDetailPayload | null> {
  const caseId = Number.parseInt(caseIdRaw.trim(), 10);
  if (!Number.isFinite(caseId) || caseId < 1) return null;

  const supabase = await createSupabaseServerClient();
  const advisorId = await resolveCurrentAdvisorId(supabase);
  if (!advisorId) return null;

  const secret = await createSupabaseSecretClient();
  await expireOverduePendingPayments(secret, { postAdmissionCaseId: caseId });

  const { data, error } = await supabase
    .from("post_admission_cases")
    .select(POST_ADMISSION_DETAIL_SELECT)
    .eq("id", caseId)
    .eq("assigned_to", advisorId)
    .maybeSingle();

  if (error) {
    console.error("[fetchAdvisorPostAdmissionDetail]", error);
    return null;
  }

  if (!data) return null;

  const caseRow = data as unknown as CaseRow;
  const profile = firstEmbed(caseRow.student_profiles);
  const schoolEmbed = firstEmbed(caseRow.schools);
  const advisorEmbed = firstEmbed(caseRow.advisors);

  const student = profile
    ? {
        id: profile.id,
        firstName: profile.first_name?.trim() || "",
        lastName: profile.last_name?.trim() || "",
        email: profile.email?.trim() || caseRow.student_email?.trim() || "",
        schoolId: profile.school_id,
      }
    : null;

  const school = schoolEmbed
    ? { id: schoolEmbed.id, name: schoolEmbed.name?.trim() || caseRow.school_name?.trim() || "—" }
    : caseRow.school_name?.trim()
      ? { id: caseRow.school_id ?? "", name: caseRow.school_name.trim() }
      : null;

  const advisor = advisorEmbed
    ? {
        id: advisorEmbed.id,
        firstName: advisorEmbed.first_name?.trim() || "",
        lastName: advisorEmbed.last_name?.trim() || "",
        email: advisorEmbed.email?.trim() || "",
      }
    : null;

  const { data: advisorRow } = await supabase
    .from("advisors")
    .select("first_name, last_name, email")
    .eq("id", advisorId)
    .maybeSingle();

  const advisorName =
    [advisorRow?.first_name, advisorRow?.last_name].filter(Boolean).join(" ").trim() ||
    "Advisor";
  const advisorEmail = advisorRow?.email?.trim() || "";

  const [
    { data: payments },
    internalNotes,
    calls,
    allPayouts,
    payoutSummary,
  ] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, amount, status, due_date, created_at, payment_request_sent_at, paid_at, payment_request_token",
      )
      .eq("post_admission_case_id", caseId)
      .order("created_at", { ascending: false }),
    fetchPostAdmissionInternalNotes(supabase, caseId),
    fetchPostAdmissionCalls(supabase, caseId),
    fetchPostAdmissionPayouts(supabase, caseId),
    fetchPostAdmissionPayoutSummary(supabase, caseId, advisorId),
  ]);

  const postAdmissionPayouts = allPayouts.filter((payout) => payout.advisorId === advisorId);

  const payload = mapPostAdmissionDetailPayload({
    caseRow,
    student,
    school,
    advisor,
    payments: payments ?? [],
    internalNotes,
    calls,
  });

  const studentFirstName =
    student?.firstName?.trim() ||
    caseRow.student_name?.trim().split(/\s+/)[0] ||
    "Student";

  return {
    ...payload,
    postAdmissionPayouts,
    payoutSummary,
    paymentSender: { name: advisorName, email: advisorEmail },
    fromEmailDisplay: resolvePaymentFromEmailDisplay(),
    studentFirstName,
  };
}

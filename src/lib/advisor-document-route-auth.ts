import { assertAdvisorAccess } from "@/lib/advisor-access";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AdvisorDocumentRouteAuthResult =
  | { ok: true; service: Awaited<ReturnType<typeof createSupabaseSecretClient>> }
  | { ok: false; status: number; error: string };

async function assertAdvisorAssignedStudent(
  advisorId: string,
  studentId: string,
  service: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data: application, error } = await service
    .from("applications")
    .select("id")
    .eq("student_id", studentId)
    .eq("assigned_to", advisorId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[assertAdvisorAssignedStudent]", error);
    return { ok: false, status: 500, error: "Could not verify application access." };
  }

  if (!application) {
    return {
      ok: false,
      status: 403,
      error: "You do not have access to this student's documents.",
    };
  }

  return { ok: true };
}

export async function assertAdvisorDocumentEditRouteAccess(
  documentId: string,
): Promise<AdvisorDocumentRouteAuthResult> {
  const access = await assertAdvisorAccess();
  if (!access.ok) {
    const status =
      access.error === "You must be signed in." ? 401 : 403;
    return { ok: false, status, error: access.error };
  }

  if (!documentId || !UUID_RE.test(documentId)) {
    return { ok: false, status: 400, error: "Invalid document." };
  }

  const service = await createSupabaseSecretClient();
  const { data: doc, error: docErr } = await service
    .from("student_my_application_documents")
    .select("student_id")
    .eq("id", documentId)
    .maybeSingle();

  if (docErr || !doc) {
    return { ok: false, status: 404, error: "Document not found." };
  }

  const assignment = await assertAdvisorAssignedStudent(
    access.advisorId,
    doc.student_id,
    service,
  );
  if (!assignment.ok) {
    return { ok: false, status: assignment.status, error: assignment.error };
  }

  return { ok: true, service };
}

export async function assertAdvisorDocumentViewRouteAccess(
  documentId: string,
): Promise<AdvisorDocumentRouteAuthResult> {
  return assertAdvisorDocumentEditRouteAccess(documentId);
}

export async function assertAdvisorDocumentSession(): Promise<
  | { ok: true; advisorId: string; service: Awaited<ReturnType<typeof createSupabaseSecretClient>> }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false, error: "You must be signed in." };
  }

  const access = await assertAdvisorAccess();
  if (!access.ok) {
    return { ok: false, error: access.error };
  }

  const service = await createSupabaseSecretClient();
  return { ok: true, advisorId: access.advisorId, service };
}

export async function assertAdvisorCanAccessStudent(
  studentId: string,
): Promise<
  | { ok: true; advisorId: string; service: Awaited<ReturnType<typeof createSupabaseSecretClient>> }
  | { ok: false; error: string }
> {
  const access = await assertAdvisorDocumentSession();
  if (!access.ok) return access;

  if (!studentId || !UUID_RE.test(studentId)) {
    return { ok: false, error: "Invalid student." };
  }

  const assignment = await assertAdvisorAssignedStudent(
    access.advisorId,
    studentId,
    access.service,
  );
  if (!assignment.ok) {
    return { ok: false, error: assignment.error };
  }

  return access;
}

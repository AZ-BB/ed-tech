import { APPLICATION_DOCUMENTS_BUCKET } from "@/lib/application-checklist-constants";
import type { createSupabaseSecretClient } from "@/utils/supabase-server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_BYTES = 10 * 1024 * 1024;

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type UniversityTargetUploadResult =
  | { ok: true; applicationId: number; studentId: string }
  | { ok: false; error: string };

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "file";
}

function resolveContentType(file: File): string {
  const fromBrowser = file.type?.trim();
  if (fromBrowser) return fromBrowser;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const byExt: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return byExt[ext] ?? "application/octet-stream";
}

export async function uploadUniversityTargetDocumentFile(
  secret: SecretClient,
  requirementId: string,
  file: File,
): Promise<UniversityTargetUploadResult> {
  if (!requirementId || !UUID_RE.test(requirementId)) {
    return { ok: false, error: "Invalid document requirement." };
  }

  if (file.size < 1) {
    return { ok: false, error: "Choose a file to upload." };
  }

  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File must be 10 MB or smaller." };
  }

  const { data: requirement, error: reqErr } = await secret
    .from("application_university_document_requirements")
    .select(
      `
      id,
      university_target_id,
      application_university_targets!inner (
        id,
        application_id
      )
    `,
    )
    .eq("id", requirementId)
    .maybeSingle();

  if (reqErr || !requirement) {
    return { ok: false, error: "Document requirement not found." };
  }

  const targetEmbed = requirement.application_university_targets as
    | { id: string; application_id: number }
    | { id: string; application_id: number }[];
  const target = Array.isArray(targetEmbed) ? targetEmbed[0] : targetEmbed;
  if (!target) {
    return { ok: false, error: "University target not found." };
  }

  const applicationId = target.application_id;
  const targetId = target.id;

  const { data: application, error: appErr } = await secret
    .from("applications")
    .select("id, student_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (appErr || !application) {
    return { ok: false, error: "Application not found." };
  }

  const studentId = application.student_id;
  const safe = sanitizeFilename(file.name);
  const path = `${studentId}/${applicationId}/university-targets/${targetId}/${requirementId}_${safe}`;
  const contentType = resolveContentType(file);
  const buf = Buffer.from(await file.arrayBuffer());
  const now = new Date().toISOString();

  const { error: upErr } = await secret.storage
    .from(APPLICATION_DOCUMENTS_BUCKET)
    .upload(path, buf, { contentType, upsert: true });

  if (upErr) {
    console.error("[uploadUniversityTargetDocumentFile] storage", upErr);
    return { ok: false, error: upErr.message || "Could not upload the file." };
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const url = `${base}/storage/v1/object/${APPLICATION_DOCUMENTS_BUCKET}/${path}`;

  const { data: existing } = await secret
    .from("application_university_document_files")
    .select("id")
    .eq("requirement_id", requirementId)
    .maybeSingle();

  const filePayload = {
    source_type: "upload" as const,
    url,
    file_name: file.name,
    file_size: file.size,
    file_type: contentType,
    uploaded_at: now,
    checklist_document_id: null,
    updated_at: now,
  };

  if (existing) {
    const { error: updateErr } = await secret
      .from("application_university_document_files")
      .update(filePayload)
      .eq("id", existing.id);

    if (updateErr) {
      console.error("[uploadUniversityTargetDocumentFile] update", updateErr);
      await secret.storage.from(APPLICATION_DOCUMENTS_BUCKET).remove([path]);
      return { ok: false, error: "Could not save document metadata." };
    }
  } else {
    const { error: insertErr } = await secret
      .from("application_university_document_files")
      .insert({ requirement_id: requirementId, ...filePayload });

    if (insertErr) {
      console.error("[uploadUniversityTargetDocumentFile] insert", insertErr);
      await secret.storage.from(APPLICATION_DOCUMENTS_BUCKET).remove([path]);
      return { ok: false, error: "Could not save document metadata." };
    }
  }

  await secret
    .from("applications")
    .update({ updated_at: now })
    .eq("id", applicationId);

  return { ok: true, applicationId, studentId };
}

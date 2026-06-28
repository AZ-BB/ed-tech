import "server-only";

import { sendStudentDocumentReminderEmail } from "@/lib/resend/student-document-reminder-email";
import { buildStudentMyApplicationsUrl } from "@/lib/resend/site-url";
import { isDocumentMissingForReminder } from "@/lib/student-document-reminder";

type SendReminderInput = {
  studentEmail: string;
  studentFirstName: string | null;
  studentLastName: string | null;
  documentDisplayName: string;
  documentStatus: string;
  documentStoragePath: string | null;
  requestedByName: string;
  requestedByRole: "school" | "admin" | "advisor";
};

export async function deliverStudentDocumentReminder(
  input: SendReminderInput,
): Promise<{ ok: true } | { error: string }> {
  if (
    !isDocumentMissingForReminder(
      input.documentStatus,
      input.documentStoragePath,
    )
  ) {
    return { error: "This document is already uploaded." };
  }

  const email = input.studentEmail.trim();
  if (!email) {
    return { error: "This student has no email on file." };
  }

  const studentName =
    [input.studentFirstName, input.studentLastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "there";

  const uploadUrl = await buildStudentMyApplicationsUrl();
  const result = await sendStudentDocumentReminderEmail({
    to: email,
    studentName,
    documentName: input.documentDisplayName.trim() || "Document",
    uploadUrl,
    requestedByName: input.requestedByName,
    requestedByRole: input.requestedByRole,
  });

  if ("error" in result) {
    return { error: result.error };
  }

  return { ok: true };
}

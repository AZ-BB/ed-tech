export async function uploadAdminStudentDocumentViaApi(
  documentId: string,
  file: File,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const form = new FormData();
  form.set("documentId", documentId);
  form.set("file", file);

  let res: Response;
  try {
    res = await fetch("/api/admin/student-documents/upload", {
      method: "POST",
      body: form,
    });
  } catch {
    return { ok: false, error: "Could not reach the upload server." };
  }

  let data: { ok?: boolean; error?: string };
  try {
    data = (await res.json()) as { ok?: boolean; error?: string };
  } catch {
    return { ok: false, error: "Invalid response from upload server." };
  }

  if (!res.ok || !data.ok) {
    return {
      ok: false,
      error: data.error?.trim() || "Could not upload the file.",
    };
  }

  return { ok: true };
}

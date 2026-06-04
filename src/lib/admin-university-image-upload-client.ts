import type { UniversityImageKind } from "@/lib/university-image-upload";

export async function uploadAdminUniversityImage(
  universityId: string,
  kind: UniversityImageKind,
  file: File,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const body = new FormData();
  body.append("kind", kind);
  body.append("file", file);

  let response: Response;
  try {
    response = await fetch(`/api/admin/universities/${universityId}/images`, {
      method: "POST",
      body,
    });
  } catch {
    return { ok: false, error: "Could not upload image. Check your connection." };
  }

  let payload: { url?: string; error?: string };
  try {
    payload = (await response.json()) as { url?: string; error?: string };
  } catch {
    return { ok: false, error: "Could not upload image." };
  }

  if (!response.ok) {
    return { ok: false, error: payload.error ?? "Could not upload image." };
  }

  const url = payload.url?.trim();
  if (!url) {
    return { ok: false, error: "Upload succeeded but no image URL was returned." };
  }

  return { ok: true, url };
}

export async function uploadAdminUniversityImages(
  universityId: string,
  files: { logo?: File | null; cover?: File | null },
): Promise<{ ok: true; logoUrl?: string; coverImageUrl?: string } | { ok: false; error: string }> {
  let logoUrl: string | undefined;
  let coverImageUrl: string | undefined;

  if (files.logo && files.logo.size > 0) {
    const result = await uploadAdminUniversityImage(universityId, "logo", files.logo);
    if (!result.ok) return result;
    logoUrl = result.url;
  }

  if (files.cover && files.cover.size > 0) {
    const result = await uploadAdminUniversityImage(universityId, "cover", files.cover);
    if (!result.ok) return result;
    coverImageUrl = result.url;
  }

  return { ok: true, logoUrl, coverImageUrl };
}

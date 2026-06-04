import {
  isAllowedImageFile,
  publicStorageObjectUrl,
  resolveContentType,
  sanitizeFilename,
} from "@/lib/storage-utils";
import type { createSupabaseSecretClient } from "@/utils/supabase-server";

export const UNIVERSITY_LOGOS_BUCKET = "university-logos";
export const UNIVERSITY_COVERS_BUCKET = "university-covers";
export const MAX_UNIVERSITY_IMAGE_BYTES = 5 * 1024 * 1024;

export type UniversityImageKind = "logo" | "cover";

const BUCKET_BY_KIND: Record<UniversityImageKind, string> = {
  logo: UNIVERSITY_LOGOS_BUCKET,
  cover: UNIVERSITY_COVERS_BUCKET,
};

const LABEL_BY_KIND: Record<UniversityImageKind, string> = {
  logo: "Logo",
  cover: "Cover image",
};

export async function uploadUniversityImageToStorage(
  service: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
  universityId: string,
  kind: UniversityImageKind,
  file: File,
): Promise<string> {
  const label = LABEL_BY_KIND[kind];
  const bucket = BUCKET_BY_KIND[kind];

  if (!isAllowedImageFile(file)) {
    throw new Error(`${label} must be a PNG, JPEG, WebP, GIF, or SVG image.`);
  }

  if (file.size > MAX_UNIVERSITY_IMAGE_BYTES) {
    throw new Error(`${label} must be 5 MB or smaller.`);
  }

  const safeName = sanitizeFilename(file.name);
  const path = `${universityId}/${Date.now()}_${safeName}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const contentType = resolveContentType(file);

  const { error } = await service.storage.from(bucket).upload(path, buf, {
    contentType,
    upsert: true,
  });

  if (error) throw error;

  return publicStorageObjectUrl(bucket, path);
}

export function universityImageColumn(
  kind: UniversityImageKind,
): "logo_url" | "cover_image_url" {
  return kind === "logo" ? "logo_url" : "cover_image_url";
}

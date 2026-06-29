import {
  isAllowedImageFile,
  publicStorageObjectUrl,
  resolveContentType,
  sanitizeFilename,
} from "@/lib/storage-utils";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export const WEBINAR_HOST_IMAGES_BUCKET = "webinar-host-images";
const MAX_HOST_IMAGE_BYTES = 5 * 1024 * 1024;

export async function uploadWebinarHostImage(
  webinarId: number,
  file: File,
): Promise<string> {
  if (!isAllowedImageFile(file)) {
    throw new Error("Host image must be a PNG, JPEG, WebP, or GIF image.");
  }

  if (file.size > MAX_HOST_IMAGE_BYTES) {
    throw new Error("Host image must be 5 MB or smaller.");
  }

  const service = await createSupabaseSecretClient();
  const safeName = sanitizeFilename(file.name);
  const path = `${webinarId}/${Date.now()}_${safeName}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const contentType = resolveContentType(file);

  const { error } = await service.storage.from(WEBINAR_HOST_IMAGES_BUCKET).upload(path, buf, {
    contentType,
    upsert: true,
  });

  if (error) throw error;

  return publicStorageObjectUrl(WEBINAR_HOST_IMAGES_BUCKET, path);
}

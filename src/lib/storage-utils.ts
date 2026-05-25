const IMAGE_EXTENSIONS: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload";
}

export function resolveContentType(file: File): string {
  if (file.type?.trim()) return file.type.trim();

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS[ext] ?? "application/octet-stream";
}

export function publicStorageObjectUrl(bucket: string, path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

export function isAllowedImageFile(file: File): boolean {
  const contentType = resolveContentType(file).toLowerCase();
  return contentType.startsWith("image/");
}

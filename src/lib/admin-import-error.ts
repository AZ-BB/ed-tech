type PostgrestLikeError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

/** Turn thrown values (incl. Supabase PostgREST errors) into a readable import message. */
export function formatImportError(error: unknown): string {
  if (error == null) return "Unknown error";

  if (typeof error === "string") {
    const text = error.trim();
    if (!text || text === "[object Object]") return "Unknown error";
    return text;
  }

  if (error instanceof Error) {
    const text = error.message.trim();
    return text || "Unknown error";
  }

  if (typeof error === "object") {
    const e = error as PostgrestLikeError;
    const parts: string[] = [];

    if (typeof e.message === "string" && e.message.trim()) {
      parts.push(e.message.trim());
    }
    if (
      typeof e.details === "string" &&
      e.details.trim() &&
      e.details.trim() !== e.message?.trim()
    ) {
      parts.push(e.details.trim());
    }
    if (typeof e.hint === "string" && e.hint.trim()) {
      parts.push(`Hint: ${e.hint.trim()}`);
    }
    if (typeof e.code === "string" && e.code.trim()) {
      parts.push(`Code: ${e.code.trim()}`);
    }

    if (parts.length > 0) return parts.join(" — ");

    try {
      const json = JSON.stringify(error);
      if (json && json !== "{}") return json;
    } catch {
      // ignore
    }
  }

  const fallback = String(error);
  return fallback === "[object Object]" ? "Unknown error" : fallback;
}

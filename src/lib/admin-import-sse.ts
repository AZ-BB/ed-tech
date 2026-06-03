import type { ImportProgressPayload } from "@/lib/admin-import-progress";

export type ImportSseEventName = "progress" | "complete" | "error";

export type ImportSseHandlers<TSummary> = {
  onProgress?: (progress: ImportProgressPayload) => void;
  onComplete?: (summary: TSummary) => void;
  onError?: (message: string) => void;
};

export function encodeSseEvent(event: ImportSseEventName, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function createImportSseStream<TSummary>(
  run: (send: (event: ImportSseEventName, data: unknown) => void) => Promise<TSummary>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const send = (event: ImportSseEventName, data: unknown) => {
        controller.enqueue(encoder.encode(encodeSseEvent(event, data)));
      };

      try {
        const summary = await run(send);
        send("complete", summary);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Import failed.";
        send("error", { message });
      } finally {
        controller.close();
      }
    },
  });
}

export function importSseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

type ParsedSseMessage = {
  event: ImportSseEventName;
  data: unknown;
};

function parseSseChunk(buffer: string): { messages: ParsedSseMessage[]; remainder: string } {
  const messages: ParsedSseMessage[] = [];
  const blocks = buffer.split("\n\n");
  const remainder = blocks.pop() ?? "";

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    let event: ImportSseEventName = "progress";
    const dataLines: string[] = [];

    for (const line of trimmed.split("\n")) {
      if (line.startsWith("event:")) {
        const name = line.slice(6).trim();
        if (name === "progress" || name === "complete" || name === "error") {
          event = name;
        }
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }

    const dataRaw = dataLines.join("\n");
    if (!dataRaw) continue;

    try {
      messages.push({ event, data: JSON.parse(dataRaw) as unknown });
    } catch {
      // ignore malformed chunks
    }
  }

  return { messages, remainder };
}

export async function postFormImportWithSse<TSummary>(
  url: string,
  formData: FormData,
  handlers: ImportSseHandlers<TSummary>,
): Promise<TSummary> {
  const response = await fetch(url, { method: "POST", body: formData });
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? "Import failed.");
    }
    throw new Error(`Import failed (${response.status}).`);
  }

  if (!contentType.includes("text/event-stream") || !response.body) {
    const text = await response.text();
    try {
      const payload = JSON.parse(text) as TSummary & { error?: string };
      if ("error" in payload && typeof payload.error === "string") {
        throw new Error(payload.error);
      }
      handlers.onComplete?.(payload);
      return payload;
    } catch {
      throw new Error("Invalid response from server.");
    }
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let summary: TSummary | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const { messages, remainder } = parseSseChunk(buffer);
    buffer = remainder;

    for (const message of messages) {
      if (message.event === "progress") {
        handlers.onProgress?.(message.data as ImportProgressPayload);
      } else if (message.event === "complete") {
        summary = message.data as TSummary;
        handlers.onComplete?.(summary);
      } else if (message.event === "error") {
        const err = message.data as { message?: string };
        const msg = err.message ?? "Import failed.";
        handlers.onError?.(msg);
        throw new Error(msg);
      }
    }
  }

  if (summary == null) {
    throw new Error("Import finished without a result.");
  }

  return summary;
}

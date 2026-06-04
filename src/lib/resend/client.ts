import "server-only";

import { Resend } from "resend";
import { getResendApiKey } from "@/lib/resend/config";

let resendClient: Resend | null = null;

/** Lazily constructs a singleton Resend client when `RESEND_API_KEY` is set. */
export function getResendClient(): Resend | null {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

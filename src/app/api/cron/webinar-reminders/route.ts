import { NextResponse } from "next/server";
import { sendWebinarDayBeforeReminders } from "@/lib/send-webinar-emails";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const authHeader = request.headers.get("authorization")?.trim();
  if (!authHeader) return false;

  const [scheme, token] = authHeader.split(/\s+/);
  return scheme?.toLowerCase() === "bearer" && token === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendWebinarDayBeforeReminders();

  return NextResponse.json({
    ok: true,
    sent: result.sent,
    skipped: result.skipped,
    errors: result.errors,
  });
}

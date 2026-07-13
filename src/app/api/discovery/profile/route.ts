import { NextResponse } from "next/server";
import { buildStudentDiscoveryProfileResponse } from "@/lib/discovery/submit-discovery-module";
import { requireStudentSession } from "@/lib/student-ai-usage-log";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const service = await createSupabaseSecretClient();
    const profile = await buildStudentDiscoveryProfileResponse(service, auth.studentId);
    return NextResponse.json(profile);
  } catch (error) {
    console.error("[discovery/profile] GET", error);
    return NextResponse.json({ error: "Failed to load discovery profile." }, { status: 500 });
  }
}

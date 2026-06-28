import { NextResponse } from "next/server";
import type { AdvisorNotificationsResponse } from "@/lib/advisor-notifications";
import { requireAdvisorContext } from "@/lib/advisor-access";
import { createSupabaseServerClient } from "@/utils/supabase-server";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function GET(request: Request) {
  const auth = await requireAdvisorContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(MAX_LIMIT, Math.max(1, limitRaw))
    : DEFAULT_LIMIT;

  const supabase = await createSupabaseServerClient();

  const { data: rows, error } = await supabase
    .from("advisor_notifications")
    .select(
      `
      id,
      event_type,
      title,
      body,
      link_path,
      created_at,
      student_id,
      student_profiles (
        first_name,
        last_name
      )
    `,
    )
    .eq("advisor_id", auth.advisorId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[GET /api/advisor/notifications]", error);
    return NextResponse.json(
      { error: "Could not load notifications." },
      { status: 500 },
    );
  }

  const notificationIds = (rows ?? []).map((r) => r.id);
  const readSet = new Set<string>();

  if (notificationIds.length > 0) {
    const { data: reads, error: readsErr } = await supabase
      .from("advisor_notification_reads")
      .select("notification_id")
      .eq("advisor_id", auth.advisorId)
      .in("notification_id", notificationIds);

    if (readsErr) {
      console.error("[GET /api/advisor/notifications] reads", readsErr);
      return NextResponse.json(
        { error: "Could not load notification read state." },
        { status: 500 },
      );
    }

    for (const r of reads ?? []) {
      readSet.add(r.notification_id);
    }
  }

  const items = (rows ?? []).map((row) => {
    const profile = row.student_profiles as
      | { first_name: string | null; last_name: string | null }
      | null
      | undefined;
    const studentName =
      [profile?.first_name?.trim(), profile?.last_name?.trim()]
        .filter(Boolean)
        .join(" ") || "Student";

    return {
      id: row.id,
      title: row.title,
      body: row.body,
      linkPath: row.link_path,
      createdAt: row.created_at,
      read: readSet.has(row.id),
      studentName,
      eventType: row.event_type,
    };
  });

  const unreadCount = items.filter((item) => !item.read).length;

  const payload: AdvisorNotificationsResponse = {
    unreadCount,
    items,
  };

  return NextResponse.json(payload);
}

"use server";

import type { GeneralResponse } from "@/utils/response";
import { requireAdvisorContext } from "@/lib/advisor-access";
import { createSupabaseServerClient } from "@/utils/supabase-server";

export async function markAdvisorNotificationReadAction(
  notificationId: string,
): Promise<GeneralResponse<null>> {
  const auth = await requireAdvisorContext();
  if ("error" in auth) {
    return { data: null, error: auth.error };
  }

  const id = notificationId.trim();
  if (!id) {
    return { data: null, error: "Invalid notification." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: notification, error: nErr } = await supabase
    .from("advisor_notifications")
    .select("id")
    .eq("id", id)
    .eq("advisor_id", auth.advisorId)
    .maybeSingle();

  if (nErr) {
    console.error("[markAdvisorNotificationReadAction]", nErr);
    return { data: null, error: "Could not verify notification." };
  }

  if (!notification) {
    return { data: null, error: "Notification not found." };
  }

  const { error: upErr } = await supabase
    .from("advisor_notification_reads")
    .upsert(
      {
        notification_id: id,
        advisor_id: auth.advisorId,
        read_at: new Date().toISOString(),
      },
      { onConflict: "notification_id,advisor_id" },
    );

  if (upErr) {
    console.error("[markAdvisorNotificationReadAction] upsert", upErr);
    return { data: null, error: "Could not mark notification as read." };
  }

  return { data: null, error: null };
}

export async function markAllAdvisorNotificationsReadAction(): Promise<
  GeneralResponse<null>
> {
  const auth = await requireAdvisorContext();
  if ("error" in auth) {
    return { data: null, error: auth.error };
  }

  const supabase = await createSupabaseServerClient();

  const { data: notifications, error: nErr } = await supabase
    .from("advisor_notifications")
    .select("id")
    .eq("advisor_id", auth.advisorId);

  if (nErr) {
    console.error("[markAllAdvisorNotificationsReadAction]", nErr);
    return { data: null, error: "Could not load notifications." };
  }

  const ids = (notifications ?? []).map((n) => n.id);
  if (ids.length === 0) {
    return { data: null, error: null };
  }

  const { data: existingReads, error: rErr } = await supabase
    .from("advisor_notification_reads")
    .select("notification_id")
    .eq("advisor_id", auth.advisorId)
    .in("notification_id", ids);

  if (rErr) {
    console.error("[markAllAdvisorNotificationsReadAction] reads", rErr);
    return { data: null, error: "Could not load read state." };
  }

  const readSet = new Set((existingReads ?? []).map((r) => r.notification_id));
  const unreadIds = ids.filter((id) => !readSet.has(id));

  if (unreadIds.length === 0) {
    return { data: null, error: null };
  }

  const now = new Date().toISOString();
  const rows = unreadIds.map((notification_id) => ({
    notification_id,
    advisor_id: auth.advisorId,
    read_at: now,
  }));

  const { error: insErr } = await supabase
    .from("advisor_notification_reads")
    .insert(rows);

  if (insErr) {
    console.error("[markAllAdvisorNotificationsReadAction] insert", insErr);
    return { data: null, error: "Could not mark all notifications as read." };
  }

  return { data: null, error: null };
}

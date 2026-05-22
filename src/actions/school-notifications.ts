"use server";

import type { GeneralResponse } from "@/utils/response";
import { requireSchoolAdminContext } from "@/actions/school-settings-helpers";
import { createSupabaseServerClient } from "@/utils/supabase-server";

export async function markSchoolNotificationReadAction(
  notificationId: string,
): Promise<GeneralResponse<null>> {
  const auth = await requireSchoolAdminContext();
  if ("error" in auth) {
    return { data: null, error: auth.error };
  }

  const id = notificationId.trim();
  if (!id) {
    return { data: null, error: "Invalid notification." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: notification, error: nErr } = await supabase
    .from("school_admin_notifications")
    .select("id")
    .eq("id", id)
    .eq("school_id", auth.schoolId)
    .maybeSingle();

  if (nErr) {
    console.error("[markSchoolNotificationReadAction]", nErr);
    return { data: null, error: "Could not verify notification." };
  }

  if (!notification) {
    return { data: null, error: "Notification not found." };
  }

  const { error: upErr } = await supabase
    .from("school_admin_notification_reads")
    .upsert(
      {
        notification_id: id,
        admin_id: auth.userId,
        read_at: new Date().toISOString(),
      },
      { onConflict: "notification_id,admin_id" },
    );

  if (upErr) {
    console.error("[markSchoolNotificationReadAction] upsert", upErr);
    return { data: null, error: "Could not mark notification as read." };
  }

  return { data: null, error: null };
}

export async function markAllSchoolNotificationsReadAction(): Promise<
  GeneralResponse<null>
> {
  const auth = await requireSchoolAdminContext();
  if ("error" in auth) {
    return { data: null, error: auth.error };
  }

  const supabase = await createSupabaseServerClient();

  const { data: notifications, error: nErr } = await supabase
    .from("school_admin_notifications")
    .select("id")
    .eq("school_id", auth.schoolId);

  if (nErr) {
    console.error("[markAllSchoolNotificationsReadAction]", nErr);
    return { data: null, error: "Could not load notifications." };
  }

  const ids = (notifications ?? []).map((n) => n.id);
  if (ids.length === 0) {
    return { data: null, error: null };
  }

  const { data: existingReads, error: rErr } = await supabase
    .from("school_admin_notification_reads")
    .select("notification_id")
    .eq("admin_id", auth.userId)
    .in("notification_id", ids);

  if (rErr) {
    console.error("[markAllSchoolNotificationsReadAction] reads", rErr);
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
    admin_id: auth.userId,
    read_at: now,
  }));

  const { error: insErr } = await supabase
    .from("school_admin_notification_reads")
    .insert(rows);

  if (insErr) {
    console.error("[markAllSchoolNotificationsReadAction] insert", insErr);
    return { data: null, error: "Could not mark all notifications as read." };
  }

  return { data: null, error: null };
}

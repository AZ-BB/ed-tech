import { SCHOOL_DEACTIVATED_LOGIN_MESSAGE, isSchoolActive } from "@/lib/school-access";
import { createSupabaseServerClient } from "@/utils/supabase-server";
import { redirect } from "next/navigation";

import { SchoolPortalShell } from "./_components/school-portal-shell";

function initialsFromNames(first: string, last: string) {
  const a = first.trim()[0];
  const b = last.trim()[0];
  const pair = `${a ?? ""}${b ?? ""}`.toUpperCase();
  if (pair) return pair.slice(0, 2);
  if (a) return a.toUpperCase();
  return "?";
}

function displayNameFromParts(first: string, last: string, fallback: string) {
  const full = [first, last]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
  return full || fallback;
}

function nameFromSchoolsEmbed(schools: unknown): string | null {
  if (schools && typeof schools === "object") {
    if (Array.isArray(schools)) {
      const n = schools[0]?.name;
      return typeof n === "string" && n.trim() ? n.trim() : null;
    }
    const n = (schools as { name?: string }).name;
    return typeof n === "string" && n.trim() ? n.trim() : null;
  }
  return null;
}

export default async function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let firstName = "";
  let lastName = "";
  let schoolName = "";
  let avatarUrl: string | null = null;

  if (user?.id) {
    const { data: profile } = await supabase
      .from("school_admin_profiles")
      .select("first_name, last_name, avatar_url, school_id, is_active, schools(name, is_active)")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.is_active === false) {
      await supabase.auth.signOut();
      redirect("/login?deactivated=1");
    }

    if (profile?.school_id) {
      const embeddedSchool = profile.schools as { is_active?: boolean } | null;
      const schoolActive =
        embeddedSchool?.is_active !== undefined
          ? embeddedSchool.is_active !== false
          : await isSchoolActive(profile.school_id);

      if (schoolActive === false) {
        await supabase.auth.signOut();
        redirect("/login?schoolDeactivated=1");
      }
    }

    if (profile) {
      firstName = profile.first_name?.trim() ?? "";
      lastName = profile.last_name?.trim() ?? "";
      avatarUrl = profile.avatar_url?.trim() || null;
      schoolName = nameFromSchoolsEmbed(profile.schools) ?? "";

      if (!schoolName && profile.school_id) {
        const { data: schoolRow } = await supabase
          .from("schools")
          .select("name")
          .eq("id", profile.school_id)
          .maybeSingle();
        const n = schoolRow?.name?.trim();
        if (n) schoolName = n;
      }
    }

    if (!schoolName) {
      schoolName = "School";
    }
  }

  const avatarInitials = initialsFromNames(firstName, lastName);
  const displayName = displayNameFromParts(
    firstName,
    lastName,
    user?.email?.split("@")[0]?.trim() || "School admin",
  );

  return (
    <SchoolPortalShell
      schoolName={schoolName}
      displayName={displayName}
      avatarInitials={avatarInitials}
      avatarUrl={avatarUrl}
    >
      {children}
    </SchoolPortalShell>
  );
}

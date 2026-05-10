import { createSupabaseServerClient } from "@/utils/supabase-server";

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

  if (user?.id) {
    const { data: profile } = await supabase
      .from("school_admin_profiles")
      .select("first_name, last_name, school_id, schools(name)")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      firstName = profile.first_name?.trim() ?? "";
      lastName = profile.last_name?.trim() ?? "";
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
    >
      {children}
    </SchoolPortalShell>
  );
}

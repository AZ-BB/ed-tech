import { createSupabaseServerClient } from "@/utils/supabase-server";

import { SchoolTopbar } from "./_components/school-topbar";

function initialsFromNames(first: string, last: string) {
  const a = first.trim()[0];
  const b = last.trim()[0];
  const pair = `${a ?? ""}${b ?? ""}`.toUpperCase();
  if (pair) return pair.slice(0, 2);
  if (a) return a.toUpperCase();
  return "?";
}

export default async function SchoolLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let firstName = "";
  let lastName = "";
  let schoolName = "School Portal";

  if (user?.id) {
    const { data: profile } = await supabase
      .from("school_admin_profiles")
      .select("first_name, last_name, schools(name)")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      firstName = profile.first_name?.trim() ?? "";
      lastName = profile.last_name?.trim() ?? "";
      const school = profile.schools;
      const name =
        school && !Array.isArray(school)
          ? school.name
          : Array.isArray(school)
            ? school[0]?.name
            : null;
      if (name) schoolName = name;
    }
  }

  if (!firstName) {
    const meta = user?.user_metadata as Record<string, unknown> | undefined;
    const fromMeta = meta?.firstName ?? meta?.first_name;
    if (typeof fromMeta === "string" && fromMeta.trim()) {
      firstName = fromMeta.trim();
    } else if (user?.email) {
      firstName = user.email.split("@")[0] ?? "";
    }
  }

  const avatarInitials = initialsFromNames(firstName, lastName);

  return (
    <div className="min-h-screen bg-[#f4f3f0] text-[#1a1a1a] antialiased">
      <SchoolTopbar firstName={firstName} schoolName={schoolName} avatarInitials={avatarInitials} />
      {children}
    </div>
  );
}

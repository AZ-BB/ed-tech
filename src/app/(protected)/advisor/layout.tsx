import { redirect } from "next/navigation";
import { Suspense } from "react";

import { fetchAdvisorSessionProfile } from "@/lib/advisor-access";
import { createSupabaseServerClient } from "@/utils/supabase-server";

import { AdvisorPortalShell } from "./_components/advisor-portal-shell";

function authedHomePath(type: unknown): string | null {
  switch (type) {
    case "student":
      return "/student";
    case "school":
    case "school_admin":
      return "/school";
    case "admin":
      return "/admin";
    case "advisor":
      return "/advisor";
    default:
      return null;
  }
}

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

export default async function AdvisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect("/login?next=/advisor");
  }

  const meta = user.user_metadata as { type?: string } | undefined;
  if (meta?.type !== "advisor") {
    const home = authedHomePath(meta?.type);
    redirect(home ?? "/login");
  }

  const session = await fetchAdvisorSessionProfile();

  if (!session.ok) {
    if (session.reason === "inactive") {
      await supabase.auth.signOut();
      redirect("/login?deactivated=1");
    }
    if (session.reason === "no_profile" || session.reason === "no_email") {
      await supabase.auth.signOut();
      redirect("/login");
    }
    redirect("/login?next=/advisor");
  }

  const { advisor } = session;
  const firstName = advisor.first_name?.trim() ?? "";
  const lastName = advisor.last_name?.trim() ?? "";
  const avatarUrl = advisor.avatar_url?.trim() || null;
  const title = advisor.title?.trim() || null;
  const avatarInitials = initialsFromNames(firstName, lastName);
  const displayName = displayNameFromParts(
    firstName,
    lastName,
    user.email?.split("@")[0]?.trim() || "Advisor",
  );

  return (
    <Suspense fallback={null}>
      <AdvisorPortalShell
        displayName={displayName}
        avatarInitials={avatarInitials}
        avatarUrl={avatarUrl}
        title={title}
      >
        {children}
      </AdvisorPortalShell>
    </Suspense>
  );
}

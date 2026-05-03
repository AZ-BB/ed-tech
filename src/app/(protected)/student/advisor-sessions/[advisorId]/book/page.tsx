import { requireStudentSession } from "@/lib/student-ai-usage-log";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BookAdvisorSessionClient } from "./_components/book-advisor-session-client";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export const metadata: Metadata = {
  title: "Book advisor session",
};

type PageProps = { params: Promise<{ advisorId: string }> };

export default async function BookAdvisorSessionPage({ params }: PageProps) {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    redirect("/login");
  }

  const { advisorId } = await params;
  if (!isUuid(advisorId)) {
    notFound();
  }

  const secret = await createSupabaseSecretClient();
  const { data } = await secret
    .from("advisors")
    .select("id, first_name, last_name, title")
    .eq("id", advisorId)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  return (
    <BookAdvisorSessionClient
      advisor={{
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        title: data.title,
      }}
    />
  );
}

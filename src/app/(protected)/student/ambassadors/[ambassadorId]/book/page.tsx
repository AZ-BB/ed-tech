import { requireStudentSession } from "@/lib/student-ai-usage-log";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BookAmbassadorSessionClient } from "./_components/book-ambassador-session-client";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export const metadata: Metadata = {
  title: "Book ambassador session",
};

type PageProps = { params: Promise<{ ambassadorId: string }> };

export default async function BookAmbassadorSessionPage({ params }: PageProps) {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    redirect("/login");
  }

  const { ambassadorId } = await params;
  if (!isUuid(ambassadorId)) {
    notFound();
  }

  const secret = await createSupabaseSecretClient();
  const { data } = await secret
    .from("ambassadors")
    .select(
      "id, first_name, last_name, university_name, destination_country_code, major, is_current_student, universities ( name )",
    )
    .eq("id", ambassadorId)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const uniJoin = data.universities as { name: string } | { name: string }[] | null;
  const uniName = Array.isArray(uniJoin) ? uniJoin[0]?.name : uniJoin?.name;
  const displayUniversity =
    (uniName?.trim() && uniName.trim().length > 0 ? uniName.trim() : data.university_name?.trim()) || "University TBD";
  const destinationLabel =
    getCountryNameByAlpha2(data.destination_country_code) ?? data.destination_country_code;

  return (
    <BookAmbassadorSessionClient
      ambassador={{
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        displayUniversity,
        destinationLabel,
        major: data.major,
        isCurrentStudent: data.is_current_student,
      }}
    />
  );
}

import { requireStudentSession } from "@/lib/student-ai-usage-log";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StudentStoriesClient } from "./_components/student-stories-client";
import { fetchStudentStoriesPage } from "./_lib/fetch-student-stories";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Student Stories",
};

export default async function StudentStoriesPage() {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    redirect("/login");
  }

  const { topics, stories } = await fetchStudentStoriesPage();

  return <StudentStoriesClient topics={topics} stories={stories} />;
}

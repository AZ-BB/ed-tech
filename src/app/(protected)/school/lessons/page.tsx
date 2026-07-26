import type { Metadata } from "next";

import { SchoolLessonsClient } from "./_components/school-lessons-client";
import { fetchSchoolLessonsPage } from "./_lib/fetch-school-lessons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lessons",
};

export default async function SchoolLessonsPage() {
  const lessons = await fetchSchoolLessonsPage();
  return <SchoolLessonsClient lessons={lessons} />;
}

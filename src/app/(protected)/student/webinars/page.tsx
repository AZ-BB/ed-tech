import { requireStudentSession } from "@/lib/student-ai-usage-log";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { WebinarsClient } from "./_components/webinars-client";
import {
  fetchStudentWebinarsPage,
  getStudentIdForWebinars,
} from "./_lib/fetch-student-webinars";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Webinars & Expert Sessions",
};

export default async function StudentWebinarsPage() {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    redirect("/login");
  }

  const studentId = await getStudentIdForWebinars();
  const webinars = await fetchStudentWebinarsPage(studentId);

  return <WebinarsClient initialWebinars={webinars} />;
}

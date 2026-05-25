import { requireStudentSession } from "@/lib/student-ai-usage-log";
import { redirect } from "next/navigation";

import { StudentLayoutShell } from "./_components/student-layout-shell";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    if (auth.deactivated) {
      redirect("/login?deactivated=1");
    }
    redirect("/login");
  }

  return <StudentLayoutShell>{children}</StudentLayoutShell>;
}

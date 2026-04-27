import { StudentLayoutShell } from "./_components/student-layout-shell";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StudentLayoutShell>{children}</StudentLayoutShell>;
}

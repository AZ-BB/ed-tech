"use client";

import { SchoolStudentDocumentsTab } from "@/app/(protected)/school/students/[id]/_components/school-student-documents-tab";
import type { Database } from "@/database.types";

type DocRow =
  Database["public"]["Tables"]["student_my_application_documents"]["Row"];

export function AdvisorStudentDocumentsTab({
  studentId,
  initialDocuments,
}: {
  studentId: string;
  initialDocuments: DocRow[];
}) {
  return (
    <SchoolStudentDocumentsTab
      studentId={studentId}
      initialDocuments={initialDocuments}
      portal="advisor"
    />
  );
}

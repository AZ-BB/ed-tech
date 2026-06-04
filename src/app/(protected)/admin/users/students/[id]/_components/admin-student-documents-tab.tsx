"use client";

import { SchoolStudentDocumentsTab } from "@/app/(protected)/school/students/[id]/_components/school-student-documents-tab";
import { useAdminPermissions } from "@/app/(protected)/admin/_components/admin-permissions-provider";
import type { Database } from "@/database.types";

type DocRow =
  Database["public"]["Tables"]["student_my_application_documents"]["Row"];

export function AdminStudentDocumentsTab({
  studentId,
  initialDocuments,
}: {
  studentId: string;
  initialDocuments: DocRow[];
}) {
  const { hasPermission } = useAdminPermissions();

  return (
    <SchoolStudentDocumentsTab
      studentId={studentId}
      initialDocuments={initialDocuments}
      portal="admin"
      canEditDocuments={hasPermission("edit_documents")}
    />
  );
}

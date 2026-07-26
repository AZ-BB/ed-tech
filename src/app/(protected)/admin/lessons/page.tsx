import type { Metadata } from "next";

import { AdminLessonsTableClient } from "./_components/admin-lessons-table-client";
import { fetchAdminLessonsPage } from "./_lib/fetch-admin-lessons-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lessons",
};

export default async function AdminLessonsPage() {
  const rows = await fetchAdminLessonsPage();
  return <AdminLessonsTableClient rows={rows} />;
}

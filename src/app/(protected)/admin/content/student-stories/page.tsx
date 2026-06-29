import { fetchAdminStudentStoriesPage } from "../_lib/fetch-admin-student-stories-page";
import { fetchAdminStudentStoryTopics } from "../_lib/fetch-admin-student-story-topics";
import { AdminStudentStoriesPageClient } from "../_components/admin-student-stories-page-client";

export default async function AdminContentStudentStoriesPage() {
  const [stories, topics] = await Promise.all([
    fetchAdminStudentStoriesPage(),
    fetchAdminStudentStoryTopics(),
  ]);

  return <AdminStudentStoriesPageClient stories={stories} topics={topics} />;
}

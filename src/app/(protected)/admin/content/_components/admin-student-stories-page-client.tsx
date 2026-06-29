"use client";

import type { AdminStudentStoryTableRow } from "../_lib/fetch-admin-student-stories-page";
import type { AdminStudentStoryTopicRow } from "../_lib/fetch-admin-student-story-topics";
import { AdminStudentStoriesTableClient } from "./admin-student-stories-table-client";
import { AdminStudentStoryTopicsPanel } from "./admin-student-story-topics-panel";

type AdminStudentStoriesPageClientProps = {
  stories: AdminStudentStoryTableRow[];
  topics: AdminStudentStoryTopicRow[];
};

export function AdminStudentStoriesPageClient({
  stories,
  topics,
}: AdminStudentStoriesPageClientProps) {
  return (
    <>
      <AdminStudentStoryTopicsPanel topics={topics} />
      <AdminStudentStoriesTableClient rows={stories} topics={topics} />
    </>
  );
}

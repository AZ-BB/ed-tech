import { SchoolTasksClient } from "./_components/school-tasks-client";
import {
  fetchSchoolStudentPickerOptions,
  fetchSchoolTasksPage,
} from "./_lib/fetch-school-tasks-page";

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export default async function SchoolTasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const when = typeof sp.when === "string" ? sp.when : "";
  const priority = typeof sp.priority === "string" ? sp.priority : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, parseIntParam(sp.page, 1));
  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 12)));

  const [{ rows, totalRows }, studentOptions] = await Promise.all([
    fetchSchoolTasksPage({ q, when, priority, status, page, limit }),
    fetchSchoolStudentPickerOptions(),
  ]);

  return (
    <SchoolTasksClient
      rows={rows}
      totalRows={totalRows}
      page={page}
      limit={limit}
      q={q}
      when={when}
      priority={priority}
      status={status}
      studentOptions={studentOptions}
    />
  );
}

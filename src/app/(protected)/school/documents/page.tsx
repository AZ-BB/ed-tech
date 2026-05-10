import { SchoolDocumentsClient } from "./_components/school-documents-client";
import { fetchSchoolDocumentsPage } from "./_lib/fetch-school-documents";

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export default async function SchoolDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, parseIntParam(sp.page, 1));
  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 12)));

  const { rows, totalRows } = await fetchSchoolDocumentsPage({
    q,
    status,
    page,
    limit,
  });

  return (
    <SchoolDocumentsClient
      rows={rows}
      totalRows={totalRows}
      page={page}
      limit={limit}
      q={q}
      status={status}
    />
  );
}

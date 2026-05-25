import { parseExcelFirstSheetToRecords } from "@/lib/admin-excel-parse";
import { GRADE_FILTER_OPTIONS } from "@/lib/school-portal-destination-options";
import { csvToRecords } from "@/lib/university-csv-import";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type SupabaseSecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type StudentImportSummary = {
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
};

const GRADE_ALLOWED = new Set<string>(GRADE_FILTER_OPTIONS);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function cell(row: Record<string, string>, key: string): string {
  return row[key]?.trim() ?? "";
}

async function getSchoolCapacity(
  supabase: SupabaseSecretClient,
  schoolId: string,
): Promise<
  | { ok: true; limit: number | null; enrolled: number; pending: number; remaining: number | null }
  | { ok: false; error: string }
> {
  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("id, students_limit")
    .eq("id", schoolId)
    .maybeSingle();

  if (schoolError) {
    console.error("[admin-student-import] schools", schoolError);
    return { ok: false, error: "Could not verify the selected school." };
  }

  if (!school) {
    return { ok: false, error: "Selected school was not found." };
  }

  const limit = school.students_limit;
  if (limit == null) {
    return { ok: true, limit: null, enrolled: 0, pending: 0, remaining: null };
  }

  if (limit <= 0) {
    return { ok: false, error: "This school has no student capacity configured." };
  }

  const { count: enrolledCount, error: enrolledError } = await supabase
    .from("student_profiles")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId);

  const { count: pendingCount, error: pendingError } = await supabase
    .from("school_students")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("signed_up", false);

  if (enrolledError || pendingError) {
    console.error("[admin-student-import] capacity counts", enrolledError ?? pendingError);
    return {
      ok: false,
      error: "Could not verify how many students and invites this school already has.",
    };
  }

  const enrolled = enrolledCount ?? 0;
  const pending = pendingCount ?? 0;
  const remaining = Math.max(0, limit - enrolled - pending);

  return { ok: true, limit, enrolled, pending, remaining };
}

async function loadExistingEmailsForSchool(
  supabase: SupabaseSecretClient,
  schoolId: string,
  emails: string[],
) {
  const enrolledEmails = new Set<string>();
  const schoolInviteEmails = new Set<string>();

  if (emails.length === 0) {
    return { enrolledEmails, schoolInviteEmails };
  }

  const { data: enrolledRows, error: enrolledError } = await supabase
    .from("student_profiles")
    .select("email")
    .in("email", emails);

  if (enrolledError) {
    throw enrolledError;
  }

  for (const row of enrolledRows ?? []) {
    if (row.email?.trim()) {
      enrolledEmails.add(normalizeEmail(row.email));
    }
  }

  const { data: inviteRows, error: inviteError } = await supabase
    .from("school_students")
    .select("email")
    .eq("school_id", schoolId)
    .in("email", emails);

  if (inviteError) {
    throw inviteError;
  }

  for (const row of inviteRows ?? []) {
    if (row.email?.trim()) {
      schoolInviteEmails.add(normalizeEmail(row.email));
    }
  }

  return { enrolledEmails, schoolInviteEmails };
}

export async function importStudentsFromRecords(
  schoolId: string,
  records: Record<string, string>[],
): Promise<StudentImportSummary> {
  const supabase = await createSupabaseSecretClient();
  const summary: StudentImportSummary = {
    created: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  if (!schoolId.trim()) {
    summary.errors.push("Select a school before importing.");
    return summary;
  }

  if (records.length === 0) {
    summary.errors.push("No data rows found in spreadsheet.");
    return summary;
  }

  const capacity = await getSchoolCapacity(supabase, schoolId);
  if (!capacity.ok) {
    summary.errors.push(capacity.error);
    return summary;
  }

  let remainingSlots = capacity.remaining;

  const seenInFile = new Set<string>();
  const parsedRows: {
    rowNumber: number;
    email: string;
    grade: string | null;
    error?: string;
    skip?: boolean;
  }[] = [];

  for (let index = 0; index < records.length; index++) {
    const row = records[index]!;
    const rowNumber = index + 2;
    const emailRaw = cell(row, "email");
    const gradeRaw = cell(row, "grade");

    if (!emailRaw) {
      summary.failed += 1;
      summary.errors.push(`Row ${rowNumber}: Missing email.`);
      continue;
    }

    const email = normalizeEmail(emailRaw);
    if (!EMAIL_RE.test(email)) {
      summary.failed += 1;
      summary.errors.push(`Row ${rowNumber}: Invalid email address.`);
      continue;
    }

    if (seenInFile.has(email)) {
      summary.skipped += 1;
      continue;
    }
    seenInFile.add(email);

    const grade =
      gradeRaw === "" ? null : GRADE_ALLOWED.has(gradeRaw) ? gradeRaw : null;
    if (!gradeRaw) {
      summary.failed += 1;
      summary.errors.push(`Row ${rowNumber}: Missing grade.`);
      continue;
    }
    if (grade === null) {
      summary.failed += 1;
      summary.errors.push(
        `Row ${rowNumber}: Invalid grade. Use Grade 9, Grade 10, Grade 11, or Grade 12.`,
      );
      continue;
    }

    parsedRows.push({ rowNumber, email, grade });
  }

  const { enrolledEmails, schoolInviteEmails } = await loadExistingEmailsForSchool(
    supabase,
    schoolId,
    parsedRows.map((row) => row.email),
  );

  const rowsToCreate = parsedRows.filter((row) => {
    if (enrolledEmails.has(row.email) || schoolInviteEmails.has(row.email)) {
      summary.skipped += 1;
      return false;
    }
    return true;
  });

  if (remainingSlots != null && rowsToCreate.length > remainingSlots) {
    summary.errors.push(
      `Cannot import ${rowsToCreate.length} new students. This school has ${remainingSlots} slot${remainingSlots === 1 ? "" : "s"} remaining (${capacity.enrolled} enrolled, ${capacity.pending} pending invites, limit ${capacity.limit}).`,
    );
    return summary;
  }

  for (const row of rowsToCreate) {
    if (remainingSlots != null && remainingSlots <= 0) {
      summary.failed += 1;
      summary.errors.push(
        `Row ${row.rowNumber}: School student limit reached before this row could be imported.`,
      );
      continue;
    }

    const { error } = await supabase.from("school_students").insert({
      school_id: schoolId,
      email: row.email,
      grade: row.grade,
      signed_up: false,
    });

    if (error) {
      summary.failed += 1;
      if (error.code === "23505") {
        summary.errors.push(`Row ${row.rowNumber}: Email already invited for this school.`);
        schoolInviteEmails.add(row.email);
      } else {
        summary.errors.push(
          `Row ${row.rowNumber}: ${error.message || "Import failed."}`,
        );
      }
      continue;
    }

    schoolInviteEmails.add(row.email);
    if (remainingSlots != null) {
      remainingSlots -= 1;
    }
    summary.created += 1;
  }

  return summary;
}

export async function importStudentsFromCsvText(
  schoolId: string,
  text: string,
): Promise<StudentImportSummary> {
  return importStudentsFromRecords(schoolId, csvToRecords(text));
}

export async function importStudentsFromExcelBuffer(
  schoolId: string,
  buffer: ArrayBuffer,
): Promise<StudentImportSummary> {
  return importStudentsFromRecords(
    schoolId,
    await parseExcelFirstSheetToRecords(buffer),
  );
}

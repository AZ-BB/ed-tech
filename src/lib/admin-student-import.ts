import { parseExcelFirstSheetToRecords } from "@/lib/admin-excel-parse";
import { isResendConfigured } from "@/lib/resend/config";
import { GRADE_FILTER_OPTIONS } from "@/lib/school-portal-destination-options";
import {
  sendInviteEmailAfterSchoolStudentCreated,
  type SchoolStudentInviteInviter,
} from "@/lib/school-student-invite-email";
import { csvToRecords } from "@/lib/university-csv-import";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type SupabaseSecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type StudentImportSummary = {
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
};

export type ImportStudentsOptions = {
  inviter?: SchoolStudentInviteInviter;
};

const GRADE_ALLOWED = new Set<string>(GRADE_FILTER_OPTIONS);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function cell(row: Record<string, string>, key: string): string {
  return row[key]?.trim() ?? "";
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
  options?: ImportStudentsOptions,
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

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("id, code, name")
    .eq("id", schoolId)
    .maybeSingle();

  if (schoolError) {
    console.error("[admin-student-import] schools", schoolError);
    summary.errors.push("Could not verify the selected school.");
    return summary;
  }

  if (!school) {
    summary.errors.push("Selected school was not found.");
    return summary;
  }

  const seenInFile = new Set<string>();
  const parsedRows: {
    rowNumber: number;
    email: string;
    grade: string | null;
    firstName: string | null;
    error?: string;
    skip?: boolean;
  }[] = [];

  for (let index = 0; index < records.length; index++) {
    const row = records[index]!;
    const rowNumber = index + 2;
    const emailRaw = cell(row, "email");
    const gradeRaw = cell(row, "grade");
    const firstNameRaw =
      cell(row, "first_name") || cell(row, "firstName") || cell(row, "first name");

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

    parsedRows.push({
      rowNumber,
      email,
      grade,
      firstName: firstNameRaw || null,
    });
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

  const inviter = options?.inviter;
  if (inviter && rowsToCreate.length > 0 && !isResendConfigured()) {
    summary.failed += rowsToCreate.length;
    summary.errors.push(
      "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
    );
    return summary;
  }

  const schoolCode = school.code?.trim() ?? "";
  const schoolName = school.name?.trim() ?? null;

  for (const row of rowsToCreate) {
    const { data: inserted, error } = await supabase
      .from("school_students")
      .insert({
        school_id: schoolId,
        email: row.email,
        grade: row.grade,
        signed_up: false,
      })
      .select("id")
      .single();

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

    if (!inserted?.id) {
      summary.failed += 1;
      summary.errors.push(`Row ${row.rowNumber}: Import failed.`);
      continue;
    }

    if (inviter) {
      const emailResult = await sendInviteEmailAfterSchoolStudentCreated({
        supabase,
        schoolId,
        schoolStudentId: inserted.id,
        studentEmail: row.email,
        inviter,
        schoolCode,
        schoolName,
        studentFirstName: row.firstName,
      });

      if ("error" in emailResult) {
        summary.failed += 1;
        summary.errors.push(
          `Row ${row.rowNumber}: Invitation email could not be sent. ${emailResult.error}`,
        );
        continue;
      }
    }

    schoolInviteEmails.add(row.email);
    summary.created += 1;
  }

  return summary;
}

export async function importStudentsFromCsvText(
  schoolId: string,
  text: string,
  options?: ImportStudentsOptions,
): Promise<StudentImportSummary> {
  return importStudentsFromRecords(schoolId, csvToRecords(text), options);
}

export async function importStudentsFromExcelBuffer(
  schoolId: string,
  buffer: ArrayBuffer,
  options?: ImportStudentsOptions,
): Promise<StudentImportSummary> {
  return importStudentsFromRecords(
    schoolId,
    await parseExcelFirstSheetToRecords(buffer),
    options,
  );
}

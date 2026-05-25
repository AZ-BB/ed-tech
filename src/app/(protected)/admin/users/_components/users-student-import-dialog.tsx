"use client";

import { fetchAdminSchoolsForStudentImport } from "@/actions/admin-users";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type UsersStudentImportDialogProps = {
  open: boolean;
  onClose: () => void;
  fixedSchoolId?: string;
  fixedSchoolName?: string;
};

type ImportSummary = {
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
};

type SchoolOption = {
  id: string;
  name: string;
};

export function UsersStudentImportDialog({
  open,
  onClose,
  fixedSchoolId,
  fixedSchoolName,
}: UsersStudentImportDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || fixedSchoolId) return;

    let cancelled = false;
    setIsLoadingSchools(true);
    setError(null);

    void fetchAdminSchoolsForStudentImport().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setSchools([]);
      } else {
        setSchools(result.schools);
      }
      setIsLoadingSchools(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, fixedSchoolId]);

  useEffect(() => {
    if (fixedSchoolId) {
      setSchoolId(fixedSchoolId);
    }
  }, [fixedSchoolId, open]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!schoolId) {
      setError("Select a school to import students into.");
      return;
    }

    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose an Excel (.xlsx) file to import.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("schoolId", schoolId);

      const response = await fetch("/api/admin/students/import", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as ImportSummary & { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Import failed.");
        return;
      }

      setSummary(payload);
      router.refresh();
    } catch {
      setError("Import failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    setSummary(null);
    setError(null);
    setSchoolId("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="users-student-import-title"
        className="w-full max-w-lg rounded-[12px] border border-[#e0deda] bg-white p-6 shadow-xl"
      >
        <h2 id="users-student-import-title" className="text-[18px] font-semibold text-[#1a1a1a]">
          Bulk Import Students
        </h2>
        <p className="mt-2 text-[13px] text-[#666]">
          Upload an Excel file with <strong>email</strong> and <strong>grade</strong> columns.
          Students are added as pending invites for the selected school. Existing enrolled or
          already-invited emails are skipped. The school&apos;s student limit is checked before
          importing.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          {fixedSchoolId ? (
            <div className="rounded-[8px] border border-[#ece9e4] bg-[#faf9f7] px-3 py-2 text-[13px] text-[#4a4a4a]">
              School: <strong>{fixedSchoolName ?? "Selected school"}</strong>
            </div>
          ) : (
            <div>
              <label
                htmlFor="student-import-school"
                className="mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]"
              >
                School
              </label>
              <select
                id="student-import-school"
                value={schoolId}
                onChange={(event) => setSchoolId(event.target.value)}
                disabled={isLoadingSchools || isSubmitting}
                className="w-full cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#4a4a4a] outline-none transition-colors focus:border-[#40916C] disabled:opacity-60"
              >
                <option value="">
                  {isLoadingSchools ? "Loading schools…" : "Select a school"}
                </option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="block w-full text-[13px] text-[#4a4a4a] file:mr-3 file:rounded-[8px] file:border file:border-[#e0deda] file:bg-white file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-[#4a4a4a]"
          />

          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}

          {summary ? (
            <div className="rounded-[8px] border border-[#e0deda] bg-[#faf9f7] p-3 text-[13px] text-[#4a4a4a]">
              <p>Created: {summary.created}</p>
              <p>Skipped (duplicates): {summary.skipped}</p>
              <p>Failed: {summary.failed}</p>
              {summary.errors.length > 0 ? (
                <ul className="mt-2 max-h-32 list-disc overflow-y-auto pl-5">
                  {summary.errors.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a]"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!fixedSchoolId && isLoadingSchools)}
              className="rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? "Importing…" : "Import Excel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

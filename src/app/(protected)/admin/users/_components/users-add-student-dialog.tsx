"use client";

import { createAdminStudentInvite } from "@/actions/admin-students";
import { fetchAdminSchoolsForStudentImport } from "@/actions/admin-users";
import { GRADE_FILTER_OPTIONS } from "@/lib/school-portal-destination-options";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type UsersAddStudentDialogProps = {
  open: boolean;
  onClose: () => void;
  fixedSchoolId?: string;
  fixedSchoolName?: string;
};

type SchoolOption = {
  id: string;
  name: string;
};

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

export function UsersAddStudentDialog({
  open,
  onClose,
  fixedSchoolId,
  fixedSchoolName,
}: UsersAddStudentDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(form);
    const result = await createAdminStudentInvite(formData);

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    setSuccess(true);
    setIsSubmitting(false);
    form.reset();
    router.refresh();
  }

  function handleClose() {
    setError(null);
    setSuccess(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="users-add-student-title"
        className="w-full max-w-lg rounded-[12px] border border-[#e0deda] bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="users-add-student-title" className="text-[18px] font-semibold text-[#1a1a1a]">
          Add Student
        </h2>
        <p className="mt-2 text-[13px] text-[#666]">
          Invite a student to a school. They will appear as a pending invite until they sign up
          with this email.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          {fixedSchoolId ? (
            <>
              <input type="hidden" name="schoolId" value={fixedSchoolId} />
              <div className="rounded-[8px] border border-[#ece9e4] bg-[#faf9f7] px-3 py-2 text-[13px] text-[#4a4a4a]">
                School: <strong>{fixedSchoolName ?? "Selected school"}</strong>
              </div>
            </>
          ) : (
            <div>
              <label htmlFor="add-student-school" className={labelClassName}>
                School
              </label>
              <select
                id="add-student-school"
                name="schoolId"
                required
                disabled={isLoadingSchools || isSubmitting}
                defaultValue=""
                className={`${inputClassName} cursor-pointer disabled:opacity-60`}
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

          <div>
            <label htmlFor="add-student-email" className={labelClassName}>
              Email
            </label>
            <input
              id="add-student-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="add-student-grade" className={labelClassName}>
              Grade
            </label>
            <select
              id="add-student-grade"
              name="grade"
              required
              defaultValue=""
              className={`${inputClassName} cursor-pointer`}
            >
              <option value="">Select grade</option>
              {GRADE_FILTER_OPTIONS.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>

          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
          {success ? (
            <p className="text-[13px] text-[#2D6A4F]">Student invite created successfully.</p>
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
              {isSubmitting ? "Adding…" : "Add Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { runAdminFormSubmit } from "@/app/(protected)/admin/users/_lib/run-admin-form-submit";
import {
  fetchAdminStudentFormCountries,
  fetchAdminStudentFormTeachers,
  updateAdminStudentProfile,
  type AdminCountryOption,
} from "@/actions/admin-students";
import { GRADE_FILTER_OPTIONS } from "@/lib/school-portal-destination-options";
import type { SchoolTeacherOption } from "@/lib/fetch-school-teacher-options";
import { STUDENT_TEACHER_UNASSIGNED_FILTER } from "@/lib/student-teacher-assignment";
import type { StudentFeatureAccess } from "@/lib/student-feature-access";
import { defaultStudentFeatureAccess } from "@/lib/student-feature-access";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StudentFeatureAccessFields } from "@/app/(protected)/admin/users/_components/student-feature-access-fields";

export type AdminEditStudentDialogProps = {
  open: boolean;
  studentId: string;
  defaults: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    grade: string;
    nationalityCountryCode: string;
    schoolId: string | null;
    teacherId: string | null;
    featureAccess?: StudentFeatureAccess;
  };
  onClose: () => void;
};

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

export function AdminEditStudentDialog({
  open,
  studentId,
  defaults,
  onClose,
}: AdminEditStudentDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingFormOptions, setIsLoadingFormOptions] = useState(false);
  const [countries, setCountries] = useState<AdminCountryOption[]>([]);
  const [teachers, setTeachers] = useState<SchoolTeacherOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const hasSchool = Boolean(defaults.schoolId);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setIsLoadingFormOptions(true);
    setError(null);
    setSuccess(false);

    const teachersPromise = hasSchool && defaults.schoolId
      ? fetchAdminStudentFormTeachers(defaults.schoolId, defaults.teacherId)
      : Promise.resolve({ ok: true as const, teachers: [] as SchoolTeacherOption[] });

    void Promise.all([
      fetchAdminStudentFormCountries(),
      teachersPromise,
    ]).then(([countriesResult, teachersResult]) => {
      if (cancelled) return;
      if (!countriesResult.ok) {
        setError(countriesResult.error);
        setCountries([]);
      } else {
        setCountries(countriesResult.countries);
      }
      if (!teachersResult.ok) {
        setError((prev) => prev ?? teachersResult.error);
        setTeachers([]);
      } else {
        setTeachers(teachersResult.teachers);
      }
      setIsLoadingFormOptions(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, defaults.schoolId, defaults.teacherId, hasSchool]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    await runAdminFormSubmit(
      {
        setSubmitting: setIsSubmitting,
        setError,
        onBeforeSubmit: () => setSuccess(false),
      },
      () => updateAdminStudentProfile(studentId, new FormData(form)),
      () => {
        setSuccess(true);
        router.refresh();
      },
    );
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
        aria-labelledby="admin-edit-student-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[12px] border border-[#e0deda] bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="admin-edit-student-title" className="text-[18px] font-semibold text-[#1a1a1a]">
          Edit student
        </h2>
        <p className="mt-2 text-[13px] text-[#666]">
          Update basic profile information. Email and school assignment cannot be changed here.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-student-first-name" className={labelClassName}>
                First name
              </label>
              <input
                id="edit-student-first-name"
                name="firstName"
                type="text"
                required
                defaultValue={defaults.firstName}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="edit-student-last-name" className={labelClassName}>
                Last name
              </label>
              <input
                id="edit-student-last-name"
                name="lastName"
                type="text"
                required
                defaultValue={defaults.lastName}
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-student-email" className={labelClassName}>
              Email
            </label>
            <input
              id="edit-student-email"
              type="email"
              readOnly
              value={defaults.email}
              className={`${inputClassName} cursor-not-allowed bg-[#faf9f4] text-[#7a7a7a]`}
            />
          </div>

          <div>
            <label htmlFor="edit-student-phone" className={labelClassName}>
              Phone
            </label>
            <input
              id="edit-student-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              defaultValue={defaults.phone}
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="edit-student-grade" className={labelClassName}>
              Grade
            </label>
            <select
              id="edit-student-grade"
              name="grade"
              required
              defaultValue={defaults.grade}
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

          <div>
            <label htmlFor="edit-student-nationality" className={labelClassName}>
              Nationality
            </label>
            <select
              id="edit-student-nationality"
              name="nationalityCountryCode"
              required
              disabled={isLoadingFormOptions || isSubmitting}
              defaultValue={defaults.nationalityCountryCode}
              className={`${inputClassName} cursor-pointer disabled:opacity-60`}
            >
              <option value="">
                {isLoadingFormOptions ? "Loading countries…" : "Select country"}
              </option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          {hasSchool ? (
            <div>
              <label htmlFor="edit-student-teacher" className={labelClassName}>
                Teacher
              </label>
              <select
                id="edit-student-teacher"
                name="teacherId"
                disabled={isLoadingFormOptions || isSubmitting}
                defaultValue={defaults.teacherId ?? STUDENT_TEACHER_UNASSIGNED_FILTER}
                className={`${inputClassName} cursor-pointer disabled:opacity-60`}
              >
                <option value={STUDENT_TEACHER_UNASSIGNED_FILTER}>Unassigned</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input type="hidden" name="teacherId" value={STUDENT_TEACHER_UNASSIGNED_FILTER} />
          )}

          <StudentFeatureAccessFields
            key={`${studentId}-${open ? "open" : "closed"}`}
            defaults={defaults.featureAccess ?? defaultStudentFeatureAccess(true)}
            disabled={isSubmitting}
          />

          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
          {success ? (
            <p className="text-[13px] text-[#2D6A4F]">Student updated successfully.</p>
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
              disabled={isSubmitting || isLoadingFormOptions}
              className="rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

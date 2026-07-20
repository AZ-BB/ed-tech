"use client";

import { runAdminFormSubmit } from "@/app/(protected)/admin/users/_lib/run-admin-form-submit";
import {
  createAdminStudentInvite,
  fetchAdminStudentFormCountries,
  type AdminCountryOption,
} from "@/actions/admin-students";
import { fetchAdminSchoolsForStudentImport } from "@/actions/admin-users";
import { GRADE_FILTER_OPTIONS } from "@/lib/school-portal-destination-options";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StudentFeatureAccessFields } from "./student-feature-access-fields";

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

/** Sentinel value for independent (no-school) students in the school select. */
const INDEPENDENT_SCHOOL_VALUE = "__independent__";

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
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [countries, setCountries] = useState<AdminCountryOption[]>([]);
  const [schoolChoice, setSchoolChoice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successIndependent, setSuccessIndependent] = useState(false);

  const isIndependent = !fixedSchoolId && schoolChoice === INDEPENDENT_SCHOOL_VALUE;

  useEffect(() => {
    if (!open || fixedSchoolId) return;

    let cancelled = false;
    setIsLoadingSchools(true);
    setError(null);
    setSchoolChoice("");

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
    if (!open || !isIndependent) return;

    let cancelled = false;
    setIsLoadingCountries(true);

    void fetchAdminStudentFormCountries().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setCountries([]);
      } else {
        setCountries(result.countries);
      }
      setIsLoadingCountries(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, isIndependent]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    // Independent path: empty schoolId so the server branches to direct provision.
    if (isIndependent) {
      formData.set("schoolId", "");
    }

    const createdIndependent = isIndependent;

    await runAdminFormSubmit(
      {
        setSubmitting: setIsSubmitting,
        setError,
        onBeforeSubmit: () => {
          setSuccess(false);
          setSuccessIndependent(false);
        },
      },
      () => createAdminStudentInvite(formData),
      () => {
        setSuccess(true);
        setSuccessIndependent(createdIndependent);
        form.reset();
        setSchoolChoice("");
        router.refresh();
      },
    );
  }

  function handleClose() {
    setError(null);
    setSuccess(false);
    setSuccessIndependent(false);
    setSchoolChoice("");
    onClose();
  }

  const description = fixedSchoolId
    ? "Invite a student to this school. They will appear as a pending invite until they sign up with this email."
    : isIndependent
      ? "Create an independent student account with no school. Login credentials are emailed immediately."
      : "Invite a student to a school (pending until they sign up), or create an independent student with no school.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="users-add-student-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[12px] border border-[#e0deda] bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="users-add-student-title" className="text-[18px] font-semibold text-[#1a1a1a]">
          Add Student
        </h2>
        <p className="mt-2 text-[13px] text-[#666]">{description}</p>

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
                value={schoolChoice}
                onChange={(e) => setSchoolChoice(e.target.value)}
                className={`${inputClassName} cursor-pointer disabled:opacity-60`}
              >
                <option value="">
                  {isLoadingSchools ? "Loading schools…" : "Select a school"}
                </option>
                <option value={INDEPENDENT_SCHOOL_VALUE}>No school (independent)</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isIndependent ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="add-student-first-name" className={labelClassName}>
                  First name
                </label>
                <input
                  id="add-student-first-name"
                  name="firstName"
                  type="text"
                  required
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="add-student-last-name" className={labelClassName}>
                  Last name
                </label>
                <input
                  id="add-student-last-name"
                  name="lastName"
                  type="text"
                  required
                  className={inputClassName}
                />
              </div>
            </div>
          ) : null}

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

          {isIndependent ? (
            <>
              <div>
                <label htmlFor="add-student-nationality" className={labelClassName}>
                  Nationality
                </label>
                <select
                  id="add-student-nationality"
                  name="nationalityCountryCode"
                  required
                  disabled={isLoadingCountries || isSubmitting}
                  defaultValue=""
                  className={`${inputClassName} cursor-pointer disabled:opacity-60`}
                >
                  <option value="">
                    {isLoadingCountries ? "Loading countries…" : "Select nationality"}
                  </option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="add-student-password" className={labelClassName}>
                  Password
                </label>
                <input
                  id="add-student-password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={inputClassName}
                />
                <p className="mt-1 text-[11px] text-[#888]">
                  Minimum 8 characters. Credentials are emailed to the student.
                </p>
              </div>
              <StudentFeatureAccessFields />
            </>
          ) : null}

          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
          {success ? (
            <p className="text-[13px] text-[#2D6A4F]">
              {successIndependent
                ? "Independent student account created successfully."
                : "Student invite created successfully."}
            </p>
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
              disabled={
                isSubmitting ||
                (!fixedSchoolId && isLoadingSchools) ||
                (isIndependent && isLoadingCountries)
              }
              className="rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting
                ? isIndependent
                  ? "Creating…"
                  : "Adding…"
                : isIndependent
                  ? "Create Student"
                  : "Add Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

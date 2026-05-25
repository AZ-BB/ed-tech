"use client";

import { createAdminTeacher } from "@/actions/admin-teachers";
import { fetchAdminSchoolsForStudentImport } from "@/actions/admin-users";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type UsersAddTeacherDialogProps = {
  open: boolean;
  onClose: () => void;
};

type SchoolOption = {
  id: string;
  name: string;
};

const TITLE_OPTIONS = [
  { value: "Mr", label: "Mr." },
  { value: "Ms", label: "Ms." },
] as const;

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

export function UsersAddTeacherDialog({ open, onClose }: UsersAddTeacherDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;

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
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(form);
    const result = await createAdminTeacher(formData);

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
        aria-labelledby="users-add-teacher-title"
        className="w-full max-w-lg rounded-[12px] border border-[#e0deda] bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="users-add-teacher-title" className="text-[18px] font-semibold text-[#1a1a1a]">
          Add Teacher
        </h2>
        <p className="mt-2 text-[13px] text-[#666]">
          Create a school teacher account. They can sign in immediately with their email and
          password.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="add-teacher-school" className={labelClassName}>
              School
            </label>
            <select
              id="add-teacher-school"
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="add-teacher-first-name" className={labelClassName}>
                First name
              </label>
              <input
                id="add-teacher-first-name"
                name="firstName"
                type="text"
                required
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="add-teacher-last-name" className={labelClassName}>
                Last name
              </label>
              <input
                id="add-teacher-last-name"
                name="lastName"
                type="text"
                required
                className={inputClassName}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="add-teacher-title" className={labelClassName}>
                Title
              </label>
              <select
                id="add-teacher-title"
                name="title"
                required
                defaultValue=""
                className={`${inputClassName} cursor-pointer`}
              >
                <option value="">Select title</option>
                {TITLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="add-teacher-email" className={labelClassName}>
                Email
              </label>
              <input
                id="add-teacher-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label htmlFor="add-teacher-password" className={labelClassName}>
              Password
            </label>
            <input
              id="add-teacher-password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClassName}
            />
          </div>

          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
          {success ? (
            <p className="text-[13px] text-[#2D6A4F]">Teacher account created successfully.</p>
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
              disabled={isSubmitting || isLoadingSchools}
              className="rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? "Creating…" : "Create Teacher"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

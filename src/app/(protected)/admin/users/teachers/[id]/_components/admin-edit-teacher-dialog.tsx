"use client";

import { updateAdminTeacherProfile } from "@/actions/admin-teachers";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type AdminEditTeacherDialogProps = {
  open: boolean;
  teacherId: string;
  defaults: {
    firstName: string;
    lastName: string;
    phone: string;
    title: string;
  };
  onClose: () => void;
};

const TITLE_OPTIONS = [
  { value: "Mr", label: "Mr." },
  { value: "Ms", label: "Ms." },
] as const;

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

export function AdminEditTeacherDialog({
  open,
  teacherId,
  defaults,
  onClose,
}: AdminEditTeacherDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const result = await updateAdminTeacherProfile(teacherId, new FormData(form));

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    setSuccess(true);
    setIsSubmitting(false);
    router.refresh();
    window.setTimeout(() => {
      onClose();
    }, 600);
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-edit-teacher-title"
        className="w-full max-w-md rounded-[12px] border border-[#e0deda] bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="admin-edit-teacher-title" className="text-[18px] font-semibold text-[#1a1a1a]">
          Edit teacher
        </h2>
        <p className="mt-1 text-[12.5px] text-[#7a7a7a]">
          Update name, title, and phone. Email cannot be changed here.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-teacher-first-name" className={labelClassName}>
                First name
              </label>
              <input
                id="edit-teacher-first-name"
                name="firstName"
                required
                defaultValue={defaults.firstName}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="edit-teacher-last-name" className={labelClassName}>
                Last name
              </label>
              <input
                id="edit-teacher-last-name"
                name="lastName"
                required
                defaultValue={defaults.lastName}
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-teacher-title" className={labelClassName}>
              Title
            </label>
            <select
              id="edit-teacher-title"
              name="title"
              required
              defaultValue={defaults.title}
              className={inputClassName}
            >
              {TITLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="edit-teacher-phone" className={labelClassName}>
              Phone
            </label>
            <input
              id="edit-teacher-phone"
              name="phone"
              type="tel"
              defaultValue={defaults.phone}
              className={inputClassName}
              placeholder="Optional"
            />
          </div>

          {error ? (
            <p className="text-[12px] text-[#c0392b]" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-[12px] text-[#2D6A4F]" role="status">
              Teacher updated.
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[13px] font-semibold text-[#4a4a4a] hover:bg-[#faf9f4]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-[8px] border border-[#40916C] bg-[#40916C] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#2D6A4F] disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

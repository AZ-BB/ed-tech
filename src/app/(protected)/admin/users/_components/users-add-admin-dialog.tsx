"use client";

import { createAdminUser } from "@/actions/admin-users";
import { useRouter } from "next/navigation";
import { useState } from "react";

type UsersAddAdminDialogProps = {
  open: boolean;
  onClose: () => void;
};

const ADMIN_ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "moderator", label: "Moderator" },
  { value: "super_admin", label: "Super Admin" },
] as const;

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

export function UsersAddAdminDialog({ open, onClose }: UsersAddAdminDialogProps) {
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

    const formData = new FormData(form);
    const result = await createAdminUser(formData);

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
        aria-labelledby="users-add-admin-title"
        className="w-full max-w-lg rounded-[12px] border border-[#e0deda] bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="users-add-admin-title" className="text-[18px] font-semibold text-[#1a1a1a]">
          Add Admin
        </h2>
        <p className="mt-2 text-[13px] text-[#666]">
          Create a new platform admin account. The user can sign in immediately with the email and
          password you set.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="add-admin-first-name" className="mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]">
                First name
              </label>
              <input
                id="add-admin-first-name"
                name="firstName"
                type="text"
                required
                autoComplete="given-name"
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="add-admin-last-name" className="mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]">
                Last name
              </label>
              <input
                id="add-admin-last-name"
                name="lastName"
                type="text"
                required
                autoComplete="family-name"
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label htmlFor="add-admin-email" className="mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]">
              Email
            </label>
            <input
              id="add-admin-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="add-admin-password" className="mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]">
              Password
            </label>
            <input
              id="add-admin-password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="add-admin-role" className="mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]">
              Role
            </label>
            <select
              id="add-admin-role"
              name="role"
              required
              defaultValue="admin"
              className={`${inputClassName} cursor-pointer`}
            >
              {ADMIN_ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
          {success ? (
            <p className="text-[13px] text-[#2D6A4F]">Admin account created successfully.</p>
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
              disabled={isSubmitting}
              className="rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? "Creating…" : "Create Admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

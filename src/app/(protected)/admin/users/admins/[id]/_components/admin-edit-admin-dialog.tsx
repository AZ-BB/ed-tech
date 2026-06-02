"use client";

import { updateAdminAdminProfile } from "@/actions/admin-admins";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type AdminEditPlatformAdminDialogProps = {
  open: boolean;
  adminId: string;
  defaults: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: string;
  };
  onClose: () => void;
};

const ADMIN_ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "moderator", label: "Moderator" },
  { value: "super_admin", label: "Super Admin" },
] as const;

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

export function AdminEditPlatformAdminDialog({
  open,
  adminId,
  defaults,
  onClose,
}: AdminEditPlatformAdminDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const result = await updateAdminAdminProfile(adminId, new FormData(form));

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    setSuccess(true);
    setIsSubmitting(false);
    router.refresh();
    window.setTimeout(() => onClose(), 600);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-edit-platform-admin-title"
        className="w-full max-w-md rounded-[12px] border border-[#e0deda] bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="admin-edit-platform-admin-title"
          className="text-[18px] font-semibold text-[#1a1a1a]"
        >
          Edit admin
        </h2>
        <p className="mt-1 text-[12.5px] text-[#7a7a7a]">
          Update basic profile information. Email cannot be changed here.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-admin-first-name" className={labelClassName}>
                First name
              </label>
              <input
                id="edit-admin-first-name"
                name="firstName"
                required
                defaultValue={defaults.firstName}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="edit-admin-last-name" className={labelClassName}>
                Last name
              </label>
              <input
                id="edit-admin-last-name"
                name="lastName"
                required
                defaultValue={defaults.lastName}
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-admin-email" className={labelClassName}>
              Email
            </label>
            <input
              id="edit-admin-email"
              type="email"
              readOnly
              value={defaults.email}
              className={`${inputClassName} cursor-not-allowed bg-[#faf9f4] text-[#7a7a7a]`}
            />
          </div>

          <div>
            <label htmlFor="edit-admin-phone" className={labelClassName}>
              Phone
            </label>
            <input
              id="edit-admin-phone"
              name="phone"
              type="tel"
              defaultValue={defaults.phone}
              className={inputClassName}
              placeholder="Optional"
            />
          </div>

          <div>
            <label htmlFor="edit-admin-role" className={labelClassName}>
              Role
            </label>
            <select
              id="edit-admin-role"
              name="role"
              required
              defaultValue={defaults.role}
              className={`${inputClassName} cursor-pointer`}
            >
              {ADMIN_ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {error ? (
            <p className="text-[12px] text-[#c0392b]" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-[12px] text-[#2D6A4F]" role="status">
              Admin updated.
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
    </div>,
    document.body,
  );
}

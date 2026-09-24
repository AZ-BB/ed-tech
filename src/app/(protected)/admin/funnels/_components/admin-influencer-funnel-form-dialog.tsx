"use client";

import {
  createAdminInfluencerFunnel,
  updateAdminInfluencerFunnel,
} from "@/actions/admin-influencer-funnels";
import { normalizeInfluencerSlug } from "@/lib/influencer-funnel-slugs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type InfluencerFunnelFormValues = {
  id: string;
  displayName: string;
  slug: string;
  calendlySchedulingUrl: string;
  isActive: boolean;
};

type AdminInfluencerFunnelFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  initial?: InfluencerFunnelFormValues | null;
  onClose: () => void;
};

const inputClassName =
  "m-0 box-border w-full rounded-lg border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] focus:border-[#2D6A4F] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/15";

export function AdminInfluencerFunnelFormDialog({
  open,
  mode,
  initial,
  onClose,
}: AdminInfluencerFunnelFormDialogProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [calendlySchedulingUrl, setCalendlySchedulingUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSlugTouched(mode === "edit");
    if (mode === "edit" && initial) {
      setDisplayName(initial.displayName);
      setSlug(initial.slug);
      setCalendlySchedulingUrl(initial.calendlySchedulingUrl);
      setIsActive(initial.isActive);
    } else {
      setDisplayName("");
      setSlug("");
      setCalendlySchedulingUrl("");
      setIsActive(true);
    }
  }, [open, mode, initial]);

  useEffect(() => {
    if (!open || slugTouched || mode === "edit") return;
    setSlug(normalizeInfluencerSlug(displayName));
  }, [displayName, slugTouched, open, mode]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    if (mode === "edit" && initial?.id) {
      formData.set("id", initial.id);
    }
    formData.set("displayName", displayName);
    formData.set("slug", slug);
    formData.set("calendlySchedulingUrl", calendlySchedulingUrl);
    if (isActive) {
      formData.set("isActive", "on");
    }

    const result =
      mode === "create"
        ? await createAdminInfluencerFunnel(formData)
        : await updateAdminInfluencerFunnel(formData);

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    onClose();
    router.refresh();
  }

  const title = mode === "create" ? "Add influencer funnel" : "Edit influencer funnel";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby="influencer-funnel-form-title"
        className="w-full max-w-lg rounded-[12px] border border-[#ece9e4] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ece9e4] px-5 py-4">
          <h2 id="influencer-funnel-form-title" className="text-[16px] font-bold text-[#1a1a1a]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-[6px] px-2 py-1 text-[#a0a0a0] hover:bg-[#f3f2f0] hover:text-[#1a1a1a]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="px-5 py-4">
          {error ? (
            <p className="mb-3 text-[12px] font-medium text-[#E74C3C]">{error}</p>
          ) : null}

          <div className="mb-3">
            <label htmlFor="funnel-display-name" className="mb-1 block text-[12px] font-semibold text-[#4a4a4a]">
              Display name
            </label>
            <input
              id="funnel-display-name"
              name="displayName"
              className={inputClassName}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="funnel-slug" className="mb-1 block text-[12px] font-semibold text-[#4a4a4a]">
              URL slug
            </label>
            <input
              id="funnel-slug"
              name="slug"
              className={inputClassName}
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            />
            <p className="mt-1 text-[11px] text-[#9a9a9a]">
              Public link: /en/{slug || "your-slug"} and /en/{slug || "your-slug"}/signup
            </p>
          </div>

          <div className="mb-3">
            <label
              htmlFor="funnel-calendly"
              className="mb-1 block text-[12px] font-semibold text-[#4a4a4a]"
            >
              Calendly scheduling URL
            </label>
            <input
              id="funnel-calendly"
              name="calendlySchedulingUrl"
              type="url"
              className={inputClassName}
              value={calendlySchedulingUrl}
              onChange={(e) => setCalendlySchedulingUrl(e.target.value)}
              placeholder="https://calendly.com/..."
              required
            />
          </div>

          {mode === "edit" ? (
            <label className="mb-4 flex cursor-pointer items-center gap-2 text-[13px] text-[#4a4a4a]">
              <input
                type="checkbox"
                name="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 rounded border-[#e0deda]"
              />
              Active (visible on public site)
            </label>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-[#ece9e4] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-[#e0deda] bg-white px-4 py-2 text-[13px] font-semibold text-[#4a4a4a] hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[#2D6A4F] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#245a42] disabled:opacity-50"
            >
              {isSubmitting ? "Saving…" : mode === "create" ? "Create funnel" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

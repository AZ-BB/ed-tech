"use client";

import {
  translateAdminProgramDiscovery,
  updateAdminProgramDiscoveryArabicContent,
} from "@/actions/admin-program-discovery-translation";
import type { AdminProgramDiscoveryDetailWithTranslation } from "@/actions/admin-program-discovery-translation";
import type { ProgramDiscoveryContentAr } from "@/lib/program-discovery-translatable-fields";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AdminEditProgramDiscoveryArDialogProps = {
  open: boolean;
  onClose: () => void;
  program: AdminProgramDiscoveryDetailWithTranslation;
};

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

function tagsToText(tags: string[] | undefined): string {
  return (tags ?? []).join("\n");
}

function textToTags(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function AdminEditProgramDiscoveryArDialog({
  open,
  onClose,
  program,
}: AdminEditProgramDiscoveryArDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetranslating, setIsRetranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    category: "",
    short_description: "",
    description: "",
    salary_potential: "",
    demand_level: "",
    math_intensity: "",
    ai_resilience: "",
    tags: "",
  });

  useEffect(() => {
    if (!open) return;
    const ar = program.contentAr ?? {};
    setForm({
      title: ar.title ?? "",
      category: ar.category ?? "",
      short_description: ar.short_description ?? "",
      description: ar.description ?? "",
      salary_potential: ar.salary_potential ?? "",
      demand_level: ar.demand_level ?? "",
      math_intensity: ar.math_intensity ?? "",
      ai_resilience: ar.ai_resilience ?? "",
      tags: tagsToText(ar.tags),
    });
    setError(null);
  }, [open, program.contentAr]);

  if (!open) return null;

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const contentAr: ProgramDiscoveryContentAr = {
      title: form.title.trim() || undefined,
      category: form.category.trim() || undefined,
      short_description: form.short_description.trim() || undefined,
      description: form.description.trim() || undefined,
      salary_potential: form.salary_potential.trim() || undefined,
      demand_level: form.demand_level.trim() || undefined,
      math_intensity: form.math_intensity.trim() || undefined,
      ai_resilience: form.ai_resilience.trim() || undefined,
    };

    const tags = textToTags(form.tags);
    if (tags.length > 0) contentAr.tags = tags;

    const result = await updateAdminProgramDiscoveryArabicContent(
      program.id,
      contentAr,
    );
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.refresh();
    onClose();
  }

  async function handleRetranslate() {
    setIsRetranslating(true);
    setError(null);
    const result = await translateAdminProgramDiscovery(program.id);
    setIsRetranslating(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[12px] bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[18px] font-bold text-[#1a1a1a]">Edit Arabic content</h2>
            <p className="mt-1 text-[12px] text-[#666]">{program.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[6px] px-2 py-1 text-[18px] leading-none text-[#666] hover:bg-[#f5f5f5]"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label className={labelClassName} htmlFor="ar-title">
              Title
            </label>
            <input
              id="ar-title"
              dir="rtl"
              className={inputClassName}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </div>

          <div>
            <label className={labelClassName} htmlFor="ar-category">
              Category
            </label>
            <input
              id="ar-category"
              dir="rtl"
              className={inputClassName}
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            />
          </div>

          <div>
            <label className={labelClassName} htmlFor="ar-short-description">
              Short description
            </label>
            <textarea
              id="ar-short-description"
              dir="rtl"
              rows={3}
              className={inputClassName}
              value={form.short_description}
              onChange={(event) =>
                setForm({ ...form, short_description: event.target.value })
              }
            />
          </div>

          <div>
            <label className={labelClassName} htmlFor="ar-description">
              Description
            </label>
            <textarea
              id="ar-description"
              dir="rtl"
              rows={5}
              className={inputClassName}
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="ar-salary-potential">
                Salary potential
              </label>
              <input
                id="ar-salary-potential"
                dir="rtl"
                className={inputClassName}
                value={form.salary_potential}
                onChange={(event) =>
                  setForm({ ...form, salary_potential: event.target.value })
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="ar-demand-level">
                Demand level
              </label>
              <input
                id="ar-demand-level"
                dir="rtl"
                className={inputClassName}
                value={form.demand_level}
                onChange={(event) =>
                  setForm({ ...form, demand_level: event.target.value })
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="ar-math-intensity">
                Math intensity
              </label>
              <input
                id="ar-math-intensity"
                dir="rtl"
                className={inputClassName}
                value={form.math_intensity}
                onChange={(event) =>
                  setForm({ ...form, math_intensity: event.target.value })
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="ar-ai-resilience">
                AI resilience
              </label>
              <input
                id="ar-ai-resilience"
                dir="rtl"
                className={inputClassName}
                value={form.ai_resilience}
                onChange={(event) =>
                  setForm({ ...form, ai_resilience: event.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className={labelClassName} htmlFor="ar-tags">
              Tags (one per line)
            </label>
            <textarea
              id="ar-tags"
              dir="rtl"
              rows={4}
              className={inputClassName}
              value={form.tags}
              onChange={(event) => setForm({ ...form, tags: event.target.value })}
            />
          </div>

          {error ? (
            <p className="text-[12px] font-medium text-[#C0392B]">{error}</p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleRetranslate}
              disabled={isRetranslating || isSubmitting}
              className="rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a] disabled:opacity-60"
            >
              {isRetranslating ? "Re-translating…" : "Re-translate all"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isRetranslating}
              className="rounded-[8px] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : "Save Arabic"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

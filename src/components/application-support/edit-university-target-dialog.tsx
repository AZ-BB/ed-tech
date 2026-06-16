"use client";

import { COUNTRIES } from "@/lib/countries";
import {
  UNIVERSITY_TARGET_DECISION_OPTIONS,
} from "@/lib/application-university-target-constants";
import type { UniversityCatalogSearchResult } from "@/lib/search-universities-catalog";
import { useEffect, useState } from "react";

import {
  UNIVERSITY_DIALOG_SELECT_CHEVRON,
  UniversityTargetDialogShell,
  universityDialogInputClassName,
  universityDialogLabelClassName,
  universityDialogSelectClassName,
  universityTargetToFormState,
  type UniversityTargetFormState,
} from "@/components/application-support/university-target-dialog-shared";

type EditUniversityTargetDialogProps = {
  open: boolean;
  target: {
    id: string;
    universityId: string | null;
    universityName: string;
    program: string | null;
    countryCode: string | null;
    deadline: string | null;
    portalUrl: string | null;
    status: string;
    decision: string;
    notes: string | null;
  } | null;
  onClose: () => void;
  onSubmit: (form: UniversityTargetFormState) => void;
  isSubmitting: boolean;
  error: string | null;
  searchUniversities: (
    query: string,
  ) => Promise<
    | { ok: true; results: UniversityCatalogSearchResult[] }
    | { ok: false; error: string }
  >;
};

export function EditUniversityTargetDialog({
  open,
  target,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  searchUniversities,
}: EditUniversityTargetDialogProps) {
  const [form, setForm] = useState<UniversityTargetFormState | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UniversityCatalogSearchResult[]>([]);

  useEffect(() => {
    if (!open || !target) return;
    const next = universityTargetToFormState(target);
    setForm(next);
    setSearchQuery(next.universityName);
    setSearchResults([]);
  }, [open, target]);

  useEffect(() => {
    if (!open || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const handle = window.setTimeout(() => {
      void searchUniversities(searchQuery).then((result) => {
        if (result.ok) setSearchResults(result.results);
      });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [open, searchQuery, searchUniversities]);

  if (!form) return null;

  function pickUniversity(result: UniversityCatalogSearchResult) {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            universityId: result.id,
            universityName: result.name,
            countryCode: result.countryCode,
            portalUrl: result.admissionPageUrl ?? prev.portalUrl,
          }
        : prev,
    );
    setSearchQuery(result.name);
    setSearchResults([]);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    onSubmit(form);
  }

  return (
    <UniversityTargetDialogShell
      open={open}
      title="Edit university application"
      subtitle={target?.universityName}
      onClose={onClose}
      isSubmitting={isSubmitting}
      error={error}
      footer={
        <>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[13px] font-semibold text-[#4a4a4a] hover:bg-[#f5f4f0] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-university-target-form"
            disabled={isSubmitting}
            className="cursor-pointer rounded-[8px] border border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      <form id="edit-university-target-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <label htmlFor="edit-uni-search" className={universityDialogLabelClassName}>
            University
          </label>
          <input
            id="edit-uni-search"
            type="text"
            value={searchQuery || form.universityName}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setForm((prev) =>
                prev
                  ? {
                      ...prev,
                      universityName: event.target.value,
                      universityId: "",
                    }
                  : prev,
              );
            }}
            className={universityDialogInputClassName}
            disabled={isSubmitting}
            autoComplete="off"
          />
          {searchResults.length > 0 ? (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-[8px] border border-[#e0deda] bg-white shadow-lg">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  className="block w-full cursor-pointer px-3 py-2 text-left text-[13px] hover:bg-[var(--green-pale)]"
                  onClick={() => pickUniversity(result)}
                >
                  <span className="font-semibold text-[#1a1a1a]">{result.name}</span>
                  <span className="ml-2 text-[#7a7a7a]">
                    {result.city}, {result.countryCode}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="edit-uni-program" className={universityDialogLabelClassName}>
              Program / major
            </label>
            <input
              id="edit-uni-program"
              type="text"
              value={form.program}
              onChange={(event) => setForm((prev) => (prev ? { ...prev, program: event.target.value } : prev))}
              className={universityDialogInputClassName}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="edit-uni-country" className={universityDialogLabelClassName}>
              Country
            </label>
            <select
              id="edit-uni-country"
              value={form.countryCode}
              onChange={(event) =>
                setForm((prev) => (prev ? { ...prev, countryCode: event.target.value } : prev))
              }
              className={universityDialogSelectClassName}
              style={{ backgroundImage: UNIVERSITY_DIALOG_SELECT_CHEVRON }}
              disabled={isSubmitting}
            >
              <option value="">— Select —</option>
              {COUNTRIES.map((country) => (
                <option key={country.alpha2} value={country.alpha2}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="edit-uni-deadline" className={universityDialogLabelClassName}>
              Application round / deadline
            </label>
            <input
              id="edit-uni-deadline"
              type="date"
              value={form.deadline}
              onChange={(event) =>
                setForm((prev) => (prev ? { ...prev, deadline: event.target.value } : prev))
              }
              className={universityDialogInputClassName}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="edit-uni-portal" className={universityDialogLabelClassName}>
              Application portal link
            </label>
            <input
              id="edit-uni-portal"
              type="url"
              value={form.portalUrl}
              onChange={(event) =>
                setForm((prev) => (prev ? { ...prev, portalUrl: event.target.value } : prev))
              }
              className={universityDialogInputClassName}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div>
          <label htmlFor="edit-uni-decision" className={universityDialogLabelClassName}>
            Decision
          </label>
          <select
            id="edit-uni-decision"
            value={form.decision}
            onChange={(event) =>
              setForm((prev) => (prev ? { ...prev, decision: event.target.value } : prev))
            }
            className={universityDialogSelectClassName}
            style={{ backgroundImage: UNIVERSITY_DIALOG_SELECT_CHEVRON }}
            disabled={isSubmitting}
          >
            {UNIVERSITY_TARGET_DECISION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="edit-uni-notes" className={universityDialogLabelClassName}>
            Notes
          </label>
          <textarea
            id="edit-uni-notes"
            value={form.notes}
            onChange={(event) =>
              setForm((prev) => (prev ? { ...prev, notes: event.target.value } : prev))
            }
            rows={3}
            className={`${universityDialogInputClassName} min-h-[80px] resize-y`}
            disabled={isSubmitting}
          />
        </div>
      </form>
    </UniversityTargetDialogShell>
  );
}

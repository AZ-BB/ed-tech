"use client";

import { COUNTRIES } from "@/lib/countries";
import { UNIVERSITY_TARGET_STATUS_OPTIONS } from "@/lib/application-university-target-constants";
import type { UniversityCatalogSearchResult } from "@/lib/search-universities-catalog";
import { useEffect, useState } from "react";

import {
  UNIVERSITY_DIALOG_SELECT_CHEVRON,
  UniversityTargetDialogShell,
  defaultUniversityTargetFormState,
  universityDialogInputClassName,
  universityDialogLabelClassName,
  universityDialogSelectClassName,
  type UniversityTargetFormState,
} from "@/components/application-support/university-target-dialog-shared";

type AddUniversityTargetDialogProps = {
  open: boolean;
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

export function AddUniversityTargetDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  searchUniversities,
}: AddUniversityTargetDialogProps) {
  const [form, setForm] = useState<UniversityTargetFormState>(defaultUniversityTargetFormState);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UniversityCatalogSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(defaultUniversityTargetFormState());
    setSearchQuery("");
    setSearchResults([]);
  }, [open]);

  useEffect(() => {
    if (!open || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const handle = window.setTimeout(() => {
      setSearching(true);
      void searchUniversities(searchQuery).then((result) => {
        setSearching(false);
        if (result.ok) setSearchResults(result.results);
      });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [open, searchQuery, searchUniversities]);

  function pickUniversity(result: UniversityCatalogSearchResult) {
    setForm((prev) => ({
      ...prev,
      universityId: result.id,
      universityName: result.name,
      countryCode: result.countryCode,
      portalUrl: result.admissionPageUrl ?? prev.portalUrl,
    }));
    setSearchQuery(result.name);
    setSearchResults([]);
  }

  function updateDocumentName(index: number, value: string) {
    setForm((prev) => {
      const next = [...prev.documentNames];
      next[index] = value;
      return { ...prev, documentNames: next };
    });
  }

  function addDocumentRow() {
    setForm((prev) => ({ ...prev, documentNames: [...prev.documentNames, ""] }));
  }

  function removeDocumentRow(index: number) {
    setForm((prev) => ({
      ...prev,
      documentNames: prev.documentNames.filter((_, i) => i !== index),
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <UniversityTargetDialogShell
      open={open}
      title="Add university to applications"
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
            form="add-university-target-form"
            disabled={isSubmitting}
            className="cursor-pointer rounded-[8px] border border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? "Adding…" : "Add"}
          </button>
        </>
      }
    >
      <form id="add-university-target-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <label htmlFor="add-uni-search" className={universityDialogLabelClassName}>
            University
          </label>
          <input
            id="add-uni-search"
            type="text"
            value={searchQuery || form.universityName}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setForm((prev) => ({
                ...prev,
                universityName: event.target.value,
                universityId: "",
              }));
            }}
            placeholder="Start typing to search Univeera's database…"
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
          ) : searching ? (
            <p className="mt-1 text-[11px] text-[#7a7a7a]">Searching…</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="add-uni-program" className={universityDialogLabelClassName}>
              Program / major
            </label>
            <input
              id="add-uni-program"
              type="text"
              value={form.program}
              onChange={(event) => setForm((prev) => ({ ...prev, program: event.target.value }))}
              placeholder="e.g. BSc Economics"
              className={universityDialogInputClassName}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="add-uni-country" className={universityDialogLabelClassName}>
              Country
            </label>
            <select
              id="add-uni-country"
              value={form.countryCode}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, countryCode: event.target.value }))
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
            <label htmlFor="add-uni-deadline" className={universityDialogLabelClassName}>
              Application round / deadline
            </label>
            <input
              id="add-uni-deadline"
              type="date"
              value={form.deadline}
              onChange={(event) => setForm((prev) => ({ ...prev, deadline: event.target.value }))}
              className={universityDialogInputClassName}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="add-uni-portal" className={universityDialogLabelClassName}>
              Application portal link
            </label>
            <input
              id="add-uni-portal"
              type="url"
              value={form.portalUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, portalUrl: event.target.value }))}
              placeholder="https://"
              className={universityDialogInputClassName}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div>
          <label htmlFor="add-uni-status" className={universityDialogLabelClassName}>
            Initial status
          </label>
          <select
            id="add-uni-status"
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
            className={universityDialogSelectClassName}
            style={{ backgroundImage: UNIVERSITY_DIALOG_SELECT_CHEVRON }}
            disabled={isSubmitting}
          >
            {UNIVERSITY_TARGET_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="add-uni-notes" className={universityDialogLabelClassName}>
            Notes
          </label>
          <textarea
            id="add-uni-notes"
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Why this university, any special context…"
            rows={3}
            className={`${universityDialogInputClassName} min-h-[80px] resize-y`}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className={universityDialogLabelClassName}>Documents needed</span>
            <button
              type="button"
              onClick={addDocumentRow}
              disabled={isSubmitting}
              className="cursor-pointer text-[12px] font-semibold text-[var(--green-dark)] hover:underline disabled:opacity-60"
            >
              + Add document
            </button>
          </div>
          <div className="space-y-2">
            {form.documentNames.map((name, index) => (
              <div key={`doc-${index}`} className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(event) => updateDocumentName(index, event.target.value)}
                  placeholder="e.g. Personal statement"
                  className={universityDialogInputClassName}
                  disabled={isSubmitting}
                />
                {form.documentNames.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeDocumentRow(index)}
                    disabled={isSubmitting}
                    className="shrink-0 cursor-pointer rounded-[8px] border border-[#e0deda] px-2.5 text-[12px] text-[#7a7a7a] hover:bg-[#f5f4f0] disabled:opacity-60"
                    aria-label="Remove document"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </form>
    </UniversityTargetDialogShell>
  );
}

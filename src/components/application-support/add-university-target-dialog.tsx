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

export type AddUniversityTargetDialogLabels = {
  title: string;
  cancel: string;
  add: string;
  adding: string;
  university: string;
  searchPlaceholder: string;
  searching: string;
  program: string;
  programPlaceholder: string;
  country: string;
  selectCountry: string;
  deadline: string;
  portal: string;
  portalPlaceholder: string;
  initialStatus: string;
  notes: string;
  notesPlaceholder: string;
  statusOptionLabels?: Record<string, string>;
};

const DEFAULT_LABELS: AddUniversityTargetDialogLabels = {
  title: "Add university to applications",
  cancel: "Cancel",
  add: "Add",
  adding: "Adding…",
  university: "University",
  searchPlaceholder: "Start typing to search Univeera's database…",
  searching: "Searching…",
  program: "Program / major",
  programPlaceholder: "e.g. BSc Economics",
  country: "Country",
  selectCountry: "— Select —",
  deadline: "Application round / deadline",
  portal: "Application portal link",
  portalPlaceholder: "https://",
  initialStatus: "Initial status",
  notes: "Notes",
  notesPlaceholder: "Why this university, any special context…",
};

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
  labels?: Partial<AddUniversityTargetDialogLabels>;
};

export function AddUniversityTargetDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  searchUniversities,
  labels: labelsProp,
}: AddUniversityTargetDialogProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <UniversityTargetDialogShell
      open={open}
      title={labels.title}
      onClose={onClose}
      isSubmitting={isSubmitting}
      error={error}
      footer={
        <>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="w-full cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#4a4a4a] hover:bg-[#f5f4f0] disabled:opacity-60 sm:w-auto sm:py-2"
          >
            {labels.cancel}
          </button>
          <button
            type="submit"
            form="add-university-target-form"
            disabled={isSubmitting}
            className="w-full cursor-pointer rounded-[8px] border border-[var(--green)] bg-[var(--green)] px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60 sm:w-auto sm:py-2"
          >
            {isSubmitting ? labels.adding : labels.add}
          </button>
        </>
      }
    >
      <form id="add-university-target-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <label htmlFor="add-uni-search" className={universityDialogLabelClassName}>
            {labels.university}
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
            placeholder={labels.searchPlaceholder}
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
                  className="block w-full cursor-pointer px-3 py-2 text-start text-[13px] hover:bg-[var(--green-pale)]"
                  onClick={() => pickUniversity(result)}
                >
                  <span className="font-semibold text-[#1a1a1a] bidi-ltr">{result.name}</span>
                  <span className="ms-2 text-[#7a7a7a] bidi-ltr">
                    {result.city}, {result.countryCode}
                  </span>
                </button>
              ))}
            </div>
          ) : searching ? (
            <p className="mt-1 text-[11px] text-[#7a7a7a]">{labels.searching}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="add-uni-program" className={universityDialogLabelClassName}>
              {labels.program}
            </label>
            <input
              id="add-uni-program"
              type="text"
              value={form.program}
              onChange={(event) => setForm((prev) => ({ ...prev, program: event.target.value }))}
              placeholder={labels.programPlaceholder}
              className={universityDialogInputClassName}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="add-uni-country" className={universityDialogLabelClassName}>
              {labels.country}
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
              <option value="">{labels.selectCountry}</option>
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
              {labels.deadline}
            </label>
            <input
              id="add-uni-deadline"
              type="date"
              value={form.deadline}
              onChange={(event) => setForm((prev) => ({ ...prev, deadline: event.target.value }))}
              className={`${universityDialogInputClassName} bidi-ltr`}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="add-uni-portal" className={universityDialogLabelClassName}>
              {labels.portal}
            </label>
            <input
              id="add-uni-portal"
              type="url"
              value={form.portalUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, portalUrl: event.target.value }))}
              placeholder={labels.portalPlaceholder}
              className={`${universityDialogInputClassName} bidi-ltr`}
              disabled={isSubmitting}
              dir="ltr"
            />
          </div>
        </div>

        <div>
          <label htmlFor="add-uni-status" className={universityDialogLabelClassName}>
            {labels.initialStatus}
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
                {labels.statusOptionLabels?.[option.value] ?? option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="add-uni-notes" className={universityDialogLabelClassName}>
            {labels.notes}
          </label>
          <textarea
            id="add-uni-notes"
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder={labels.notesPlaceholder}
            rows={3}
            className={`${universityDialogInputClassName} min-h-[80px] resize-y`}
            disabled={isSubmitting}
          />
        </div>
      </form>
    </UniversityTargetDialogShell>
  );
}

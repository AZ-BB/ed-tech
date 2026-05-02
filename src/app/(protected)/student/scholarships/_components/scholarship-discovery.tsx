"use client";

import { useMemo, useState } from "react";
import {
  filterScholarships,
  splitGovernmentInternational,
} from "./filter-scholarships";
import type { Scholarship } from "./types";
import { ScholarshipApplyModal } from "./scholarship-apply-modal";
import { ScholarshipCategorySection } from "./scholarship-category-section";
import { ScholarshipDetailPanel } from "./scholarship-detail-panel";
import { ScholarshipSelectorBar } from "./scholarship-selector-bar";

export function ScholarshipDiscovery({
  scholarships,
}: {
  scholarships: Scholarship[];
}) {
  const [nationality, setNationality] = useState("any");
  const [destination, setDestination] = useState("any");
  const [coverage, setCoverage] = useState("any");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applySourceId, setApplySourceId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());

  const filtered = useMemo(
    () =>
      filterScholarships(scholarships, nationality, destination, coverage),
    [scholarships, nationality, destination, coverage],
  );

  const { gov, other } = useMemo(
    () => splitGovernmentInternational(filtered),
    [filtered],
  );

  const detailScholarship: Scholarship | null = useMemo(() => {
    if (!detailId) return null;
    return scholarships.find((x) => x.id === detailId) ?? null;
  }, [scholarships, detailId]);

  const applyScholarship: Scholarship | null = useMemo(() => {
    const id = applySourceId ?? detailId;
    if (!id) return null;
    return scholarships.find((x) => x.id === id) ?? null;
  }, [scholarships, applySourceId, detailId]);

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const noResults = gov.length === 0 && other.length === 0;

  if (scholarships.length === 0) {
    return (
      <div className="mx-auto w-full pb-16 pt-0 px-2">
        <header className="mb-6">
          <h1 className="serif mb-1 text-[26px] font-bold text-[var(--text)]">
            Find your scholarship
          </h1>
          <p className="text-[14px] text-[var(--text-light)]">
            Scholarships matched to your nationality, destination, and goals
          </p>
        </header>
        <p className="rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white px-6 py-10 text-center text-[14px] text-[var(--text-mid)]">
          No discovery rows in{" "}
          <code className="rounded bg-[var(--sand)] px-1.5 py-0.5 text-[13px]">
            scholarships
          </code>{" "}
          yet (<code className="rounded bg-[var(--sand)] px-1.5 py-0.5 text-[13px]">discovery_payload</code>{" "}
          is null). Apply migrations, then run{" "}
          <code className="rounded bg-[var(--sand)] px-1.5 py-0.5 text-[13px]">
            npm run db:seed:scholarships:xlsx
          </code>{" "}
          or{" "}
          <code className="rounded bg-[var(--sand)] px-1.5 py-0.5 text-[13px]">
            npm run db:seed:scholarships
          </code>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full pb-16 pt-0 px-2">
      <header className="mb-6">
        <h1 className="serif mb-1 text-[26px] text-[var(--text)] font-bold">
          Find your scholarship
        </h1>
        <p className="text-[14px] text-[var(--text-light)]">
          Scholarships matched to your nationality, destination, and goals
        </p>
      </header>

      <ScholarshipSelectorBar
        nationality={nationality}
        destination={destination}
        coverage={coverage}
        onNationalityChange={setNationality}
        onDestinationChange={setDestination}
        onCoverageChange={setCoverage}
      />

      {noResults ? (
        <p className="py-10 text-center text-[13px] text-[var(--text-light)]">
          No scholarships match your current filters.
        </p>
      ) : null}

      <ScholarshipCategorySection
        title="Government & sector scholarships"
        subtitle="Funded by GCC governments and major sector employers for their nationals"
        iconWrapClass="bg-[#E8F5EE]"
        count={gov.length}
        scholarships={gov}
        onSelect={setDetailId}
        savedIds={savedIds}
        onToggleSave={toggleSave}
        icon={
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2D6A4F"
            strokeWidth="1.8"
            aria-hidden
          >
            <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
          </svg>
        }
      />

      <ScholarshipCategorySection
        title="International scholarships"
        subtitle="State-backed international scholarship programs open to MENA students"
        iconWrapClass="bg-[#E6F1FB]"
        count={other.length}
        scholarships={other}
        onSelect={setDetailId}
        savedIds={savedIds}
        onToggleSave={toggleSave}
        icon={
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#185FA5"
            strokeWidth="1.8"
            aria-hidden
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        }
      />

      <ScholarshipDetailPanel
        scholarship={detailScholarship}
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        onApplyNow={() => {
          if (detailId) setApplySourceId(detailId);
          setApplyOpen(true);
        }}
      />

      <ScholarshipApplyModal
        scholarship={applyScholarship}
        open={applyOpen}
        onClose={() => {
          setApplyOpen(false);
          setApplySourceId(null);
        }}
      />
    </div>
  );
}

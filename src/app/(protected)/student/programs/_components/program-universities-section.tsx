"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useLocale } from "@/lib/i18n/locale-context";

import type { ProgramUniversityOffering } from "../_lib/get-program-university-offerings";
import {
  PROGRAM_UNIVERSITY_REGION_ALL,
  regionsForOfferings,
  type ProgramUniversityRegion,
} from "../_lib/program-university-region";
import detailStyles from "./program-detail.module.css";

type ProgramUniversitiesSectionProps = {
  programTitle: string;
  offerings: ProgramUniversityOffering[];
};

export function ProgramUniversitiesSection({
  programTitle,
  offerings,
}: ProgramUniversitiesSectionProps) {
  const { dict } = useLocale();
  const t = dict.student.programs;
  const [selectedRegion, setSelectedRegion] =
    useState<ProgramUniversityRegion>(PROGRAM_UNIVERSITY_REGION_ALL);
  const [selectedUniversity, setSelectedUniversity] =
    useState<ProgramUniversityOffering | null>(null);

  const availableRegions = useMemo(
    () => regionsForOfferings(offerings.map((item) => item.region)),
    [offerings],
  );

  const filteredOfferings = useMemo(() => {
    if (selectedRegion === PROGRAM_UNIVERSITY_REGION_ALL) return offerings;
    return offerings.filter(
      (item) => item.region != null && item.region === selectedRegion,
    );
  }, [offerings, selectedRegion]);

  const regionLabel = (region: ProgramUniversityRegion): string => {
    const labels = t.universityRegions as Record<string, string>;
    return labels[region] ?? region;
  };

  return (
    <section className={detailStyles.section}>
      <div className={detailStyles.sectionEyebrow}>{t.universitiesEyebrow}</div>
      <h2 className={detailStyles.sectionTitle}>
        {t.universitiesTitle.replace("{program}", programTitle)}
      </h2>
      <p className={detailStyles.sectionSub}>{t.universitiesSubtitle}</p>
      <div className={detailStyles.mvpNoteInline}>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <div>{t.universitiesVerifyNote}</div>
      </div>

      {offerings.length > 0 ? (
        <>
          {availableRegions.length > 1 ? (
            <div className={detailStyles.uniFilters}>
              {availableRegions.map((region) => (
                <button
                  key={region}
                  type="button"
                  className={
                    selectedRegion === region
                      ? `${detailStyles.uniFilter} ${detailStyles.uniFilterActive}`
                      : detailStyles.uniFilter
                  }
                  onClick={() => setSelectedRegion(region)}
                >
                  {regionLabel(region)}
                </button>
              ))}
            </div>
          ) : null}

          {filteredOfferings.length > 0 ? (
            <div className={detailStyles.uniGrid}>
              {filteredOfferings.map((university) => (
                <button
                  key={university.linkId}
                  type="button"
                  className={detailStyles.uniCard}
                  onClick={() => setSelectedUniversity(university)}
                >
                  <div className={detailStyles.uniTop}>
                    <div className={detailStyles.uniFlag}>
                      {university.countryCodeLabel}
                    </div>
                    <div className={detailStyles.uniInfo}>
                      <div className={detailStyles.uniName}>{university.name}</div>
                      <div className={detailStyles.uniLoc}>
                        {university.city}, {university.countryName}
                      </div>
                    </div>
                  </div>
                  <div className={detailStyles.uniStats}>
                    <div>
                      <span className={detailStyles.uniStatLabel}>
                        {t.universityRankingLabel}:{" "}
                      </span>
                      <span className={detailStyles.uniStatValue}>
                        {university.rankingNote}
                      </span>
                    </div>
                    <div>
                      <span className={detailStyles.uniStatLabel}>
                        {t.universityTuitionLabel}:{" "}
                      </span>
                      <span className={detailStyles.uniStatValue}>
                        {university.tuitionNote}
                      </span>
                    </div>
                  </div>
                  <div className={detailStyles.uniCta}>
                    {t.universityViewCta}
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden
                    >
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className={detailStyles.uniEmpty}>{t.universityRegionEmpty}</p>
          )}
        </>
      ) : (
        <p className={detailStyles.uniEmpty}>{t.universityListEmpty}</p>
      )}

      <Link href="/student/universities" className={detailStyles.universitiesCta}>
        {t.universitiesCta}
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden
        >
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </Link>

      {selectedUniversity ? (
        <div
          className={detailStyles.uniModalOverlay}
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedUniversity(null);
            }
          }}
        >
          <div
            className={detailStyles.uniModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="program-uni-modal-title"
          >
            <button
              type="button"
              className={detailStyles.uniModalClose}
              aria-label={t.universityModalClose}
              onClick={() => setSelectedUniversity(null)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className={detailStyles.uniModalEyebrow}>{t.universityModalEyebrow}</div>
            <h3 id="program-uni-modal-title" className={detailStyles.uniModalName}>
              {selectedUniversity.name}
            </h3>
            <div className={detailStyles.uniModalLoc}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {selectedUniversity.city}, {selectedUniversity.countryName}
            </div>

            <div className={detailStyles.uniModalTags}>
              {selectedUniversity.region ? (
                <span className={detailStyles.uniModalTag}>
                  {regionLabel(selectedUniversity.region)}
                </span>
              ) : null}
              <span className={detailStyles.uniModalTag}>
                {selectedUniversity.countryCodeLabel}
              </span>
            </div>

            {selectedUniversity.shortDescription ? (
              <p className={detailStyles.uniModalDesc}>
                {selectedUniversity.shortDescription}
              </p>
            ) : null}

            {selectedUniversity.programSchoolNote ? (
              <div className={detailStyles.uniModalSection}>
                <div className={detailStyles.uniModalSectLabel}>
                  {t.universityProgramNoteLabel}
                </div>
                <div className={detailStyles.uniModalSectText}>
                  {selectedUniversity.programSchoolNote}
                </div>
              </div>
            ) : null}

            <div className={detailStyles.uniModalStats}>
              <div className={detailStyles.uniModalStat}>
                <div className={detailStyles.uniModalStatL}>{t.universityRankingLabel}</div>
                <div className={detailStyles.uniModalStatV}>
                  {selectedUniversity.rankingNote}
                </div>
              </div>
              <div className={detailStyles.uniModalStat}>
                <div className={detailStyles.uniModalStatL}>{t.universityTuitionLabel}</div>
                <div className={detailStyles.uniModalStatV}>
                  {selectedUniversity.tuitionNote}
                </div>
              </div>
            </div>

            {selectedUniversity.email ||
            selectedUniversity.phone ||
            selectedUniversity.websiteUrl ? (
              <div className={detailStyles.uniModalContact}>
                <div className={detailStyles.uniModalSectLabelGreen}>
                  {t.universityContactLabel}
                </div>
                {selectedUniversity.email ? (
                  <div className={detailStyles.uniModalContactRow}>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22 6 12 13 2 6" />
                    </svg>
                    <a href={`mailto:${selectedUniversity.email}`}>
                      {selectedUniversity.email}
                    </a>
                  </div>
                ) : null}
                {selectedUniversity.phone ? (
                  <div className={detailStyles.uniModalContactRow}>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                    </svg>
                    <a href={`tel:${selectedUniversity.phone.replace(/\s/g, "")}`}>
                      {selectedUniversity.phone}
                    </a>
                  </div>
                ) : null}
                {selectedUniversity.websiteUrl ? (
                  <div className={detailStyles.uniModalContactRow}>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                    </svg>
                    <a
                      href={selectedUniversity.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {selectedUniversity.websiteUrl.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className={detailStyles.uniModalActions}>
              {selectedUniversity.websiteUrl ? (
                <a
                  className={`${detailStyles.uniModalBtn} ${detailStyles.uniModalBtnPrimary}`}
                  href={selectedUniversity.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t.universityVisitWebsite}
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden
                  >
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </a>
              ) : null}
              {selectedUniversity.admissionsPageUrl ? (
                <a
                  className={detailStyles.uniModalBtn}
                  href={selectedUniversity.admissionsPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t.universityAdmissionsPage}
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden
                  >
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              ) : null}
              <Link href={selectedUniversity.detailHref} className={detailStyles.uniModalBtn}>
                {t.universityViewCta}
              </Link>
              <button
                type="button"
                className={detailStyles.uniModalBtn}
                onClick={() => setSelectedUniversity(null)}
              >
                {t.universityModalClose}
              </button>
            </div>

            <div className={detailStyles.uniModalVerify}>{t.universityModalVerify}</div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

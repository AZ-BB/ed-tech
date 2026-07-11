"use client";

import type {
  InternshipLocFilter,
  InternshipPayFilter,
} from "../_lib/parse-internship-discovery-search-params";
import { INTERNSHIP_LOC_CODES } from "../_lib/parse-internship-discovery-search-params";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import { useLocale } from "@/lib/i18n/locale-context";

type Props = {
  loc: InternshipLocFilter;
  pay: InternshipPayFilter;
  favouritesOnly: boolean;
  onLocChange: (v: InternshipLocFilter) => void;
  onPayChange: (v: InternshipPayFilter) => void;
  onFavouritesChange: (on: boolean) => void;
  onClearFilters: () => void;
};

export function InternshipSelectorBar({
  loc,
  pay,
  favouritesOnly,
  onLocChange,
  onPayChange,
  onFavouritesChange,
  onClearFilters,
}: Props) {
  const { dict } = useLocale();
  const t = dict.student.internships;
  const hasActiveFilters =
    loc !== "any" || pay !== "any" || favouritesOnly;

  return (
    <div className="internship-selector-bar">
      <div className="internship-selector-filters">
      <span>{t.location}</span>
      <select
        className="internship-sel"
        value={loc}
        aria-label={t.location}
        onChange={(e) => onLocChange(e.target.value as InternshipLocFilter)}
      >
        <option value="any">{t.anyLocation}</option>
        <optgroup label={t.optGroupGcc}>
          {INTERNSHIP_LOC_CODES.slice(0, 6).map((code) => (
            <option key={code} value={code}>
              {getCountryNameByAlpha2(code) ?? code}
            </option>
          ))}
        </optgroup>
        <optgroup label={t.optGroupLevant}>
          {INTERNSHIP_LOC_CODES.slice(6).map((code) => (
            <option key={code} value={code}>
              {getCountryNameByAlpha2(code) ?? code}
            </option>
          ))}
        </optgroup>
        <optgroup label={t.optGroupMulti}>
          <option value="MENA">{t.menaMulti}</option>
          <option value="Remote">{t.remoteAnywhere}</option>
        </optgroup>
      </select>
      <span>{t.compensation}</span>
      <select
        className="internship-sel"
        value={pay}
        aria-label={t.compensation}
        onChange={(e) => onPayChange(e.target.value as InternshipPayFilter)}
      >
        <option value="any">{t.paidOrFree}</option>
        <option value="paid">{t.paidOnly}</option>
        <option value="free">{t.freeNoCost}</option>
      </select>
      </div>
      <div className="internship-selector-actions">
      <button
        type="button"
        className={
          favouritesOnly
            ? "internship-fav-btn internship-fav-btn-on"
            : "internship-fav-btn"
        }
        aria-pressed={favouritesOnly}
        aria-label={
          favouritesOnly ? t.showAllInternships : t.showFavouritesOnly
        }
        title={favouritesOnly ? t.showAllInternships : t.showFavouritesOnly}
        onClick={() => onFavouritesChange(!favouritesOnly)}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={favouritesOnly ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
        </svg>
        {t.favourites}
      </button>
      {hasActiveFilters ? (
        <button
          type="button"
          className="internship-clear-btn"
          onClick={onClearFilters}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
          {t.clearFilters}
        </button>
      ) : null}
      </div>
    </div>
  );
}

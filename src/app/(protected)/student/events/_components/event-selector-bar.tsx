"use client";

import { getLocalizedCountryName } from "@/lib/countries";
import { useLocale } from "@/lib/i18n/locale-context";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  EVENT_LOCATION_GROUPS,
  getOtherEventLocations,
  type EventLocationOption,
} from "../_lib/event-location-options";
import {
  EVENT_MODE_OPTIONS,
  EVENT_MONTH_OPTIONS,
} from "../_lib/parse-event-discovery-search-params";

type EventSelectorBarProps = {
  q: string;
  location: string;
  month: string;
  type: string;
  mode: string;
  locations: string[];
  types: string[];
  labels: {
    searchPlaceholder: string;
    location: string;
    month: string;
    type: string;
    format: string;
    clearFilters: string;
    locationOnline: string;
    optGroupGcc: string;
    optGroupLevant: string;
    optGroupNorthAfrica: string;
    optGroupOther: string;
  };
};

function mergeSearchHref(
  pathname: string,
  current: URLSearchParams,
  patch: Record<string, string | undefined>,
): string {
  const next = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  next.delete("detail");
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function EventSelectorBar({
  q,
  location,
  month,
  type,
  mode,
  locations,
  types,
  labels,
}: EventSelectorBarProps) {
  const pathname = usePathname() ?? "/student/events";
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(patch: Record<string, string | undefined>) {
    router.push(mergeSearchHref(pathname, searchParams, patch));
  }

  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center gap-3 rounded-[18px] border-[1.5px] border-[var(--border-light)] bg-white px-6 py-4 transition focus-within:border-[var(--green-light)] focus-within:shadow-[0_0_0_4px_rgba(45,106,79,0.06)]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a0a0a0" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="search"
          defaultValue={q}
          placeholder={labels.searchPlaceholder}
          className="w-full border-none bg-transparent text-[14px] text-[var(--text)] outline-none placeholder:text-[#c0bdb8]"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              navigate({ q: e.currentTarget.value });
            }
          }}
          onBlur={(e) => {
            if (e.currentTarget.value !== q) {
              navigate({ q: e.currentTarget.value });
            }
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2.5 rounded-[18px] border border-[var(--border-light)] bg-white px-6 py-4">
        <FilterSelect
          label={labels.format}
          value={mode}
          options={EVENT_MODE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          onChange={(value) => navigate({ mode: value })}
        />
        <LocationFilterSelect
          value={location}
          availableLocations={locations}
          labels={labels}
          onChange={(value) => navigate({ location: value })}
        />
        <FilterSelect
          label={labels.month}
          value={month}
          options={EVENT_MONTH_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          onChange={(value) => navigate({ month: value })}
        />
        <FilterSelect
          label={labels.type}
          value={type}
          options={[{ value: "", label: labels.type }, ...types.map((t) => ({ value: t, label: t }))]}
          onChange={(value) => navigate({ type: value })}
        />
        <button
          type="button"
          onClick={() =>
            navigate({ q: undefined, location: undefined, month: undefined, type: undefined, mode: undefined })
          }
          className="ml-auto h-9 rounded-full border-[1.5px] border-[var(--border)] bg-white px-[18px] text-[11.5px] font-medium leading-none text-[var(--text-light)] transition hover:border-[var(--green)] hover:bg-[var(--green-pale)] hover:text-[var(--green)]"
        >
          {labels.clearFilters}
        </button>
      </div>
    </div>
  );
}

function LocationFilterSelect({
  value,
  availableLocations,
  labels,
  onChange,
}: {
  value: string;
  availableLocations: string[];
  labels: EventSelectorBarProps["labels"];
  onChange: (value: string) => void;
}) {
  const { locale } = useLocale();
  const showOnline = availableLocations.includes("Online");
  const otherLocations = getOtherEventLocations(availableLocations);
  const unknownSelected =
    value !== "" &&
    value !== "Online" &&
    !EVENT_LOCATION_GROUPS.some((group) =>
      group.options.some((option) => option.value === value),
    ) &&
    !otherLocations.includes(value);

  const groupLabels: Record<
    (typeof EVENT_LOCATION_GROUPS)[number]["key"],
    string
  > = {
    gcc: labels.optGroupGcc,
    levant: labels.optGroupLevant,
    northAfrica: labels.optGroupNorthAfrica,
  };

  function optionLabel(option: EventLocationOption): string {
    return getLocalizedCountryName(option.alpha2, locale);
  }

  return (
    <select
      aria-label={labels.location}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={filterSelectClassName}
      style={filterSelectStyle}
    >
      <option value="">{labels.location}</option>
      {unknownSelected ? <option value={value}>{value}</option> : null}
      {showOnline ? <option value="Online">{labels.locationOnline}</option> : null}
      {EVENT_LOCATION_GROUPS.map((group) => (
        <optgroup key={group.key} label={groupLabels[group.key]}>
          {group.options.map((option) => (
            <option key={option.value} value={option.value}>
              {optionLabel(option)}
            </option>
          ))}
        </optgroup>
      ))}
      {otherLocations.length > 0 ? (
        <optgroup label={labels.optGroupOther}>
          {otherLocations.map((locationName) => (
            <option key={locationName} value={locationName}>
              {locationName}
            </option>
          ))}
        </optgroup>
      ) : null}
    </select>
  );
}

const filterSelectClassName =
  "h-9 min-w-[132px] cursor-pointer appearance-none rounded-full border-[1.5px] border-[var(--border)] bg-white bg-[length:10px_6px] bg-[position:right_12px_center] bg-no-repeat py-2 pl-3.5 pr-8 text-[12px] leading-none text-[var(--text-mid)] outline-none transition hover:border-[var(--text-hint)] focus:border-[var(--green-light)]";

const filterSelectStyle = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237a7a7a' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")",
} as const;

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={filterSelectClassName}
      style={filterSelectStyle}
    >
      {options.map((option) => (
        <option key={`${label}-${option.value || "all"}`} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

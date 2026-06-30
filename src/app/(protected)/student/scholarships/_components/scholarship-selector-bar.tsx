"use client";

import { useRef } from "react";

import type { Country } from "@/lib/countries";
import { COUNTRIES } from "@/lib/countries";
import { useLocale } from "@/lib/i18n/locale-context";

/**
 * Arab states for the nationality filter (ISO alpha-2, uppercase).
 * Order: Gulf first, then Levant / Iraq, then North Africa, then commonly associated states present in `COUNTRIES`.
 */
const ARAB_NATIONALITY_ALPHA2_ORDER: readonly string[] = [
  "AE",
  "SA",
  "QA",
  "KW",
  "BH",
  "OM",
  "IQ",
  "JO",
  "LB",
  "SY",
  "PS",
  "YE",
  "EG",
  "LY",
  "TN",
  "DZ",
  "MA",
  "MR",
  "SD",
  "DJ",
  "SO",
  "KM",
];

const countryByAlpha2Upper = new Map(
  COUNTRIES.map((c) => [c.alpha2.toUpperCase(), c] as const),
);

const ARAB_COUNTRIES_FOR_NATIONALITY: readonly Country[] =
  ARAB_NATIONALITY_ALPHA2_ORDER.flatMap((code) => {
    const c = countryByAlpha2Upper.get(code);
    return c ? [c] : [];
  });

const arabNationalityAlpha2Lower = new Set(
  ARAB_COUNTRIES_FOR_NATIONALITY.map((c) => c.alpha2.toLowerCase()),
);

const NON_ARAB_COUNTRIES: readonly Country[] = COUNTRIES.filter(
  (c) => !arabNationalityAlpha2Lower.has(c.alpha2.toLowerCase()),
);

const DEMONYM: Record<string, string> = {
  AE: "Emirati", SA: "Saudi", QA: "Qatari", KW: "Kuwaiti", BH: "Bahraini",
  OM: "Omani", IQ: "Iraqi", JO: "Jordanian", LB: "Lebanese", SY: "Syrian",
  PS: "Palestinian", YE: "Yemeni", EG: "Egyptian", LY: "Libyan", TN: "Tunisian",
  DZ: "Algerian", MA: "Moroccan", MR: "Mauritanian", SD: "Sudanese",
  DJ: "Djiboutian", SO: "Somali", KM: "Comorian",
  AF: "Afghan", AL: "Albanian", AD: "Andorran", AO: "Angolan", AG: "Antiguan",
  AR: "Argentine", AM: "Armenian", AU: "Australian", AT: "Austrian",
  AZ: "Azerbaijani", BS: "Bahamian", BD: "Bangladeshi", BB: "Barbadian",
  BY: "Belarusian", BE: "Belgian", BZ: "Belizean", BJ: "Beninese", BT: "Bhutanese",
  BO: "Bolivian", BA: "Bosnian", BW: "Botswanan", BR: "Brazilian", BN: "Bruneian",
  BG: "Bulgarian", BF: "Burkinabé", BI: "Burundian", KH: "Cambodian",
  CM: "Cameroonian", CA: "Canadian", CV: "Cape Verdean", CF: "Central African",
  TD: "Chadian", CL: "Chilean", CN: "Chinese", CO: "Colombian", CG: "Congolese",
  CD: "Congolese (DRC)", CR: "Costa Rican", CI: "Ivorian", HR: "Croatian",
  CU: "Cuban", CY: "Cypriot", CZ: "Czech", DK: "Danish", DO: "Dominican",
  EC: "Ecuadorian", SV: "Salvadoran", GQ: "Equatoguinean", ER: "Eritrean",
  EE: "Estonian", SZ: "Swazi", ET: "Ethiopian", FJ: "Fijian", FI: "Finnish",
  FR: "French", GA: "Gabonese", GM: "Gambian", GE: "Georgian", DE: "German",
  GH: "Ghanaian", GR: "Greek", GD: "Grenadian", GT: "Guatemalan", GN: "Guinean",
  GW: "Bissau-Guinean", GY: "Guyanese", HT: "Haitian", HN: "Honduran",
  HU: "Hungarian", IS: "Icelandic", IN: "Indian", ID: "Indonesian", IR: "Iranian",
  IE: "Irish", IL: "Israeli", IT: "Italian", JM: "Jamaican", JP: "Japanese",
  KZ: "Kazakh", KE: "Kenyan", KI: "I-Kiribati", KP: "North Korean",
  KR: "South Korean", XK: "Kosovar", KG: "Kyrgyz", LA: "Laotian", LV: "Latvian",
  LS: "Basotho", LR: "Liberian", LI: "Liechtensteiner", LT: "Lithuanian",
  LU: "Luxembourgish", MG: "Malagasy", MW: "Malawian", MY: "Malaysian",
  MV: "Maldivian", ML: "Malian", MT: "Maltese", MH: "Marshallese", MX: "Mexican",
  FM: "Micronesian", MD: "Moldovan", MC: "Monégasque", MN: "Mongolian",
  ME: "Montenegrin", MZ: "Mozambican", MM: "Burmese", NA: "Namibian", NR: "Nauruan",
  NP: "Nepali", NL: "Dutch", NZ: "New Zealander", NI: "Nicaraguan", NE: "Nigerien",
  NG: "Nigerian", MK: "North Macedonian", NO: "Norwegian", PK: "Pakistani",
  PW: "Palauan", PA: "Panamanian", PG: "Papua New Guinean", PY: "Paraguayan",
  PE: "Peruvian", PH: "Filipino", PL: "Polish", PT: "Portuguese", RO: "Romanian",
  RU: "Russian", RW: "Rwandan", KN: "Kittitian", LC: "Saint Lucian",
  VC: "Vincentian", WS: "Samoan", SM: "Sammarinese", ST: "São Toméan",
  SN: "Senegalese", RS: "Serbian", SC: "Seychellois", SL: "Sierra Leonean",
  SG: "Singaporean", SK: "Slovak", SI: "Slovenian", SB: "Solomon Islander",
  ZA: "South African", SS: "South Sudanese", ES: "Spanish", LK: "Sri Lankan",
  SR: "Surinamese", SE: "Swedish", CH: "Swiss", TJ: "Tajik", TZ: "Tanzanian",
  TH: "Thai", TL: "Timorese", TG: "Togolese", TO: "Tongan", TT: "Trinidadian",
  TR: "Turkish", TM: "Turkmen", TV: "Tuvaluan", UG: "Ugandan", UA: "Ukrainian",
  GB: "British", US: "American", UY: "Uruguayan", UZ: "Uzbek", VU: "Vanuatuan",
  VA: "Vatican", VE: "Venezuelan", VN: "Vietnamese", ZM: "Zambian", ZW: "Zimbabwean",
  TW: "Taiwanese", HK: "Hong Konger", MO: "Macanese",
};

function demonym(c: Country): string {
  return DEMONYM[c.alpha2.toUpperCase()] ?? c.name;
}

const selectClass =
  "min-w-[160px] cursor-pointer appearance-none rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] bg-white py-2.5 pl-4 pr-9 text-[13px] text-[var(--text)] focus:border-[var(--green-light)] focus:outline-none";

const inputClass =
  "min-w-[200px] flex-1 rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 text-[13px] text-[var(--text)] placeholder:text-[var(--text-hint)] focus:border-[var(--green-light)] focus:outline-none";

const favouritesToggleBase =
  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] px-4 py-2.5 text-[13px] font-medium transition-all";

const favouritesToggleOffClass = `${favouritesToggleBase} border-[#b8860b]/40 bg-[#fef9e7]/50 text-[#b8860b]/60 hover:bg-[#fef9e7]/70 hover:text-[#b8860b]`;
const favouritesToggleOnClass = `${favouritesToggleBase} border-[#b8860b] bg-[#fef9e7] text-[#b8860b]`;

/** Labels for filter values that are not plain ISO alpha-2 codes. */
function buildSyntheticNationalityOptions(t: {
  euCitizen: string;
  usCitizen: string;
  gbCitizen: string;
  caCitizen: string;
  otherNationality: string;
}) {
  return [
    { value: "eu-cit", label: t.euCitizen },
    { value: "us-cit", label: t.usCitizen },
    { value: "gb-cit", label: t.gbCitizen },
    { value: "ca-cit", label: t.caCitizen },
    { value: "other", label: t.otherNationality },
  ] as const;
}

const destinationNameSet = new Set(COUNTRIES.map((c) => c.name));

const alpha2LowerSet = new Set(COUNTRIES.map((c) => c.alpha2.toLowerCase()));

type Props = {
  q: string;
  nationality: string;
  destination: string;
  coverage: string;
  favouritesOnly: boolean;
  hasActiveFilters: boolean;
  onNationalityChange: (v: string) => void;
  onDestinationChange: (v: string) => void;
  onCoverageChange: (v: string) => void;
  onFavouritesToggle: () => void;
  onSearchSubmit: (q: string) => void;
  onClearFilters: () => void;
};

export function ScholarshipSelectorBar({
  q,
  nationality,
  destination,
  coverage,
  favouritesOnly,
  hasActiveFilters,
  onNationalityChange,
  onDestinationChange,
  onCoverageChange,
  onFavouritesToggle,
  onSearchSubmit,
  onClearFilters,
}: Props) {
  const { dict } = useLocale();
  const t = dict.student.scholarships;
  const syntheticNationalityOptions = buildSyntheticNationalityOptions(t);
  const searchRef = useRef<HTMLInputElement>(null);

  const nationalityUnknown =
    nationality !== "any" &&
    !alpha2LowerSet.has(nationality) &&
    !syntheticNationalityOptions.some((o) => o.value === nationality);

  const destinationUnknown =
    destination !== "any" &&
    destination.trim().length > 0 &&
    !destinationNameSet.has(destination);

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white px-6 py-[18px] text-[14px] text-[var(--text-mid)] max-[700px]:items-stretch">
      <div className="flex w-full min-w-0 flex-wrap items-center gap-2.5 max-[700px]:flex-col max-[700px]:items-stretch">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5 max-[700px]:w-full max-[700px]:flex-col max-[700px]:items-stretch">
        <span>{t.iAmA}</span>
        <div className="relative inline-block">
          <select
            className={selectClass}
            value={nationality}
            onChange={(e) => onNationalityChange(e.target.value)}
            aria-label={t.nationality}
          >
            <option value="any">{t.anyNationality}</option>
            {nationalityUnknown ? (
              <option value={nationality}>{nationality}</option>
            ) : null}
            <optgroup label={t.arabNationalities}>
              {ARAB_COUNTRIES_FOR_NATIONALITY.map((c) => (
                <option key={c.alpha2} value={c.alpha2.toLowerCase()}>
                  {demonym(c)}
                </option>
              ))}
            </optgroup>
            <optgroup label={t.allCountries}>
              {NON_ARAB_COUNTRIES.map((c) => (
                <option key={c.alpha2} value={c.alpha2.toLowerCase()}>
                  {demonym(c)}
                </option>
              ))}
            </optgroup>
            <optgroup label={t.regionalOther}>
              {syntheticNationalityOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          </select>
          <Chevron className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
        </div>
        <span>{t.lookingToStudyIn}</span>
        <div className="relative inline-block">
          <select
            className={selectClass}
            value={destination}
            onChange={(e) => onDestinationChange(e.target.value)}
            aria-label={t.destination}
          >
            <option value="any">{t.anyDestination}</option>
            {destinationUnknown ? (
              <option value={destination}>{destination}</option>
            ) : null}
            <optgroup label={t.allCountries}>
              {COUNTRIES.map((c) => (
                <option key={c.alpha2} value={c.name}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          </select>
          <Chevron className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
        </div>
        <span>{t.andWantA}</span>
        <div className="relative inline-block">
          <select
            className={selectClass}
            value={coverage}
            onChange={(e) => onCoverageChange(e.target.value)}
            aria-label={t.coverageType}
          >
            <option value="any">{t.anyCoverage}</option>
            <option value="full">{t.fullScholarship}</option>
            <option value="partial">{t.partialScholarship}</option>
          </select>
          <Chevron className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
        </div>
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            className="ml-auto inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-[50px] px-3 py-1.5 text-[11px] font-medium text-[var(--text-hint)] transition hover:bg-[var(--green-pale)] hover:text-[var(--green)] max-[700px]:ml-0 max-[700px]:self-end"
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
      <div className="flex flex-wrap items-end gap-2 border-t border-[var(--border-light)] pt-3 max-[700px]:flex-col">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-[12px] font-medium text-[var(--text-light)]">
          {t.search}
          <input
            key={q}
            ref={searchRef}
            type="search"
            className={inputClass}
            placeholder={t.searchPlaceholder}
            defaultValue={q}
            aria-label={t.searchScholarships}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSearchSubmit(searchRef.current?.value ?? "");
              }
            }}
          />
        </label>
        <button
          type="button"
          aria-pressed={favouritesOnly}
          aria-label={
            favouritesOnly ? t.showAllScholarships : t.showFavouritesOnly
          }
          className={favouritesOnly ? favouritesToggleOnClass : favouritesToggleOffClass}
          onClick={onFavouritesToggle}
        >
          {t.favourites}
        </button>
        <button
          type="button"
          className="rounded-[var(--radius-pill)] bg-[var(--green)] px-5 py-2.5 text-[13px] font-medium text-white hover:opacity-95"
          onClick={() => onSearchSubmit(searchRef.current?.value ?? "")}
        >
          {t.search}
        </button>
      </div>
    </div>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="10"
      height="6"
      viewBox="0 0 10 6"
      fill="none"
      aria-hidden
    >
      <path
        d="M1 1l4 4 4-4"
        stroke="#7a7a7a"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

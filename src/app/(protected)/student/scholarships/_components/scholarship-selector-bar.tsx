"use client";

import { useRef } from "react";

import type { Country } from "@/lib/countries";
import { COUNTRIES } from "@/lib/countries";

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
  "min-w-[160px] cursor-pointer appearance-none rounded-[var(--radius-sm)] border-[1.5px] border-[var(--border)] bg-white py-2.5 pl-4 pr-9 text-[13px] text-[var(--text)] focus:border-[var(--green-light)] focus:outline-none";

const inputClass =
  "min-w-[200px] flex-1 rounded-[var(--radius-sm)] border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 text-[13px] text-[var(--text)] placeholder:text-[var(--text-hint)] focus:border-[var(--green-light)] focus:outline-none";

/** Labels for filter values that are not plain ISO alpha-2 codes. */
const SYNTHETIC_NATIONALITY_OPTIONS: readonly { value: string; label: string }[] =
  [
    { value: "eu-cit", label: "European Union (any member state)" },
    { value: "us-cit", label: "United States citizen" },
    { value: "gb-cit", label: "United Kingdom citizen" },
    { value: "ca-cit", label: "Canadian citizen" },
    { value: "other", label: "Other nationality" },
  ];

const destinationNameSet = new Set(COUNTRIES.map((c) => c.name));

const alpha2LowerSet = new Set(COUNTRIES.map((c) => c.alpha2.toLowerCase()));

type Props = {
  q: string;
  nationality: string;
  destination: string;
  coverage: string;
  onNationalityChange: (v: string) => void;
  onDestinationChange: (v: string) => void;
  onCoverageChange: (v: string) => void;
  onSearchSubmit: (q: string) => void;
};

export function ScholarshipSelectorBar({
  q,
  nationality,
  destination,
  coverage,
  onNationalityChange,
  onDestinationChange,
  onCoverageChange,
  onSearchSubmit,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);

  const nationalityUnknown =
    nationality !== "any" &&
    !alpha2LowerSet.has(nationality) &&
    !SYNTHETIC_NATIONALITY_OPTIONS.some((o) => o.value === nationality);

  const destinationUnknown =
    destination !== "any" &&
    destination.trim().length > 0 &&
    !destinationNameSet.has(destination);

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white px-6 py-[18px] text-[14px] text-[var(--text-mid)] max-[700px]:items-stretch">
      <div className="flex flex-wrap items-center gap-2.5 max-[700px]:flex-col max-[700px]:items-stretch">
        <span>I am a</span>
        <div className="relative inline-block">
          <select
            className={selectClass}
            value={nationality}
            onChange={(e) => onNationalityChange(e.target.value)}
            aria-label="Nationality"
          >
            <option value="any">Any nationality</option>
            {nationalityUnknown ? (
              <option value={nationality}>{nationality}</option>
            ) : null}
            <optgroup label="Arab nationalities">
              {ARAB_COUNTRIES_FOR_NATIONALITY.map((c) => (
                <option key={c.alpha2} value={c.alpha2.toLowerCase()}>
                  {demonym(c)}
                </option>
              ))}
            </optgroup>
            <optgroup label="All countries">
              {NON_ARAB_COUNTRIES.map((c) => (
                <option key={c.alpha2} value={c.alpha2.toLowerCase()}>
                  {demonym(c)}
                </option>
              ))}
            </optgroup>
            <optgroup label="Regional / other">
              {SYNTHETIC_NATIONALITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          </select>
          <Chevron className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
        </div>
        <span>looking to study in</span>
        <div className="relative inline-block">
          <select
            className={selectClass}
            value={destination}
            onChange={(e) => onDestinationChange(e.target.value)}
            aria-label="Destination"
          >
            <option value="any">Any destination</option>
            {destinationUnknown ? (
              <option value={destination}>{destination}</option>
            ) : null}
            <optgroup label="All countries">
              {COUNTRIES.map((c) => (
                <option key={c.alpha2} value={c.name}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          </select>
          <Chevron className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
        </div>
        <span>and want a</span>
        <div className="relative inline-block">
          <select
            className={selectClass}
            value={coverage}
            onChange={(e) => onCoverageChange(e.target.value)}
            aria-label="Coverage type"
          >
            <option value="any">Any coverage</option>
            <option value="full">Full scholarship</option>
            <option value="partial">Partial scholarship</option>
          </select>
          <Chevron className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2 border-t border-[var(--border-light)] pt-3 max-[700px]:flex-col">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-[12px] font-medium text-[var(--text-light)]">
          Search
          <input
            key={q}
            ref={searchRef}
            type="search"
            className={inputClass}
            placeholder="Name, provider, country, field of study…"
            defaultValue={q}
            aria-label="Search scholarships"
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
          className="rounded-[var(--radius-sm)] bg-[var(--green)] px-4 py-2.5 text-[13px] font-medium text-white hover:opacity-95"
          onClick={() => onSearchSubmit(searchRef.current?.value ?? "")}
        >
          Search
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

"use client";

const selectClass =
  "min-w-[160px] cursor-pointer appearance-none rounded-[var(--radius-sm)] border-[1.5px] border-[var(--border)] bg-white py-2.5 pl-4 pr-9 text-[13px] text-[var(--text)] focus:border-[var(--green-light)] focus:outline-none";

type Props = {
  nationality: string;
  destination: string;
  coverage: string;
  onNationalityChange: (v: string) => void;
  onDestinationChange: (v: string) => void;
  onCoverageChange: (v: string) => void;
};

export function ScholarshipSelectorBar({
  nationality,
  destination,
  coverage,
  onNationalityChange,
  onDestinationChange,
  onCoverageChange,
}: Props) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2.5 rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white px-6 py-[18px] text-[14px] text-[var(--text-mid)] max-[700px]:flex-col max-[700px]:items-stretch">
      <span>I am a</span>
      <div className="relative inline-block">
        <select
          className={selectClass}
          value={nationality}
          onChange={(e) => onNationalityChange(e.target.value)}
          aria-label="Nationality"
        >
          <option value="any">Any nationality</option>
          <optgroup label="GCC">
            <option value="ae">UAE national</option>
            <option value="sa">Saudi national</option>
            <option value="qa">Qatari national</option>
            <option value="kw">Kuwaiti national</option>
            <option value="om">Omani national</option>
            <option value="bh">Bahraini national</option>
          </optgroup>
          <optgroup label="MENA / Arab">
            <option value="eg">Egyptian national</option>
            <option value="jo">Jordanian national</option>
            <option value="lb">Lebanese national</option>
            <option value="ps">Palestinian national</option>
            <option value="iq">Iraqi national</option>
            <option value="ma">Moroccan national</option>
            <option value="tn">Tunisian national</option>
            <option value="dz">Algerian national</option>
            <option value="ly">Libyan national</option>
            <option value="sd">Sudanese national</option>
            <option value="sy">Syrian national</option>
            <option value="ye">Yemeni national</option>
          </optgroup>
          <optgroup label="Global">
            <option value="us-cit">United States citizen</option>
            <option value="gb-cit">United Kingdom citizen</option>
            <option value="ca-cit">Canadian citizen</option>
            <option value="eu-cit">European (any EU country)</option>
            <option value="other">Other nationality</option>
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
          <optgroup label="Popular destinations">
            <option value="United Kingdom">United Kingdom</option>
            <option value="United States">United States</option>
            <option value="Canada">Canada</option>
            <option value="Australia">Australia</option>
            <option value="Germany">Germany</option>
            <option value="Netherlands">Netherlands</option>
            <option value="Ireland">Ireland</option>
            <option value="France">France</option>
            <option value="Spain">Spain</option>
            <option value="Italy">Italy</option>
            <option value="Switzerland">Switzerland</option>
            <option value="Turkey">Turkey</option>
            <option value="Malaysia">Malaysia</option>
          </optgroup>
          <optgroup label="MENA / GCC">
            <option value="Saudi Arabia">Saudi Arabia</option>
            <option value="United Arab Emirates">United Arab Emirates</option>
            <option value="Qatar">Qatar</option>
            <option value="Kuwait">Kuwait</option>
            <option value="Bahrain">Bahrain</option>
            <option value="Oman">Oman</option>
            <option value="Egypt">Egypt</option>
            <option value="Jordan">Jordan</option>
            <option value="Lebanon">Lebanon</option>
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

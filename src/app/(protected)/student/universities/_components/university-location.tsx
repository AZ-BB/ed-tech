import { CountryFlag } from "@/components/country-flag";

type Props = {
    city: string;
    state?: string | null;
    countryName: string;
    countryCode: string;
    className?: string;
    flagSize?: number;
};

export function UniversityLocation({
    city,
    state,
    countryName,
    countryCode,
    className,
    flagSize = 16,
}: Props) {
    const country = countryName?.trim() || countryCode;
    const prefix = state?.trim() ? `${city}, ${state}` : city;

    return (
        <span className={className}>
            {prefix},{" "}
            <span className="inline-flex items-center gap-1.5 align-middle whitespace-nowrap">
                {country}
                <CountryFlag code={countryCode} size={flagSize} />
            </span>
        </span>
    );
}

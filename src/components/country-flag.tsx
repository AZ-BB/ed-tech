import { countryFlagImageUrl } from "@/lib/country-flag-emoji";

type Props = {
  code: string | null | undefined;
  /** Display width in CSS pixels. */
  size?: number;
  className?: string;
};

export function CountryFlag({ code, size = 18, className }: Props) {
  const src = countryFlagImageUrl(code, size <= 20 ? 40 : 80);
  if (!src) return null;

  const height = Math.max(12, Math.round(size * 0.72));

  return (
    <img
      src={src}
      alt=""
      width={21}
      height={20}
      className={className ?? "shrink-0 rounded-[2px] border border-black/5 object-cover"}
      loading="lazy"
      decoding="async"
      aria-hidden
    />
  );
}

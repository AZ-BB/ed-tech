function initialsFromNames(firstName: string, lastName: string): string {
  const a = firstName.trim()[0];
  const b = lastName.trim()[0];
  const pair = `${a ?? ""}${b ?? ""}`.toUpperCase();
  if (pair) return pair.slice(0, 2);
  if (a) return a.toUpperCase();
  return "?";
}

const SIZE_CLASS = {
  xs: "h-[18px] w-[18px] text-[9px]",
  sm: "h-[30px] w-[30px] text-[11.5px]",
  md: "h-16 w-16 text-[18px]",
  lg: "h-[72px] w-[72px] text-2xl font-[family-name:var(--font-dm-serif)]",
} as const;

export type PersonProfileAvatarProps = {
  avatarUrl?: string | null;
  firstName: string;
  lastName: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  imgClassName?: string;
};

export function PersonProfileAvatar({
  avatarUrl,
  firstName,
  lastName,
  size = "sm",
  className = "",
  imgClassName = "",
}: PersonProfileAvatarProps) {
  const sizeClass = SIZE_CLASS[size];
  const url = avatarUrl?.trim() || null;

  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`shrink-0 rounded-full object-cover ${sizeClass} ${className} ${imgClassName}`.trim()}
      />
    );
  }

  const initials = initialsFromNames(firstName, lastName);
  const initialsFont =
    size === "lg" || size === "md"
      ? "font-bold"
      : size === "xs"
        ? "font-semibold"
        : "font-semibold";

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] text-[var(--green-dark)] ${sizeClass} ${initialsFont} ${className}`.trim()}
      aria-hidden
    >
      {initials}
    </div>
  );
}

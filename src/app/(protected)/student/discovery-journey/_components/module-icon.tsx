export function ModuleIcon({
  icon,
  className,
  size = 24,
}: {
  icon: string;
  className?: string;
  size?: number;
}) {
  const paths = icon.split("|").map((p) => p.trim()).filter(Boolean);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

import clsx from "clsx";

type Props = {
  className?: string;
  size?: number;
  strokeWidth?: number;
};

/** Horizontal back arrow — flips in RTL via `.icon-directional`. */
export function ArrowBackIcon({
  className,
  size = 14,
  strokeWidth = 2,
}: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      className={clsx("icon-directional shrink-0", className)}
      aria-hidden
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

/** Horizontal forward arrow — flips in RTL via `.icon-directional`. */
export function ArrowForwardIcon({
  className,
  size = 14,
  strokeWidth = 2.5,
}: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      className={clsx("icon-directional shrink-0", className)}
      aria-hidden
    >
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

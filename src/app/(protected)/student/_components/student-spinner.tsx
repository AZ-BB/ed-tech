import { Loader2 } from "lucide-react";

const SIZE_CLASS = {
  sm: "size-5",
  md: "size-8",
  lg: "size-10",
} as const;

type SpinnerSize = keyof typeof SIZE_CLASS;

type StudentSpinnerProps = {
  size?: SpinnerSize;
  className?: string;
};

export function StudentSpinner({ size = "md", className }: StudentSpinnerProps) {
  return (
    <Loader2
      className={`animate-spin text-[var(--green)] ${SIZE_CLASS[size]}${className ? ` ${className}` : ""}`}
      aria-hidden
    />
  );
}

type StudentLoadingCenterProps = {
  label?: string;
  size?: SpinnerSize;
  className?: string;
};

export function StudentLoadingCenter({
  label,
  size = "md",
  className,
}: StudentLoadingCenterProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-3 py-12${className ? ` ${className}` : ""}`}
    >
      <StudentSpinner size={size} />
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  );
}

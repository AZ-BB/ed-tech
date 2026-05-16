import { Loader2 } from "lucide-react";

export default function SchoolLoading() {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-14"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-8 animate-spin text-[#52B788]" aria-hidden />
      <p className="text-[13px] text-[#a0a0a0]">Loading…</p>
    </div>
  );
}

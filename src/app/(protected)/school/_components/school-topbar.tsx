import { logout } from "@/action/auth";

function LogoIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

export type SchoolTopbarProps = {
  firstName: string;
  schoolName: string;
  avatarInitials: string;
};

export function SchoolTopbar({ firstName, schoolName, avatarInitials }: SchoolTopbarProps) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between bg-[#1B4332] px-4 py-2.5 sm:px-7 sm:py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-white/15">
          <LogoIcon />
        </div>
        <span className="shrink-0 text-[15px] font-bold text-white">UniApply</span>
        <span className="hidden h-5 w-px shrink-0 bg-white/20 sm:block" aria-hidden />
        <span className="hidden truncate text-xs font-medium text-white/60 sm:inline">
          {schoolName}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-white/70">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-[11px] font-bold text-white">
            {avatarInitials}
          </div>
          <span className="max-w-[140px] truncate sm:max-w-[200px]" title={firstName}>
            {firstName}
          </span>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="cursor-pointer border-0 bg-transparent p-0 text-[11px] text-white/40 transition-colors hover:text-white"
          >
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}

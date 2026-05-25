"use client";

import {
  activateAdminSchool,
  deactivateAdminSchool,
} from "@/actions/admin-schools";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

type AdminSchoolsRowActionsMenuProps = {
  schoolId: string;
  schoolName: string;
  isActive: boolean;
};

type MenuPosition = {
  top: number;
  left: number;
};

function getMenuPosition(trigger: HTMLButtonElement, menuHeight = 44): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const menuWidth = 160;
  const gap = 4;

  let left = rect.left + rect.width / 2 - menuWidth / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));

  const spaceBelow = window.innerHeight - rect.bottom;
  const openBelow = spaceBelow >= menuHeight + gap;
  const top = openBelow ? rect.bottom + gap : rect.top - menuHeight - gap;

  return { top, left };
}

export function AdminSchoolsRowActionsMenu({
  schoolId,
  schoolName,
  isActive,
}: AdminSchoolsRowActionsMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [isPending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !triggerRef.current) return;

    function updatePosition() {
      if (!triggerRef.current) return;
      setMenuPosition(getMenuPosition(triggerRef.current));
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function runAction(action: () => Promise<{ ok: boolean; error?: string }>, confirmMessage: string) {
    if (!window.confirm(confirmMessage)) return;

    setOpen(false);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        window.alert(result.error ?? "Action failed.");
        return;
      }
      router.refresh();
    });
  }

  function handleActivate() {
    runAction(
      () => activateAdminSchool(schoolId),
      `Activate ${schoolName}? Students and teachers will be able to log in again.`,
    );
  }

  function handleDeactivate() {
    runAction(
      () => deactivateAdminSchool(schoolId),
      `Deactivate ${schoolName}? Students and teachers will not be able to log in.`,
    );
  }

  function toggleMenu() {
    setOpen((value) => {
      const next = !value;
      if (next && triggerRef.current) {
        setMenuPosition(getMenuPosition(triggerRef.current));
      }
      return next;
    });
  }

  const menu =
    open && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: menuPosition.top, left: menuPosition.left }}
            className="fixed z-[200] min-w-[160px] overflow-hidden rounded-[8px] border border-[#ece9e4] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
          >
            {isActive ? (
              <button
                type="button"
                role="menuitem"
                disabled={isPending}
                className="block w-full cursor-pointer px-3 py-2 text-left text-[12px] text-[#E74C3C] transition-colors hover:bg-[#FCEBEB] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleDeactivate}
              >
                Deactivate
              </button>
            ) : (
              <button
                type="button"
                role="menuitem"
                disabled={isPending}
                className="block w-full cursor-pointer px-3 py-2 text-left text-[12px] text-[#2D6A4F] transition-colors hover:bg-[#e8f5ee] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleActivate}
              >
                Activate
              </button>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="flex justify-center">
        <button
          ref={triggerRef}
          type="button"
          title="More actions"
          aria-label={`More actions for ${schoolName}`}
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={isPending}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[6px] border border-[#e0deda] bg-white text-[#4a4a4a] transition-all duration-150 hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={toggleMenu}
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-[14px] w-[14px]"
            aria-hidden
          >
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
            <circle cx="5" cy="12" r="1.5" />
          </svg>
        </button>
      </div>
      {menu}
    </>
  );
}

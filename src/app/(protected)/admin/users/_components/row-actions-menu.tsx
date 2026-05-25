"use client";

import { deactivateAdvisor, deleteAdvisor } from "@/actions/admin-advisors";
import { deactivateAmbassador, deleteAmbassador } from "@/actions/admin-ambassadors";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import type { UsersTabId } from "../_data/users-tabs-data";

type RowActionsMenuProps = {
  tabId: UsersTabId;
  userId: string;
  userName: string;
  isActive?: boolean;
};

type MenuPosition = {
  top: number;
  left: number;
};

function getMenuPosition(trigger: HTMLButtonElement, menuHeight = 88): MenuPosition {
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

export function RowActionsMenu({ tabId, userId, userName, isActive = true }: RowActionsMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [isPending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAdvisorTab = tabId === "advisors";
  const isAmbassadorTab = tabId === "ambassadors";
  const hasManagedActions = isAdvisorTab || isAmbassadorTab;

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

  function handleDeactivate() {
    const label = isAdvisorTab ? "advisor" : "ambassador";
    runAction(
      () => (isAdvisorTab ? deactivateAdvisor(userId) : deactivateAmbassador(userId)),
      `Deactivate ${userName}? This ${label} will no longer appear as active.`,
    );
  }

  function handleDelete() {
    const label = isAdvisorTab ? "advisor" : "ambassador";
    runAction(
      () => (isAdvisorTab ? deleteAdvisor(userId) : deleteAmbassador(userId)),
      `Delete ${userName}? This ${label} will be permanently removed. This cannot be undone.`,
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
            {hasManagedActions ? (
              <>
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
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  disabled={isPending}
                  className="block w-full cursor-pointer px-3 py-2 text-left text-[12px] text-[#E74C3C] transition-colors hover:bg-[#FCEBEB] disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleDelete}
                >
                  Delete
                </button>
              </>
            ) : (
              <button
                type="button"
                role="menuitem"
                className="block w-full cursor-pointer px-3 py-2 text-left text-[12px] text-[#E74C3C] transition-colors hover:bg-[#FCEBEB]"
                onClick={() => setOpen(false)}
              >
                Deactivate
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
          aria-label={`More actions for ${userName}`}
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

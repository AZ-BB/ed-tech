"use client";

import {
    addUniversityToFavourites,
    addUniversityToShortlist,
    removeUniversityFromFavourites,
    removeUniversityFromShortlist,
} from "@/actions/universities";
import { createContext, useCallback, useContext, useOptimistic, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type DetailActivityContextValue = {
    optimisticFavourite: boolean;
    optimisticShortlist: boolean;
    actionMessage: string | null;
    toggleFavourite: () => void;
    toggleShortlist: () => void;
};

const DetailActivityContext = createContext<DetailActivityContextValue | null>(null);

function useDetailStudentActivity(): DetailActivityContextValue {
    const ctx = useContext(DetailActivityContext);
    if (!ctx) {
        throw new Error("useDetailStudentActivity must be used within UniversityDetailStudentActivityProvider");
    }
    return ctx;
}

type ProviderProps = {
    universityId: string;
    initialShortlisted: boolean;
    initialFavourite: boolean;
    children: ReactNode;
};

export function UniversityDetailStudentActivityProvider({
    universityId,
    initialShortlisted,
    initialFavourite,
    children,
}: ProviderProps) {
    const router = useRouter();
    const [, startTransition] = useTransition();
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [optimisticShortlist, setOptimisticShortlist] = useOptimistic(
        initialShortlisted,
        (_c, next: boolean) => next,
    );
    const [optimisticFavourite, setOptimisticFavourite] = useOptimistic(
        initialFavourite,
        (_c, next: boolean) => next,
    );

    const toggleShortlist = useCallback(() => {
        setActionMessage(null);
        if (optimisticShortlist) {
            startTransition(async () => {
                setOptimisticShortlist(false);
                const res = await removeUniversityFromShortlist(universityId);
                if (res.error) {
                    const msg = typeof res.error === "string" ? res.error : "Something went wrong.";
                    setActionMessage(msg);
                    throw new Error(msg);
                }
                router.refresh();
            });
        } else {
            startTransition(async () => {
                setOptimisticShortlist(true);
                const res = await addUniversityToShortlist(universityId);
                if (res.error) {
                    const msg = typeof res.error === "string" ? res.error : "Something went wrong.";
                    setActionMessage(msg);
                    throw new Error(msg);
                }
                router.refresh();
            });
        }
    }, [optimisticShortlist, router, setOptimisticShortlist, universityId]);

    const toggleFavourite = useCallback(() => {
        setActionMessage(null);
        if (optimisticFavourite) {
            startTransition(async () => {
                setOptimisticFavourite(false);
                const res = await removeUniversityFromFavourites(universityId);
                if (res.error) {
                    const msg = typeof res.error === "string" ? res.error : "Something went wrong.";
                    setActionMessage(msg);
                    throw new Error(msg);
                }
                router.refresh();
            });
        } else {
            startTransition(async () => {
                setOptimisticFavourite(true);
                const res = await addUniversityToFavourites(universityId);
                if (res.error) {
                    const msg = typeof res.error === "string" ? res.error : "Something went wrong.";
                    setActionMessage(msg);
                    throw new Error(msg);
                }
                router.refresh();
            });
        }
    }, [optimisticFavourite, router, setOptimisticFavourite, universityId]);

    const value: DetailActivityContextValue = {
        optimisticFavourite,
        optimisticShortlist,
        actionMessage,
        toggleFavourite,
        toggleShortlist,
    };

    return <DetailActivityContext.Provider value={value}>{children}</DetailActivityContext.Provider>;
}

export function DetailHeaderFavouriteButton() {
    const { optimisticFavourite, toggleFavourite } = useDetailStudentActivity();

    return (
        <button
            type="button"
            aria-label={optimisticFavourite ? "Remove from favourites" : "Save university to favourites"}
            title={optimisticFavourite ? "Remove from favourites" : "Save university"}
            onClick={(e) => {
                e.preventDefault();
                toggleFavourite();
            }}
            className={`flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-xl border transition-colors ${
                optimisticFavourite
                    ? "border-[#c9a227] bg-[#fffbeb] hover:bg-[#fff3c4]"
                    : "border-[#e0deda] bg-white hover:bg-[#f4f3f0]"
            }`}
        >
            {optimisticFavourite ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#b8860b" stroke="#b8860b" strokeWidth="1.4">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
                </svg>
            ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7a7a7a" strokeWidth="1.8">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
                </svg>
            )}
        </button>
    );
}

export function DetailSidebarActivityButtons() {
    const { optimisticFavourite, optimisticShortlist, actionMessage, toggleFavourite, toggleShortlist } =
        useDetailStudentActivity();

    return (
        <div className="mb-1">
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    toggleFavourite();
                }}
                className={`mb-2 flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] border px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors ${
                    optimisticFavourite
                        ? "border-[#c9a227] bg-[#fffbeb] text-[#8b6914] hover:border-[#942e2e] hover:bg-[#fdecea] hover:text-[#942e2e]"
                        : "border-[#e0deda] bg-white text-[#1a1a1a] hover:border-[#a0a0a0] hover:bg-[#f4f3f0]"
                }`}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
                </svg>
                {optimisticFavourite ? "Saved" : "Save university"}
            </button>
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    toggleShortlist();
                }}
                className={`mb-2 flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] border px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors ${
                    optimisticShortlist
                        ? "border-[#b7dcc6] bg-[#f0faf3] text-[#2D6A4F] hover:border-[#c0392ba6] hover:bg-[#fdecea] hover:text-[#942e2e]"
                        : "border-[#e0deda] bg-white text-[#1a1a1a] hover:border-[#a0a0a0] hover:bg-[#f4f3f0]"
                }`}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 2l2.4 7.4H22l-6 4.6L18.3 21 12 16.4 5.7 21l2.3-7L2 9.4h7.6z" />
                </svg>
                {optimisticShortlist ? "Shortlisted" : "Add to shortlist"}
            </button>
            {actionMessage ? (
                <p className="mb-2 text-[11px] leading-snug text-[#C0392B]" role="status">
                    {actionMessage}
                </p>
            ) : null}
        </div>
    );
}

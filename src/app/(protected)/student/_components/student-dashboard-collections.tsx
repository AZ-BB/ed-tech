"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  fetchDashboardSavedByTab,
  fetchDashboardShortlistedUniScholarship,
  type DashboardCollectionCard,
} from "../_lib/dashboard-collections";
import {
  savedTabLabels,
  shortlistTabLabels,
} from "../_data/student-dashboard-data";
import { createSupabaseBrowserClient } from "@/utils/supabase-browser";

const scrollRowClass =
  "flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-[var(--border)]";

const cardOuterClass =
  "min-w-[200px] max-w-[200px] shrink-0 cursor-pointer rounded-xl border border-[var(--border-light)] bg-[var(--sand)] p-3.5 transition-colors hover:border-[var(--border)] hover:bg-white";

const tabBtnClass =
  "cursor-pointer border-b-2 px-[18px] py-2.5 text-xs font-medium transition-colors";

function CollectionCardsRow({
  items,
  loading,
  emptyLabel,
}: {
  items: DashboardCollectionCard[];
  loading: boolean;
  emptyLabel: string;
}) {
  if (loading) {
    return (
      <p className="px-0.5 py-6 text-xs text-[var(--text-hint)]">Loading…</p>
    );
  }
  if (items.length === 0) {
    return (
      <p className="px-0.5 py-6 text-xs text-[var(--text-hint)]">
        {emptyLabel}
      </p>
    );
  }
  return (
    <div className={scrollRowClass}>
      {items.map((item) =>
        item.href ? (
          <Link
            key={item.key}
            href={item.href}
            scroll={false}
            className={`block text-inherit no-underline ${cardOuterClass}`}
          >
            <div className="mb-1.5 text-sm">{item.flag}</div>
            <div className="truncate text-[13px] font-semibold">
              {item.name}
            </div>
            <div className="text-[11px] text-[var(--text-light)]">
              {item.sub}
            </div>
          </Link>
        ) : (
          <div key={item.key} className={cardOuterClass}>
            <div className="mb-1.5 text-sm">{item.flag}</div>
            <div className="truncate text-[13px] font-semibold">
              {item.name}
            </div>
            <div className="text-[11px] text-[var(--text-light)]">
              {item.sub}
            </div>
          </div>
        ),
      )}
    </div>
  );
}

export function StudentDashboardCollections() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [savedTab, setSavedTab] = useState(0);
  const [shortlistTab, setShortlistTab] = useState(0);
  const [savedByTab, setSavedByTab] = useState<DashboardCollectionCard[][]>([
    [],
    [],
    [],
    [],
  ]);
  const [shortlistByTab, setShortlistByTab] = useState<
    [DashboardCollectionCard[], DashboardCollectionCard[]]
  >([[], []]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [loadingShortlist, setLoadingShortlist] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError(null);
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (cancelled) return;
      if (userErr || !userData.user) {
        setLoadingSaved(false);
        setLoadingShortlist(false);
        setLoadError("Sign in to see your saved items.");
        return;
      }
      setLoadingSaved(true);
      setLoadingShortlist(true);
      try {
        const [saved, shortlist] = await Promise.all([
          fetchDashboardSavedByTab(supabase),
          fetchDashboardShortlistedUniScholarship(supabase),
        ]);
        if (!cancelled) {
          setSavedByTab(saved);
          setShortlistByTab(shortlist);
        }
      } catch {
        if (!cancelled) {
          setLoadError("Could not load your lists. Try refreshing the page.");
        }
      } finally {
        if (!cancelled) {
          setLoadingSaved(false);
          setLoadingShortlist(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <>
      {loadError ? (
        <div className="mb-4 rounded-xl border border-[var(--border-light)] bg-[var(--sand)] px-4 py-3 text-xs text-[var(--text-mid)]">
          {loadError}
        </div>
      ) : null}
      <div className="mb-5 rounded-2xl border border-[var(--border-light)] bg-white px-[22px] py-5 max-[800px]:px-5">
        <div className="mb-3.5 flex items-center gap-2 text-sm font-semibold [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:shrink-0 [&>svg]:opacity-40">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden
          >
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
          </svg>
          Your saved items
        </div>
        <div className="mb-3.5 flex gap-0 border-b border-[var(--border-light)]">
          {savedTabLabels.map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => setSavedTab(idx)}
              className={`${tabBtnClass} ${
                savedTab === idx
                  ? "border-[var(--green)] font-semibold text-[var(--green-dark)]"
                  : "border-transparent text-[var(--text-light)] hover:text-[var(--text-mid)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <CollectionCardsRow
          items={savedByTab[savedTab] ?? []}
          loading={loadingSaved}
          emptyLabel="Nothing saved here yet — browse and tap save to add items."
        />
      </div>

      <div className="mb-5 rounded-2xl border border-[var(--border-light)] bg-white px-[22px] py-5 max-[800px]:px-5">
        <div className="mb-3.5 flex items-center gap-2 text-sm font-semibold [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:shrink-0 [&>svg]:opacity-40">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden
          >
            <path d="M8 6h13M8 12h13M8 18h13M4 6h.01M4 12h.01M4 18h.01" />
          </svg>
          Your shortlist
        </div>
        <p className="mb-3.5 px-0.5 text-[11px] leading-snug text-[var(--text-light)]">
          Universities and scholarships you marked as shortlisted appear here.
        </p>
        <div className="mb-3.5 flex gap-0 border-b border-[var(--border-light)]">
          {shortlistTabLabels.map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => setShortlistTab(idx)}
              className={`${tabBtnClass} ${
                shortlistTab === idx
                  ? "border-[var(--green)] font-semibold text-[var(--green-dark)]"
                  : "border-transparent text-[var(--text-light)] hover:text-[var(--text-mid)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <CollectionCardsRow
          items={shortlistByTab[shortlistTab] ?? []}
          loading={loadingShortlist}
          emptyLabel="Nothing shortlisted yet — use shortlist from university search or scholarships."
        />
      </div>
    </>
  );
}

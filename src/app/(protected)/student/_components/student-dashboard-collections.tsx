"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  fetchDashboardSavedByTab,
  fetchDashboardShortlistedUniScholarship,
  type DashboardCollectionCard,
} from "../_lib/dashboard-collections";
import { createSupabaseBrowserClient } from "@/utils/supabase-browser";
import { useLocale } from "@/lib/i18n/locale-context";

const scrollRowClass =
  "flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-[var(--border)]";

const cardOuterClass =
  "min-w-[200px] max-w-[200px] shrink-0 cursor-pointer rounded-xl border border-[var(--border-light)] bg-[var(--sand)] p-3.5 transition-colors hover:border-[var(--border)] hover:bg-white";

const tabRowClass =
  "mb-3.5 flex min-w-0 snap-x snap-mandatory gap-0 overflow-x-auto border-b border-[var(--border-light)] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-[var(--border)]";

const tabBtnClass =
  "shrink-0 snap-start cursor-pointer whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors sm:px-4 md:px-[18px]";

function CollectionCardsRow({
  items,
  loading,
  emptyLabel,
  loadingLabel,
}: {
  items: DashboardCollectionCard[];
  loading: boolean;
  emptyLabel: string;
  loadingLabel: string;
}) {
  if (loading) {
    return (
      <p className="px-0.5 py-6 text-xs text-[var(--text-hint)]">
        {loadingLabel}
      </p>
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
            <div className="bidi-ltr truncate text-[13px] font-semibold" dir="ltr">
              {item.name}
            </div>
            <div className="bidi-ltr text-[11px] text-[var(--text-light)]" dir="ltr">
              {item.sub}
            </div>
          </Link>
        ) : (
          <div key={item.key} className={cardOuterClass}>
            <div className="mb-1.5 text-sm">{item.flag}</div>
            <div className="bidi-ltr truncate text-[13px] font-semibold" dir="ltr">
              {item.name}
            </div>
            <div className="bidi-ltr text-[11px] text-[var(--text-light)]" dir="ltr">
              {item.sub}
            </div>
          </div>
        ),
      )}
    </div>
  );
}

export function StudentDashboardCollections() {
  const { dict } = useLocale();
  const t = dict.student.dashboard.collections;
  const loadingLabel = dict.student.common.loading;

  const savedTabLabels = useMemo(
    () => [
      t.savedTabs.universities,
      t.savedTabs.scholarships,
      t.savedTabs.advisors,
      t.savedTabs.ambassadors,
    ],
    [t],
  );

  const shortlistTabLabels = useMemo(
    () => [t.shortlistTabs.universities, t.shortlistTabs.scholarships],
    [t],
  );

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
        setLoadError(t.signInRequired);
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
          setLoadError(t.loadError);
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
  }, [supabase, t.loadError, t.signInRequired]);

  return (
    <>
      {loadError ? (
        <div className="mb-4 rounded-xl border border-[var(--border-light)] bg-[var(--sand)] px-4 py-3 text-xs text-[var(--text-mid)]">
          {loadError}
        </div>
      ) : null}
      <div className="mb-5 min-w-0 overflow-x-clip rounded-2xl border border-[var(--border-light)] bg-white px-[22px] py-5 max-[800px]:px-5">
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
          {t.yourSavedItems}
        </div>
        <div className={tabRowClass}>
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
          emptyLabel={t.savedEmpty}
          loadingLabel={loadingLabel}
        />
      </div>

      <div className="mb-5 min-w-0 overflow-x-clip rounded-2xl border border-[var(--border-light)] bg-white px-[22px] py-5 max-[800px]:px-5">
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
          {t.yourShortlist}
        </div>
        <p className="mb-3.5 px-0.5 text-[11px] leading-snug text-[var(--text-light)]">
          {t.shortlistSub}
        </p>
        <div className={tabRowClass}>
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
          emptyLabel={t.shortlistEmpty}
          loadingLabel={loadingLabel}
        />
      </div>
    </>
  );
}

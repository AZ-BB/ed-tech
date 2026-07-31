"use client";

import { saveEvent, unsaveEvent } from "@/actions/event-activities";
import { useLocale } from "@/lib/i18n/locale-context";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";

import type { EventDiscoveryPageData } from "../_lib/get-event-discovery-page";
import { EventCard } from "./event-card";
import { EventDetailView } from "./event-detail-view";
import { EventEmptyCatalog } from "./event-empty-catalog";
import { EventSelectorBar } from "./event-selector-bar";

function mergeSearchHref(
  pathname: string,
  current: URLSearchParams,
  patch: Record<string, string | undefined>,
): string {
  const next = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function EventDiscovery({ pageData }: { pageData: EventDiscoveryPageData }) {
  const { dict } = useLocale();
  const t = dict.student.events;
  const pathname = usePathname() ?? "/student/events";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [savedIds, setSavedIds] = useState<Set<string>>(
    () => new Set(pageData.savedEventIds),
  );
  const [, startTransition] = useTransition();

  const selectedEvent = pageData.selectedEvent;

  const openDetail = useCallback(
    (eventId: string) => {
      router.push(
        mergeSearchHref(pathname, searchParams, { detail: eventId }),
        { scroll: false },
      );
    },
    [pathname, router, searchParams],
  );

  const closeDetail = useCallback(() => {
    router.push(mergeSearchHref(pathname, searchParams, { detail: undefined }), {
      scroll: false,
    });
    window.scrollTo({ top: 0 });
  }, [pathname, router, searchParams]);

  const resetFilters = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  const toggleSave = useCallback(
    (discoveryId: string, currentlySaved: boolean) => {
      startTransition(async () => {
        const result = currentlySaved
          ? await unsaveEvent(discoveryId)
          : await saveEvent(discoveryId);
        if (!result.ok) return;

        setSavedIds((prev) => {
          const event = pageData.events.find(
            (item) => item.eventId === discoveryId || item.id === discoveryId,
          );
          if (!event) return prev;
          const next = new Set(prev);
          if (currentlySaved) next.delete(event.id);
          else next.add(event.id);
          return next;
        });
      });
    },
    [pageData.events],
  );

  const cardLabels = useMemo(
    () => ({
      viewDetails: t.viewDetails,
      liveOnline: t.liveOnline,
      universitiesAttending: (count: number) =>
        t.universitiesAttending.replace("{count}", String(count)),
      joiningOnline: t.joiningOnline,
      attendingInPerson: t.attendingInPerson,
      hostingEvent: t.hostingEvent,
      applicationFocused: t.applicationFocused,
      applicationFocusedSub: t.applicationFocusedSub,
      saveAria: t.saveAria,
    }),
    [t],
  );

  return (
    <>
      {selectedEvent ? (
        <EventDetailView
          event={selectedEvent}
          onBack={closeDetail}
          isSaved={savedIds.has(selectedEvent.id)}
          onToggleSave={() => {
            toggleSave(selectedEvent.eventId, savedIds.has(selectedEvent.id));
          }}
          labels={{
            backToEvents: t.backToEvents,
            overview: t.overview,
            whyAttend: t.whyAttend,
            whosAttending: t.whosAttending,
            prepare: t.prepare,
            howToPrepare: t.howToPrepare,
            goodFor: t.goodFor,
            register: t.register,
            addToCalendar: t.addToCalendar,
            saveEvent: t.saveEvent,
            saved: t.saved,
            yourActions: t.yourActions,
            quickInfo: t.quickInfo,
            time: t.time,
            format: t.format,
            focus: t.focus,
            universities: t.universities,
            status: t.status,
            formatOnline: t.formatOnline,
            formatInPerson: t.formatInPerson,
            pastEvent: t.pastEvent,
            universitiesExpected: (count, online) =>
              t.universitiesExpected
                .replace("{count}", String(count))
                .replace("{mode}", online ? t.modeOnline : t.modeInPerson),
            noBooths: t.noBooths,
            selectionLabel: t.selectionLabel,
            moreUniversities: (count) =>
              t.moreUniversities.replace("{count}", String(count)),
            advisorTitle: t.advisorTitle,
            advisorBody: t.advisorBody,
            bookAdvisor: t.bookAdvisor,
          }}
        />
      ) : (
        <div className="mx-auto w-full max-w-[1100px] px-5 pb-16 pt-6">
          <header className="mb-5">
            <h1 className="font-[family-name:var(--font-dm-serif)] text-[26px] text-[var(--text)]">
              {t.pageTitle}
            </h1>
            <p className="mt-1 text-[14px] leading-normal text-[var(--text-light)]">
              {t.pageSubtitle}
            </p>
          </header>

          <EventSelectorBar
            q={pageData.query.q}
            location={pageData.query.location}
            month={pageData.query.month}
            type={pageData.query.type}
            mode={pageData.query.mode}
            locations={pageData.filterOptions.locations}
            types={pageData.filterOptions.types}
            labels={{
              searchPlaceholder: t.searchPlaceholder,
              location: t.filterLocation,
              month: t.filterMonth,
              type: t.filterType,
              format: t.filterFormat,
              clearFilters: t.clearFilters,
            }}
          />

          <p className="mb-4 text-[13px] font-medium text-[var(--text-light)]">
            <strong className="font-semibold text-[var(--text)]">{pageData.events.length}</strong>{" "}
            {pageData.events.length === 1 ? t.resultsSingular : t.resultsPlural}
          </p>

          {pageData.events.length === 0 ? (
            <EventEmptyCatalog
              onReset={resetFilters}
              labels={{
                title: t.emptyTitle,
                description: t.emptyDescription,
                viewAll: t.viewAll,
              }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pageData.events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isSaved={savedIds.has(event.id)}
                  onOpen={() => openDetail(event.eventId)}
                  onToggleSave={() => toggleSave(event.eventId, savedIds.has(event.id))}
                  labels={cardLabels}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

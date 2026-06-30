"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import { useEffect, useState } from "react";

import type { StudentWebinarCard } from "../_lib/fetch-student-webinars";
import { fontSans, fontSerif } from "./webinar-constants";
import {
  WebinarFeaturedCard,
  WebinarGridCard,
  WebinarPageShell,
} from "./webinar-featured-card";
import { useWebinarRegistration } from "./webinar-registration-modal";
import { WebinarFaqSection, WebinarHero, WebinarTopicsSection } from "./webinar-sections";

type WebinarsClientProps = {
  initialWebinars: StudentWebinarCard[];
  mode?: "student" | "public";
};

export function WebinarsClient({ initialWebinars, mode = "student" }: WebinarsClientProps) {
  const { dict } = useLocale();
  const wt = dict.webinars;
  const [webinars, setWebinars] = useState(initialWebinars);
  const [openAgendaIds, setOpenAgendaIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setWebinars(initialWebinars);
  }, [initialWebinars]);

  const featured = webinars[0] ?? null;
  const rest = webinars.slice(1);

  const { openRegistration, registrationModal } = useWebinarRegistration({
    mode,
    onRegistered: (webinarId) => {
      setWebinars((prev) =>
        prev.map((w) =>
          w.id === webinarId
            ? {
                ...w,
                isRegistered: mode === "public" ? w.isRegistered : true,
                registeredCount: w.registeredCount + 1,
              }
            : w,
        ),
      );
    },
  });

  function toggleAgenda(id: number) {
    setOpenAgendaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <WebinarPageShell>
      <WebinarHero featuredWebinar={featured} onRegisterFeatured={openRegistration} />

      {featured ? (
        <WebinarFeaturedCard
          webinar={featured}
          mode={mode}
          agendaOpen={openAgendaIds.has(featured.id)}
          onToggleAgenda={() => toggleAgenda(featured.id)}
          onRegister={openRegistration}
          titleAsLink
        />
      ) : null}

      <section id="upcoming-webinars" className="mb-[60px]">
        <p
          className={`mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[1.5px] text-[var(--green)] before:h-[1.5px] before:w-6 before:bg-[var(--green)] ${fontSans}`}
        >
          {wt.calendar}
        </p>
        <h2 className={`mb-2 ${fontSerif} text-[32px] leading-[1.15] tracking-[-0.3px]`}>
          {wt.upcomingTitle}
        </h2>
        <p className="mb-7 max-w-[640px] text-[14.5px] leading-[1.55] text-[var(--text-light)]">
          {wt.upcomingSub}
        </p>

        {rest.length === 0 && !featured ? (
          <div className="rounded-[18px] border border-[var(--border-light)] bg-white px-6 py-14 text-center text-[14px] text-[var(--text-mid)]">
            {wt.empty}
          </div>
        ) : (
          <div className="grid gap-[18px] md:grid-cols-2">
            {rest.map((webinar) => (
              <WebinarGridCard
                key={webinar.id}
                webinar={webinar}
                mode={mode}
                agendaOpen={openAgendaIds.has(webinar.id)}
                onToggleAgenda={() => toggleAgenda(webinar.id)}
                onRegister={openRegistration}
              />
            ))}
          </div>
        )}
      </section>

      <WebinarTopicsSection />
      <WebinarFaqSection mode={mode} />
      {registrationModal}
    </WebinarPageShell>
  );
}

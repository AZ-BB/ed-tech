"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import { useEffect, useState } from "react";

import type { StudentWebinarCard } from "../_lib/fetch-student-webinars";
import { sectionDescClass, sectionEyebrowClass, sectionTitleClass } from "./webinar-constants";
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

      <section id="upcoming-webinars" className="mb-10 min-w-0 md:mb-[60px]">
        <p className={sectionEyebrowClass}>
          {wt.calendar}
        </p>
        <h2 className={sectionTitleClass}>
          {wt.upcomingTitle}
        </h2>
        <p className={sectionDescClass}>
          {wt.upcomingSub}
        </p>

        {rest.length === 0 && !featured ? (
          <div className="rounded-[18px] border border-[var(--border-light)] bg-white px-4 py-10 text-center text-[13px] text-[var(--text-mid)] sm:px-6 sm:py-14 sm:text-[14px]">
            {wt.empty}
          </div>
        ) : (
          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:gap-[18px]">
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

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { StudentWebinarCard } from "../_lib/fetch-student-webinars";
import { WebinarFeaturedCard, WebinarPageShell } from "./webinar-featured-card";
import { fontSans, webinarsListHref, type WebinarPageMode } from "./webinar-constants";
import { useWebinarRegistration } from "./webinar-registration-modal";
import { WebinarFaqSection, WebinarHero, WebinarTopicsSection } from "./webinar-sections";

type WebinarDetailClientProps = {
  initialWebinar: StudentWebinarCard;
  mode?: WebinarPageMode;
};

export function WebinarDetailClient({ initialWebinar, mode = "student" }: WebinarDetailClientProps) {
  const [webinar, setWebinar] = useState(initialWebinar);
  const [agendaOpen, setAgendaOpen] = useState(true);

  useEffect(() => {
    setWebinar(initialWebinar);
  }, [initialWebinar]);

  const { openRegistration, registrationModal } = useWebinarRegistration({
    mode,
    onRegistered: (webinarId) => {
      setWebinar((prev) =>
        prev.id === webinarId
          ? {
              ...prev,
              isRegistered: mode === "public" ? prev.isRegistered : true,
              registeredCount: prev.registeredCount + 1,
            }
          : prev,
      );
    },
  });

  return (
    <WebinarPageShell>
      <Link
        href={webinarsListHref(mode)}
        className={`mb-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-mid)] transition hover:text-[var(--green)] ${fontSans}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        All webinars
      </Link>

      <WebinarHero
        featuredWebinar={webinar}
        onRegisterFeatured={openRegistration}
        primaryCtaHref="#webinar-detail"
        primaryCtaLabel="View session details"
      />

      <div id="webinar-detail">
        <WebinarFeaturedCard
          webinar={webinar}
          mode={mode}
          agendaOpen={agendaOpen}
          onToggleAgenda={() => setAgendaOpen((open) => !open)}
          onRegister={openRegistration}
          sectionLabel="This session"
          sectionTitle="Session details"
          sectionDescription="Register early as seats are limited for this live session."
        />
      </div>

      <WebinarTopicsSection />
      <WebinarFaqSection mode={mode} />
      {registrationModal}
    </WebinarPageShell>
  );
}

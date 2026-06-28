"use client";

import { registerForWebinar } from "@/actions/student-webinars";
import { format, isValid, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { StudentWebinarCard } from "../_lib/fetch-student-webinars";
import { WebinarTags } from "./webinar-tag-badge";

const fontSans = "font-[family-name:var(--font-dm-sans)]";
const fontSerif = "font-[family-name:var(--font-dm-serif)]";

const AVATAR_GRADIENTS: Record<string, string> = {
  "av-1": "linear-gradient(135deg, #2d6a4f, #40916c)",
  "av-2": "linear-gradient(135deg, #1b4332, #2d6a4f)",
  "av-3": "linear-gradient(135deg, #52b788, #40916c)",
  "av-4": "linear-gradient(135deg, #7b3fe4, #5b2cb3)",
  "av-5": "linear-gradient(135deg, #3d5af1, #2742c5)",
  "av-6": "linear-gradient(135deg, #c99016, #a07212)",
  "av-7": "linear-gradient(135deg, #d63e70, #a52f56)",
  "av-8": "linear-gradient(135deg, #e07b30, #b86225)",
  "av-9": "linear-gradient(135deg, #3a3a3a, #1a1a1a)",
  "av-10": "linear-gradient(135deg, #0f766e, #0e5c57)",
};

const FAQS = [
  {
    q: "Are Univeera webinars free?",
    a: "Yes. Webinars are free for registered students and families unless otherwise stated.",
  },
  {
    q: "Who can attend?",
    a: "Students, families and school counselors are welcome. Most sessions are designed for students in Grades 11 and 12.",
  },
  {
    q: "How do I receive the webinar link?",
    a: "After you register, Univeera will email you the meeting link when the session starts, plus a reminder the day before.",
  },
  {
    q: "Are the sessions recorded?",
    a: "Some sessions are recorded and shared after the webinar, depending on the speaker and topic.",
  },
  {
    q: "Can I ask questions during the session?",
    a: "Yes. Most webinars include a live Q&A section where students and families can ask questions.",
  },
  {
    q: "How often are webinars hosted?",
    a: "Univeera hosts webinars every two weeks, with additional sessions added during key application periods.",
  },
] as const;

const TOPICS = [
  {
    title: "Study destinations",
    desc: "UK, US, Canada, Europe, Australia and GCC university options.",
  },
  {
    title: "Application guidance",
    desc: "UCAS, Common App, essays, recommendation letters, interviews and deadlines.",
  },
  {
    title: "Scholarships & funding",
    desc: "How to find scholarships, understand eligibility and submit stronger applications.",
  },
  {
    title: "Major & career exploration",
    desc: "Helping students connect their interests and strengths to future careers.",
  },
  {
    title: "Student & alumni stories",
    desc: "Real experiences from Middle Eastern students studying locally and abroad.",
  },
  {
    title: "Career & professional pathways",
    desc: "How to break into consulting, banking, and tech — plus internships and networks.",
  },
] as const;

function formatWebinarDate(iso: string): string {
  const parsed = parseISO(iso);
  if (!isValid(parsed)) return iso;
  return format(parsed, "EEEE, MMMM d, yyyy");
}

function formatWebinarTime(iso: string): string {
  const parsed = parseISO(iso);
  if (!isValid(parsed)) return "";
  return format(parsed, "h:mm a");
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

type WebinarsClientProps = {
  initialWebinars: StudentWebinarCard[];
};

export function WebinarsClient({ initialWebinars }: WebinarsClientProps) {
  const router = useRouter();
  const [webinars, setWebinars] = useState(initialWebinars);
  const [modalWebinar, setModalWebinar] = useState<StudentWebinarCard | null>(null);
  const [modalSuccess, setModalSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [openAgendaIds, setOpenAgendaIds] = useState<Set<number>>(new Set());
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  useEffect(() => {
    setWebinars(initialWebinars);
  }, [initialWebinars]);

  const featured = webinars[0] ?? null;
  const rest = webinars.slice(1);

  const closeModal = useCallback(() => {
    setModalWebinar(null);
    setModalSuccess(false);
    setModalError(null);
    setIsSubmitting(false);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeModal();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeModal]);

  function toggleAgenda(id: number) {
    setOpenAgendaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleConfirmRegistration() {
    if (!modalWebinar) return;
    setIsSubmitting(true);
    setModalError(null);

    const result = await registerForWebinar(modalWebinar.id);
    if (!result.ok) {
      setModalError(result.error);
      setIsSubmitting(false);
      return;
    }

    setWebinars((prev) =>
      prev.map((w) =>
        w.id === modalWebinar.id
          ? {
              ...w,
              isRegistered: true,
              registeredCount: w.registeredCount + 1,
            }
          : w,
      ),
    );
    setModalSuccess(true);
    setIsSubmitting(false);
    router.refresh();
  }

  function renderProgress(registered: number, capacity: number) {
    const pct = capacity > 0 ? Math.round((registered / capacity) * 100) : 0;
    return (
      <>
        <div className="mb-2 flex items-baseline justify-between text-[11.5px]">
          <span className="font-semibold text-[var(--text)]">
            {registered} / {capacity} registered
          </span>
          <span className="font-medium text-[var(--text-hint)]">
            {Math.max(capacity - registered, 0)} seats left
          </span>
        </div>
        <div className="h-[5px] overflow-hidden rounded-[3px] bg-[var(--border-light)]">
          <div
            className="h-full rounded-[3px] bg-[var(--green)] transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </>
    );
  }

  function renderCta(webinar: StudentWebinarCard, className: string) {
    if (webinar.isRegistered) {
      return (
        <button type="button" disabled className={`${className} opacity-70`}>
          Registered
        </button>
      );
    }
    if (webinar.isFull) {
      return (
        <button type="button" disabled className={`${className} opacity-70`}>
          Full
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => {
          setModalWebinar(webinar);
          setModalSuccess(false);
          setModalError(null);
        }}
        className={className}
      >
        Register now
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </button>
    );
  }

  return (
    <div className={`mx-auto max-w-[1180px] px-5 pb-20 pt-6 ${fontSans} antialiased text-[var(--text)]`}>
      <section className="relative mb-12 overflow-hidden rounded-[24px] border border-[var(--border-light)] bg-gradient-to-br from-[#fffefb] to-[var(--green-pale)] px-11 py-[60px] max-[900px]:px-6 max-[900px]:py-10">
        <div className={`relative z-[1] mb-[18px] inline-flex items-center gap-1.5 rounded-full border border-[rgba(45,106,79,0.15)] bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[1.2px] text-[var(--green)] ${fontSans}`}>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--green)]" />
          Live Webinars & Expert Sessions
        </div>
        <h1 className={`relative z-[1] mb-3.5 max-w-[760px] ${fontSerif} text-[48px] leading-[1.05] tracking-[-0.5px] text-[var(--text)] max-[900px]:text-[34px] max-[600px]:text-[26px]`}>
          Join live webinars led by <em className="italic text-[var(--green)]">advisors, alumni and professionals</em>.
        </h1>
        <p className="relative z-[1] mb-8 max-w-[600px] text-[16px] leading-[1.6] text-[var(--text-mid)]">
          Every two weeks, Univeera hosts live sessions to help students across the Middle East understand university applications, study destinations, scholarships, majors, career pathways and student life.
        </p>
        <div className="relative z-[1] mb-8 flex flex-wrap gap-2.5">
          <a
            href="#upcoming-webinars"
            className={`inline-flex items-center gap-2 rounded-full bg-[var(--green)] px-[22px] py-3.5 text-[14px] font-semibold text-white shadow-[0_4px_14px_rgba(45,106,79,0.2)] transition hover:bg-[var(--green-dark)] ${fontSans}`}
          >
            View upcoming webinars
          </a>
          {featured ? (
            <button
              type="button"
              onClick={() => {
                setModalWebinar(featured);
                setModalSuccess(false);
                setModalError(null);
              }}
              className={`inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-[22px] py-3.5 text-[14px] font-semibold text-[var(--text)] transition hover:border-[var(--green)] hover:text-[var(--green)] ${fontSans}`}
            >
              Register for next session
            </button>
          ) : null}
        </div>
        <div className="relative z-[1] flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[var(--text)]">
            Bi-weekly live sessions
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[var(--text)]">
            Expert-led guidance
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[var(--text)]">
            Built for Middle East students
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[var(--text)]">
            Free for registered students
          </div>
        </div>
        <p className="relative z-[1] mt-3.5 text-[12px] italic text-[var(--text-light)]">
          New sessions added every month.
        </p>
      </section>

      {featured ? (
        <section className="mb-[60px]">
          <p className={`mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[1.5px] text-[var(--green)] before:h-[1.5px] before:w-6 before:bg-[var(--green)] ${fontSans}`}>
            Next session
          </p>
          <h2 className={`mb-2 ${fontSerif} text-[32px] leading-[1.15] tracking-[-0.3px]`}>
            Featured upcoming webinar
          </h2>
          <p className="mb-7 max-w-[640px] text-[14.5px] leading-[1.55] text-[var(--text-light)]">
            Our next live session — register early as seats are limited.
          </p>

          <div className="grid overflow-hidden rounded-[24px] border border-[var(--border-light)] bg-white lg:grid-cols-[1.4fr_1fr]">
            <div className="flex flex-col gap-[18px] p-9 max-[600px]:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <span className={`inline-flex items-center gap-2 rounded-full bg-[var(--amber-bg)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1px] text-[var(--amber)] ${fontSans}`}>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--amber)]" />
                  Next session
                </span>
                <WebinarTags tags={featured.tags} />
              </div>
              <h3 className={`${fontSerif} text-[30px] leading-[1.15] tracking-[-0.3px]`}>{featured.title}</h3>
              <div className="flex flex-wrap gap-6 border-y border-[var(--border-light)] py-3.5 text-[13px] font-medium leading-none text-[var(--text-mid)]">
                <span>{formatWebinarDate(featured.scheduledAt)}</span>
                <span>
                  {formatWebinarTime(featured.scheduledAt)} {featured.timezoneLabel}
                </span>
                <span>{featured.format}</span>
              </div>
              <p className="text-[14px] leading-[1.6] text-[var(--text-mid)]">{featured.description}</p>
              <div className="flex items-center gap-3.5 rounded-[14px] bg-[var(--sand)] p-3.5">
                <div
                  className={`flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full ${fontSerif} text-[20px] tracking-[-0.5px] text-white`}
                  style={{ background: AVATAR_GRADIENTS[featured.avatarColorClass] }}
                >
                  {featured.speakerInitials}
                </div>
                <div>
                  <p className="text-[14.5px] font-bold leading-[1.2]">{featured.speakerName}</p>
                  <p className="mt-0.5 text-[12.5px] leading-[1.3] text-[var(--text-light)]">{featured.speakerTitle}</p>
                  {featured.speakerBio ? (
                    <p className="mt-1.5 text-[12.5px] leading-[1.5] text-[var(--text-mid)]">{featured.speakerBio}</p>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-6 bg-gradient-to-br from-[var(--green-pale)] to-[var(--green-bg)] p-9 max-[600px]:p-6">
              <div className="rounded-[14px] bg-white p-[18px]">
                <p className={`mb-2.5 text-[11px] font-bold uppercase tracking-[1px] text-[var(--text-hint)] ${fontSans}`}>
                  Registration
                </p>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className={`${fontSerif} text-[28px] leading-none text-[var(--green)]`}>
                    {featured.registeredCount}
                  </span>
                  <span className="text-[13px] font-medium text-[var(--text-light)]">
                    of {featured.maxStudents} seats
                  </span>
                </div>
                <div className="mb-2 h-2 overflow-hidden rounded bg-[var(--border-light)]">
                  <div
                    className="h-full rounded bg-gradient-to-r from-[var(--green-light)] to-[var(--green)]"
                    style={{
                      width: `${featured.maxStudents > 0 ? Math.round((featured.registeredCount / featured.maxStudents) * 100) : 0}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-[11.5px] text-[var(--text-light)]">
                  {Math.max(featured.maxStudents - featured.registeredCount, 0)} seats remaining
                </p>
              </div>
              {renderCta(
                featured,
                `inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--green)] px-6 py-4 text-[14px] font-bold text-white shadow-[0_4px_14px_rgba(45,106,79,0.25)] transition hover:bg-[var(--green-dark)] ${fontSans}`,
              )}
              <button
                type="button"
                onClick={() => toggleAgenda(featured.id)}
                className={`flex w-full items-center justify-between rounded-[14px] border border-[rgba(45,106,79,0.15)] bg-white px-[18px] py-3.5 text-[13px] font-semibold text-[var(--text)] ${fontSans}`}
              >
                What will be covered
                <ChevronIcon open={openAgendaIds.has(featured.id)} />
              </button>
              {openAgendaIds.has(featured.id) ? (
                <ul className="rounded-[14px] border border-[var(--border-light)] bg-white px-5 py-[18px]">
                  {featured.agenda.map((item) => (
                    <li key={item} className="relative py-1 pl-[18px] text-[12.5px] leading-[1.5] text-[var(--text-mid)] before:absolute before:left-0 before:top-[7px] before:h-[5px] before:w-[5px] before:rounded-full before:bg-[var(--green-light)]">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section id="upcoming-webinars" className="mb-[60px]">
        <p className={`mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[1.5px] text-[var(--green)] before:h-[1.5px] before:w-6 before:bg-[var(--green)] ${fontSans}`}>
          Calendar
        </p>
        <h2 className={`mb-2 ${fontSerif} text-[32px] leading-[1.15] tracking-[-0.3px]`}>Upcoming webinars</h2>
        <p className="mb-7 max-w-[640px] text-[14.5px] leading-[1.55] text-[var(--text-light)]">
          Explore our upcoming live sessions designed to help students make better decisions about university, majors and careers.
        </p>

        {rest.length === 0 && !featured ? (
          <div className="rounded-[18px] border border-[var(--border-light)] bg-white px-6 py-14 text-center text-[14px] text-[var(--text-mid)]">
            No upcoming webinars right now. Check back soon.
          </div>
        ) : (
          <div className="grid gap-[18px] md:grid-cols-2">
            {rest.map((webinar) => (
              <article
                key={webinar.id}
                className="flex flex-col gap-3.5 rounded-[18px] border border-[var(--border-light)] bg-white p-6 transition hover:-translate-y-0.5 hover:border-[var(--green-light)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)]"
              >
                <WebinarTags tags={webinar.tags} />
                <h3 className={`${fontSerif} text-[20px] leading-[1.2] tracking-[-0.2px]`}>{webinar.title}</h3>
                <div className="flex flex-wrap gap-3.5 text-[12.5px] text-[var(--text-light)]">
                  <span>{formatWebinarDate(webinar.scheduledAt)}</span>
                  <span>
                    {formatWebinarTime(webinar.scheduledAt)} {webinar.timezoneLabel}
                  </span>
                </div>
                <p className="text-[13.5px] leading-[1.55] text-[var(--text-mid)]">{webinar.description}</p>
                <div className="flex items-center gap-2.5 rounded-[11px] bg-[var(--sand)] p-3">
                  <div
                    className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full ${fontSerif} text-[15px] text-white`}
                    style={{ background: AVATAR_GRADIENTS[webinar.avatarColorClass] }}
                  >
                    {webinar.speakerInitials}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold leading-[1.2]">{webinar.speakerName}</p>
                    <p className="mt-0.5 text-[11.5px] leading-[1.2] text-[var(--text-light)]">{webinar.speakerTitle}</p>
                  </div>
                </div>
                <div>{renderProgress(webinar.registeredCount, webinar.maxStudents)}</div>
                <button
                  type="button"
                  onClick={() => toggleAgenda(webinar.id)}
                  className={`flex w-full items-center justify-between border-t border-[var(--border-light)] pt-3 text-[12.5px] font-semibold text-[var(--text-mid)] transition hover:text-[var(--green)] ${fontSans}`}
                >
                  What will be covered
                  <ChevronIcon open={openAgendaIds.has(webinar.id)} />
                </button>
                {openAgendaIds.has(webinar.id) ? (
                  <ul>
                    {webinar.agenda.map((item) => (
                      <li key={item} className="relative py-1 pl-4 text-[12px] leading-[1.5] text-[var(--text-mid)] before:absolute before:left-0 before:top-[6px] before:h-1 before:w-1 before:rounded-full before:bg-[var(--green-light)]">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {renderCta(
                  webinar,
                  `mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[var(--green)] px-[18px] py-[11px] text-[13px] font-semibold text-white transition hover:bg-[var(--green-dark)] ${fontSans}`,
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mb-[60px]">
        <p className={`mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[1.5px] text-[var(--green)] before:h-[1.5px] before:w-6 before:bg-[var(--green)] ${fontSans}`}>
          What we cover
        </p>
        <h2 className={`mb-2 ${fontSerif} text-[32px] leading-[1.15] tracking-[-0.3px]`}>Topics we cover</h2>
        <p className="mb-7 max-w-[640px] text-[14.5px] leading-[1.55] text-[var(--text-light)]">
          Our webinars are designed to support students at every stage of the university journey.
        </p>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((topic) => (
            <div key={topic.title} className="rounded-[18px] border border-[var(--border-light)] bg-white p-6">
              <p className="mb-2 text-[15px] font-bold leading-[1.25]">{topic.title}</p>
              <p className="text-[12.5px] leading-[1.55] text-[var(--text-light)]">{topic.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-[60px]">
        <p className={`mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[1.5px] text-[var(--green)] before:h-[1.5px] before:w-6 before:bg-[var(--green)] ${fontSans}`}>
          Questions
        </p>
        <h2 className={`mb-2 ${fontSerif} text-[32px] leading-[1.15] tracking-[-0.3px]`}>Frequently asked</h2>
        <p className="mb-7 max-w-[640px] text-[14.5px] leading-[1.55] text-[var(--text-light)]">
          Quick answers to the most common questions about our webinars.
        </p>
        <div className="flex flex-col gap-2">
          {FAQS.map((faq, index) => (
            <div
              key={faq.q}
              className={`overflow-hidden rounded-[14px] border bg-white ${openFaqIndex === index ? "border-[var(--green-light)]" : "border-[var(--border-light)]"}`}
            >
              <button
                type="button"
                onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                className={`flex w-full items-center justify-between gap-3.5 px-[22px] py-[18px] text-left text-[14px] font-semibold text-[var(--text)] ${fontSans}`}
              >
                {faq.q}
                <ChevronIcon open={openFaqIndex === index} />
              </button>
              {openFaqIndex === index ? (
                <p className="px-[22px] pb-[18px] text-[13.5px] leading-[1.6] text-[var(--text-mid)]">{faq.a}</p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {modalWebinar ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(26,26,26,0.55)] p-5 backdrop-blur-[4px]"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal
            className={`relative w-full max-w-[480px] rounded-[20px] bg-white p-8 ${fontSans}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)]"
              aria-label="Close"
            >
              ✕
            </button>

            {modalSuccess ? (
              <div className="py-5 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--green-pale)] text-[var(--green)]">
                  ✓
                </div>
                <h3 className={`mb-2.5 ${fontSerif} text-[22px] leading-[1.2]`}>You&apos;re registered!</h3>
                <p className="mb-5 text-[13.5px] leading-[1.6] text-[var(--text-mid)]">
                  We&apos;ll send you a reminder the day before the session, and the meeting link when it starts.
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  className={`inline-flex w-full items-center justify-center rounded-full bg-[var(--green)] px-5 py-3.5 text-[14px] font-bold text-white ${fontSans}`}
                >
                  Got it
                </button>
              </div>
            ) : (
              <>
                <p className={`mb-2 text-[11px] font-bold uppercase tracking-[1.2px] text-[var(--green)] ${fontSans}`}>
                  Register for webinar
                </p>
                <h3 className={`mb-3.5 ${fontSerif} text-[22px] leading-[1.2]`}>{modalWebinar.title}</h3>
                <div className="mb-[18px] flex flex-col gap-1.5 rounded-[11px] bg-[var(--sand)] p-3.5 text-[12.5px] leading-normal text-[var(--text-mid)]">
                  <span>{formatWebinarDate(modalWebinar.scheduledAt)}</span>
                  <span>
                    {formatWebinarTime(modalWebinar.scheduledAt)} {modalWebinar.timezoneLabel}
                  </span>
                  <span>{modalWebinar.speakerName}</span>
                </div>
                <p className="mb-[18px] text-[13px] leading-[1.5] text-[var(--text-mid)]">
                  Confirm your spot for this live session. No extra details needed — you&apos;re registering as your logged-in student account.
                </p>
                {modalError ? (
                  <p className="mb-4 rounded-[8px] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">{modalError}</p>
                ) : null}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleConfirmRegistration()}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--green)] px-5 py-3.5 text-[14px] font-bold text-white disabled:opacity-60 ${fontSans}`}
                >
                  {isSubmitting ? "Registering…" : "Confirm registration"}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

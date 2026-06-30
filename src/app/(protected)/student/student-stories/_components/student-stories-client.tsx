"use client";

import { buildYouTubeEmbedUrl } from "@/lib/youtube";
import { useLocale } from "@/lib/i18n/locale-context";
import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowForwardIcon } from "../../_components/directional-icons";

import type { StudentStoryCard, StudentStoryTopic } from "../_lib/fetch-student-stories";

const fontSans = "font-[family-name:var(--font-dm-sans)]";
const fontSerif = "font-[family-name:var(--font-dm-serif)]";

const ALL_TOPICS_VALUE = "All";

function highlightLeadTitle(title: string): ReactNode {
  const words = title.split(" ");
  if (words.length <= 4) return title;
  const tail = words.slice(-3).join(" ");
  const head = words.slice(0, -3).join(" ");
  return (
    <>
      {head} <em className="italic text-[#2D6A4F]">{tail}</em>
    </>
  );
}

function languageLabel(
  language: StudentStoryCard["language"],
  t: { langEn: string; langAr: string; langMixed: string },
): string | null {
  if (!language) return null;
  if (language === "en") return t.langEn;
  if (language === "ar") return t.langAr;
  return t.langMixed;
}

function PlayIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
    </svg>
  );
}

function StoryAvatar({
  story,
  className,
  textClassName,
}: {
  story: StudentStoryCard;
  className: string;
  textClassName: string;
}) {
  if (story.ambassadorAvatarUrl) {
    return (
      <img
        src={story.ambassadorAvatarUrl}
        alt=""
        className={`${className} object-cover`}
      />
    );
  }

  return (
    <div className={`${className} flex items-center justify-center bg-[#52B788] font-bold text-white`}>
      <span className={textClassName}>{story.ambassadorInitials}</span>
    </div>
  );
}

type StudentStoriesClientProps = {
  topics: StudentStoryTopic[];
  stories: StudentStoryCard[];
};

export function StudentStoriesClient({ topics, stories }: StudentStoriesClientProps) {
  const { dict } = useLocale();
  const t = dict.student.stories;
  const [activeFilter, setActiveFilter] = useState(ALL_TOPICS_VALUE);
  const [selectedStory, setSelectedStory] = useState<StudentStoryCard | null>(null);

  const closeModal = useCallback(() => setSelectedStory(null), []);

  useEffect(() => {
    if (!selectedStory) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeModal();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedStory, closeModal]);

  const filteredStories = useMemo(() => {
    if (activeFilter === ALL_TOPICS_VALUE) return stories;
    return stories.filter((story) => story.topicName === activeFilter);
  }, [activeFilter, stories]);

  const globalLead = useMemo(
    () => stories.find((story) => story.isLead) ?? null,
    [stories],
  );

  const leadStory = useMemo(() => {
    if (activeFilter === ALL_TOPICS_VALUE) {
      return globalLead ?? filteredStories[0] ?? null;
    }
    return filteredStories[0] ?? null;
  }, [activeFilter, globalLead, filteredStories]);

  const gridStories = useMemo(() => {
    if (!leadStory) return filteredStories;
    return filteredStories.filter((story) => story.id !== leadStory.id);
  }, [filteredStories, leadStory]);

  return (
    <div className={`${fontSans} mx-auto max-w-[1040px] px-5 pb-[60px] pt-6 text-[#1a1a1a]`}>
      <div className="mb-5 flex items-center justify-between rounded-[12px] border border-[#ece9e4] bg-white px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#E8F5EE]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2D6A4F"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
          </div>
          <span className="text-[16px] font-semibold">Student Stories</span>
        </div>
        <Link
          href="/student/advisor-sessions"
          className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#ece9e4] bg-white transition-colors hover:bg-[#f4f3f0]"
          title="Talk to an advisor"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7a7a7a"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </Link>
      </div>

      <header className="mb-[22px]">
        <h1 className={`${fontSerif} mb-1.5 text-[28px] leading-[1.15] text-[#1a1a1a]`}>
          Real advice from students who made it
        </h1>
        <p className="max-w-[600px] text-[14px] leading-[1.55] text-[#6a6a6a]">
          Short, honest stories from past students — on applications, essays, scholarships,
          moving abroad, and everything they wish they&apos;d known.
        </p>
      </header>

      <nav className="mb-[26px] flex items-center gap-3">
        <span className="text-[13px] font-semibold text-[#4a4a4a]">Browse by topic</span>
        <div className="relative inline-flex items-center">
          <svg
            className="pointer-events-none absolute left-3.5 text-[#2D6A4F]"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <select
            value={activeFilter}
            onChange={(event) => {
              setActiveFilter(event.target.value);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="cursor-pointer appearance-none rounded-[50px] border-[1.5px] border-[#e0deda] bg-white py-2.5 pl-[38px] pr-10 text-[13.5px] font-semibold text-[#1a1a1a] outline-none transition-all hover:border-[#40916C] focus:border-[#2D6A4F] focus:shadow-[0_0_0_4px_rgba(45,106,79,0.08)]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='11' height='7' viewBox='0 0 11 7' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4.5 4.5L10 1' stroke='%232D6A4F' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 15px center",
            }}
          >
            <option value={ALL_TOPICS_VALUE}>All topics</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.name}>
                {topic.name}
              </option>
            ))}
          </select>
        </div>
      </nav>

      {leadStory ? (
        <section className="mb-[30px] rounded-[20px] border border-[#ece9e4] bg-white px-9 py-[34px] max-[900px]:px-6">
          <div className="mb-[22px] flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[1.4px] text-[#2D6A4F]">
            <span className="h-0.5 w-[26px] bg-[#2D6A4F]" />
            {activeFilter === ALL_TOPICS_VALUE && globalLead ? "This week's lead" : "Featured"}
          </div>
          <div className="grid grid-cols-1 items-center gap-[30px] min-[901px]:grid-cols-[1.05fr_0.95fr] min-[901px]:gap-12">
            <div className="min-[901px]:order-1">
              <div className="mb-[7px] text-[11px] font-bold uppercase tracking-[0.6px] text-[#2D6A4F]">
                {leadStory.topicName}
              </div>
              <h2 className={`${fontSerif} mb-5 text-[34px] leading-[1.08] tracking-[-0.5px] text-[#1a1a1a] min-[901px]:text-[46px]`}>
                {highlightLeadTitle(leadStory.title)}
              </h2>
              <p className="mb-[26px] max-w-[520px] text-[17px] leading-[1.7] text-[#4a4a4a]">
                {leadStory.description}
              </p>
              <div className="flex items-center gap-3">
                <StoryAvatar
                  story={leadStory}
                  className="h-[46px] w-[46px] rounded-full"
                  textClassName="text-[15px]"
                />
                <div>
                  <div className="text-[14px] font-bold">
                    {leadStory.ambassadorFirstName} {leadStory.ambassadorLastName}
                  </div>
                  <div className="text-[12.5px] text-[#6a6a6a]">{leadStory.bylineMeta}</div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedStory(leadStory)}
              className="group relative aspect-[4/5] w-full cursor-pointer overflow-hidden rounded-2xl shadow-[0_18px_50px_rgba(27,67,50,0.16)] min-[901px]:aspect-[4/5] max-[900px]:order-first max-[900px]:aspect-[16/10]"
            >
              <div
                className="absolute inset-0 transition-transform duration-400 group-hover:scale-[1.02]"
                style={{ background: leadStory.gradientCss }}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgba(27,67,50,0.1)] to-[rgba(27,67,50,0.45)]" />
              <span className="absolute left-4 top-4 z-[2] rounded-[50px] bg-white/92 px-3 py-1.5 text-[10.5px] font-bold text-[#1B4332] backdrop-blur-sm">
                Featured
              </span>
              {leadStory.durationLabel ? (
                <span className="absolute bottom-4 right-4 z-[2] rounded-[50px] bg-black/45 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm">
                  {leadStory.durationLabel}
                </span>
              ) : null}
              <span className="absolute left-1/2 top-1/2 z-[2] flex h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/92 text-[#1B4332] transition-transform group-hover:scale-105">
                <PlayIcon size={26} />
              </span>
            </button>
          </div>
        </section>
      ) : null}

      <section className="pb-5">
        <div className="mb-5 flex items-baseline justify-between px-0 py-1">
          <h2 className={`${fontSerif} text-[25px] text-[#1a1a1a]`}>
            {activeFilter === ALL_TOPICS_VALUE ? "More student stories" : activeFilter}
          </h2>
          <span className="text-[13px] text-[#6a6a6a]">
            {gridStories.length} {gridStories.length === 1 ? "story" : "stories"}
          </span>
        </div>

        {gridStories.length === 0 ? (
          <div className="py-[30px] text-center text-[#6a6a6a]">
            No stories in this section yet — check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-7 gap-y-[30px] min-[601px]:grid-cols-2 min-[901px]:grid-cols-3">
            {gridStories.map((story) => {
              const lang = languageLabel(story.language, t);
              return (
                <article
                  key={story.id}
                  className="group flex cursor-pointer flex-col"
                  onClick={() => setSelectedStory(story)}
                >
                  <div className="relative mb-4 aspect-[3/2] overflow-hidden rounded-[13px]">
                    <div
                      className="absolute inset-0 transition-transform duration-400 group-hover:scale-105"
                      style={{ background: story.gradientCss }}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgba(27,67,50,0.05)] to-[rgba(27,67,50,0.32)]" />
                    <span className="absolute left-3 top-3 z-[2] rounded-[50px] bg-white/94 px-[11px] py-1.5 text-[10px] font-bold text-[#1B4332]">
                      {story.topicName}
                    </span>
                    {lang ? (
                      <span className="absolute right-3 top-3 z-[2] rounded-[50px] bg-black/40 px-[9px] py-1 text-[10px] font-bold text-white">
                        {lang}
                      </span>
                    ) : null}
                    {story.durationLabel ? (
                      <span className="absolute bottom-3 right-3 z-[2] rounded-[50px] bg-black/45 px-2.5 py-1 text-[10.5px] font-bold text-white">
                        {story.durationLabel}
                      </span>
                    ) : null}
                    <span className="absolute left-1/2 top-1/2 z-[2] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#1B4332] opacity-0 transition-opacity group-hover:opacity-100">
                      <PlayIcon />
                    </span>
                  </div>
                  <div className="mb-[7px] text-[11px] font-bold uppercase tracking-[0.6px] text-[#2D6A4F]">
                    {story.topicName}
                  </div>
                  <h3
                    className={`${fontSerif} mb-2.5 text-[21px] leading-[1.22] text-[#1a1a1a] transition-colors group-hover:text-[#2D6A4F]`}
                  >
                    {story.title}
                  </h3>
                  <p className="mb-3.5 flex-1 text-[13.5px] leading-[1.6] text-[#6a6a6a]">
                    {story.description}
                  </p>
                  <div className="flex items-center gap-2 border-t border-[#ece9e4] pt-3">
                    <StoryAvatar
                      story={story}
                      className="h-[30px] w-[30px] shrink-0 rounded-full"
                      textClassName="text-[11px]"
                    />
                    <div>
                      <div className="text-[12.5px] font-bold">
                        {story.ambassadorFirstName} {story.ambassadorLastName}
                      </div>
                      <div className="text-[11px] text-[#6a6a6a]">{story.bylineMeta}</div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="relative my-[46px] overflow-hidden rounded-[20px] bg-[#1B4332] px-[26px] py-9 min-[601px]:px-12 min-[601px]:py-[52px]">
        <div className="pointer-events-none absolute -right-20 -top-[120px] h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,rgba(82,183,136,0.25),transparent_70%)]" />
        <div className="relative z-[1] flex flex-wrap items-center justify-between gap-10">
          <div>
            <h2 className={`${fontSerif} mb-2.5 text-[24px] leading-[1.2] text-white min-[601px]:text-[30px]`}>
              Your story could be next
            </h2>
            <p className="max-w-[440px] text-[15px] leading-[1.6] text-white/78">
              Get the same guidance these students had. Book a free session with a real advisor
              and start building your applications.
            </p>
          </div>
          <Link
            href="/student/advisor-sessions"
            className="inline-flex shrink-0 items-center gap-2 rounded-[50px] bg-white px-8 py-[15px] text-[15px] font-bold text-[#1B4332] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
          >
            {t.talkToAdvisor}
            <ArrowForwardIcon size={16} />
          </Link>
        </div>
      </div>

      {selectedStory ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(20,29,24,0.7)] p-6 backdrop-blur-[6px]"
          onClick={closeModal}
        >
          <div
            className="relative flex max-h-[88vh] w-full max-w-[900px] overflow-hidden rounded-[20px] bg-white max-[900px]:max-h-[90vh] max-[900px]:flex-col max-[900px]:overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative w-[360px] shrink-0 bg-[#1B4332] max-[900px]:aspect-[16/10] max-[900px]:w-full">
              <iframe
                title={selectedStory.title}
                src={buildYouTubeEmbedUrl(selectedStory.youtubeVideoId)}
                className="absolute inset-0 h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
              <button
                type="button"
                onClick={closeModal}
                className="absolute right-3.5 top-3.5 z-[3] flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/18 text-white transition-colors hover:bg-white/34"
                aria-label="Close"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto px-[38px] pb-[30px] pt-[38px]">
              <div className="mb-[13px] text-[11px] font-bold uppercase tracking-[0.6px] text-[#2D6A4F]">
                {selectedStory.topicName}
              </div>
              <h3 className={`${fontSerif} mb-4 text-[27px] leading-[1.2] text-[#1a1a1a]`}>
                {selectedStory.title}
              </h3>
              <p className="mb-6 text-[14.5px] leading-[1.7] text-[#4a4a4a]">
                {selectedStory.description}
              </p>
              <div className="mb-5 flex items-center gap-3 border-y border-[#ece9e4] py-4">
                <StoryAvatar
                  story={selectedStory}
                  className="h-11 w-11 rounded-full bg-[#2D6A4F]"
                  textClassName="text-[14px]"
                />
                <div>
                  <div className="text-[14px] font-bold">
                    {selectedStory.ambassadorFirstName} {selectedStory.ambassadorLastName}
                  </div>
                  <div className="text-[12.5px] text-[#6a6a6a]">{selectedStory.bylineMeta}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

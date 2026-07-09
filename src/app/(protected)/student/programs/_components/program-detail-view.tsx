"use client";

import Link from "next/link";
import clsx from "clsx";
import { useMemo, useState, type ReactNode } from "react";

import { useLocale } from "@/lib/i18n/locale-context";
import type { ProgramCareerPath } from "@/lib/programs-discovery-types";
import { initialsFromName, skillLevelToPercent } from "../_lib/program-discovery-metrics";
import {
  badgeClassForMetric,
  groupSalaryRegionsBySubfield,
  parseSalaryAmount,
} from "../_lib/program-salary-utils";
import type { DiscoveryProgram } from "../_lib/program-row-to-program";
import type { ProgramUniversityOffering } from "../_lib/get-program-university-offerings";
import type { RelatedProgramSummary } from "../_lib/get-program-explorer-page";
import { ProgramUniversitiesSection } from "./program-universities-section";
import detailStyles from "./program-detail.module.css";
import { ProgramDetailStickyCta } from "./program-detail-sticky-cta";
import { ProgramFitCheck } from "./program-fit-check";
import { ProgramSaveButton } from "./program-save-button";

const DAY_PERIOD_KEYS = ["dayMorning", "dayAfternoon", "dayEvening"] as const;

function formatCategoryLabel(category: string): string {
  const trimmed = category.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function formatCareerSalary(path: ProgramCareerPath): string {
  if (path.salary_entry && path.salary_senior) {
    return `${path.salary_entry}–${path.salary_senior}`;
  }
  return path.salary_mid || path.salary_entry || path.salary_senior || "";
}

function salaryBarPct(value: string | undefined, maxSenior: number): number {
  const amount = parseSalaryAmount(value);
  if (!amount || !maxSenior) return 15;
  return Math.max(15, Math.min(95, (amount / maxSenior) * 95));
}

function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className={detailStyles.mvpNote}>
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      <div>{children}</div>
    </div>
  );
}

const DAY_ICON_CLASSES = [
  detailStyles.dayIconMorning,
  detailStyles.dayIconAfternoon,
  detailStyles.dayIconEvening,
];

type ProgramDetailViewProps = {
  program: DiscoveryProgram;
  universityOfferings?: ProgramUniversityOffering[];
  relatedPrograms?: RelatedProgramSummary[];
  initialSaved?: boolean;
};

export function ProgramDetailView({
  program,
  universityOfferings = [],
  relatedPrograms = [],
  initialSaved = false,
}: ProgramDetailViewProps) {
  const { dict } = useLocale();
  const t = dict.student.programs;
  const categoryLabel = formatCategoryLabel(program.category);

  const salaryGroups = useMemo(
    () => groupSalaryRegionsBySubfield(program.salaryRegions),
    [program.salaryRegions],
  );
  const [activeSalaryTab, setActiveSalaryTab] = useState(
    salaryGroups[0]?.subfield ?? "General",
  );

  const activeSalaryRows =
    salaryGroups.find((group) => group.subfield === activeSalaryTab)?.rows ?? [];

  const salaryMaxSenior = useMemo(() => {
    let max = 0;
    for (const row of activeSalaryRows) {
      max = Math.max(max, parseSalaryAmount(row.senior_salary));
    }
    return max || 150_000;
  }, [activeSalaryRows]);

  const careerPathCount = program.careerPaths.length;
  const studyYears = program.studyPlan.length;
  const careerTitlesPreview = program.careerPaths
    .slice(0, 3)
    .map((path) => path.title)
    .join(", ");

  const fitQuestions = [...t.fitQuestions];
  const fitNotIdealItems = [...t.fitNotIdealItems];

  const dayPeriodLabels: Record<(typeof DAY_PERIOD_KEYS)[number], string> = {
    dayMorning: t.dayMorning ?? "Morning",
    dayAfternoon: t.dayAfternoon ?? "Afternoon",
    dayEvening: t.dayEvening ?? "Evening",
  };

  return (
    <div className={detailStyles.page}>
      <nav className={detailStyles.crumbs} aria-label="Breadcrumb">
        <Link href="/student/programs">{t.pageTitle}</Link>
        <span className={detailStyles.crumbsSep}>›</span>
        <Link href={`/student/programs?category=${encodeURIComponent(program.category)}`}>
          {categoryLabel}
        </Link>
        <span className={detailStyles.crumbsSep}>›</span>
        <span className={detailStyles.crumbsCurrent}>{program.title}</span>
      </nav>

      <section className={detailStyles.hero}>
        <div className={detailStyles.heroTop}>
          <div className={detailStyles.heroEyebrow}>
            {categoryLabel} · {t.programsSuffix}
          </div>
          <div className={detailStyles.heroActions}>
            <ProgramSaveButton programId={program.id} initialSaved={initialSaved} />
          </div>
        </div>
        <h1 className={detailStyles.heroTitle}>{program.title}</h1>
        <p className={detailStyles.heroTagline}>
          {program.shortDescription || program.description}
        </p>
        <div className={detailStyles.heroBadges}>
          {program.salaryPotential ? (
            <Badge
              label={`${t.salaryPotential}: ${program.salaryPotential}`}
              metricClass={badgeClassForMetric(program.salaryPotential)}
            />
          ) : null}
          {program.demandLevel ? (
            <Badge
              label={`${t.demand}: ${program.demandLevel}`}
              metricClass={badgeClassForMetric(program.demandLevel)}
            />
          ) : null}
          {program.mathIntensity ? (
            <Badge
              label={`${t.mathIntensity}: ${program.mathIntensity}`}
              metricClass={badgeClassForMetric(program.mathIntensity)}
            />
          ) : null}
          {program.aiResilience ? (
            <Badge
              label={`${t.careerFlexibility}: ${program.aiResilience}`}
              metricClass={badgeClassForMetric(program.aiResilience)}
            />
          ) : null}
        </div>
      </section>

      <section className={detailStyles.section}>
        <div className={detailStyles.snapshot}>
          <SnapItem
            label={t.snapBestFor}
            value={program.tags[0] || categoryLabel}
            meta={
              program.tags.length > 1
                ? program.tags.slice(1, 4).join(", ")
                : program.shortDescription || undefined
            }
          />
          <SnapItem
            label={t.snapCommonCareers}
            value={
              careerPathCount > 0
                ? t.snapPathsCount.replace("{count}", String(careerPathCount))
                : "—"
            }
            meta={
              careerTitlesPreview
                ? `${careerTitlesPreview}${careerPathCount > 3 ? "…" : ""}`
                : undefined
            }
          />
          <SnapItem
            label={t.snapDegreeLength}
            value={
              studyYears > 0
                ? t.snapDegreeYears.replace("{count}", String(studyYears))
                : t.snapDegreeDefault
            }
            meta={t.snapDegreeMeta}
          />
          <SnapItem
            label={t.snapDifficulty}
            value={program.mathIntensity}
            meta={program.demandLevel ? `${t.demand}: ${program.demandLevel}` : undefined}
          />
          <SnapItem
            label={t.snapWorkStyle}
            value={program.aiResilience || program.demandLevel}
            meta={program.salaryPotential ? `${t.salaryPotential}: ${program.salaryPotential}` : undefined}
          />
        </div>
      </section>

      <ProgramFitCheck
        questions={fitQuestions}
        notIdealItems={fitNotIdealItems}
        eyebrow={t.fitEyebrow}
        title={t.fitTitle.replace("{program}", program.title)}
        subtitle={t.fitSubtitle}
        resultEyebrow={t.fitResultEyebrow}
        matchLabel={t.fitMatchLabel}
        resultText={t.fitResultText.replace("{program}", program.title)}
        notIdealLabel={t.fitNotIdeal}
      />

      {program.studyPlan.length > 0 ? (
        <section className={detailStyles.section}>
          <div className={detailStyles.sectionEyebrow}>{t.studyPlanEyebrow}</div>
          <h2 className={detailStyles.sectionTitle}>{t.studyPlanTitleDetail}</h2>
          <p className={detailStyles.sectionSub}>{t.studyPlanSubtitleDetail}</p>
          <div className={detailStyles.journey}>
            <div
              className={detailStyles.journeyTrack}
              style={{
                gridTemplateColumns: `repeat(${Math.min(program.studyPlan.length, 4)}, 1fr)`,
              }}
            >
              {program.studyPlan.map((year) => (
                <div key={`${year.year}-${year.title}`} className={detailStyles.journeyYear}>
                  <div className={detailStyles.journeyNum}>
                    <span className={detailStyles.journeyNumBig}>{year.year}</span>
                    <span className={detailStyles.journeyNumSmall}>YEAR</span>
                  </div>
                  <div className={detailStyles.journeyTitle}>{year.title}</div>
                  <div className={detailStyles.journeyTopics}>
                    {(year.topics ?? []).map((topic) => (
                      <div key={topic} className={detailStyles.journeyTopic}>
                        <span className={detailStyles.journeyTopicDot} />
                        {topic}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {program.coreSkills.length > 0 ? (
        <section className={detailStyles.section}>
          <div className={detailStyles.sectionEyebrow}>{t.coreSkillsEyebrow}</div>
          <h2 className={detailStyles.sectionTitle}>{t.coreSkillsTitle}</h2>
          <p className={detailStyles.sectionSub}>{t.coreSkillsSubtitleDetail}</p>
          <div className={detailStyles.skillsGrid}>
            {program.coreSkills.map((skill) => (
              <div key={skill.skill} className={detailStyles.skillRow}>
                <div className={detailStyles.skillTop}>
                  <span className={detailStyles.skillName}>{skill.skill}</span>
                  {skill.level ? (
                    <span className={detailStyles.skillLevel}>{skill.level}</span>
                  ) : null}
                </div>
                <div className={detailStyles.skillBar}>
                  <div
                    className={detailStyles.skillFill}
                    style={{ width: `${skillLevelToPercent(skill.level)}%` }}
                  />
                </div>
                {skill.description ? (
                  <p className={detailStyles.skillDesc}>{skill.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {program.careerPaths.length > 0 ? (
        <section className={detailStyles.section}>
          <div className={detailStyles.sectionEyebrow}>{t.careerPathsEyebrow}</div>
          <h2 className={detailStyles.sectionTitle}>
            {t.careerPathsTitleDetail.replace("{program}", program.title)}
          </h2>
          <p className={detailStyles.sectionSub}>
            {t.careerPathsSubtitleDetail.replace(
              "{count}",
              String(Math.max(careerPathCount, 1)),
            )}
          </p>
          <div className={detailStyles.careerGrid}>
            {program.careerPaths.map((path) => (
              <article key={`${path.title}-${path.tag ?? ""}`} className={detailStyles.careerCard}>
                <div className={detailStyles.careerTop}>
                  <h3 className={detailStyles.careerName}>{path.title}</h3>
                  {path.tag ? (
                    <span className={detailStyles.careerTag}>{path.tag}</span>
                  ) : null}
                </div>
                {path.description ? (
                  <p className={detailStyles.careerDesc}>{path.description}</p>
                ) : null}
                <div className={detailStyles.careerStats}>
                  {formatCareerSalary(path) ? (
                    <div>
                      <div className={detailStyles.careerStatLabel}>
                        {t.careerStatSalary}
                      </div>
                      <div className={detailStyles.careerStatValue}>
                        {formatCareerSalary(path)}
                      </div>
                    </div>
                  ) : null}
                  {path.competitiveness ? (
                    <div>
                      <div className={detailStyles.careerStatLabel}>
                        {t.competitiveness}
                      </div>
                      <div className={detailStyles.careerStatValue}>
                        {path.competitiveness}
                      </div>
                    </div>
                  ) : null}
                </div>
                {(path.common_employers ?? []).length > 0 ? (
                  <div className={detailStyles.careerEmployers}>
                    {path.common_employers!.map((employer) => (
                      <span key={employer} className={detailStyles.careerEmployer}>
                        {employer}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
          <InfoNote>{t.careerPathsDisclaimer}</InfoNote>
        </section>
      ) : null}

      {program.salaryRegions.length > 0 ? (
        <section className={detailStyles.section}>
          <div className={detailStyles.sectionEyebrow}>{t.salaryEyebrow}</div>
          <h2 className={detailStyles.sectionTitle}>{t.salaryTitleDetail}</h2>
          <p className={detailStyles.sectionSub}>{t.salarySubtitleDetail}</p>
          <div className={detailStyles.salaryCard}>
            {salaryGroups.length > 0 ? (
              <div className={detailStyles.salaryTabs}>
                {salaryGroups.map((group) => (
                  <button
                    key={group.subfield}
                    type="button"
                    className={clsx(
                      detailStyles.salaryTab,
                      activeSalaryTab === group.subfield && detailStyles.salaryTabActive,
                    )}
                    onClick={() => setActiveSalaryTab(group.subfield)}
                  >
                    {group.subfield}
                  </button>
                ))}
              </div>
            ) : null}
            <div className={detailStyles.salaryRows}>
              {activeSalaryRows.map((row) => (
                <div
                  key={`${row.region}-${row.subfield ?? ""}`}
                  className={detailStyles.salaryRow}
                >
                  <div className={detailStyles.salaryRegion}>
                    {row.region}
                    {row.demand ? <small>{row.demand}</small> : null}
                  </div>
                  <div className={detailStyles.salaryBars}>
                    {row.entry_salary ? (
                      <SalaryBarRow
                        label={t.entrySalary}
                        value={row.entry_salary}
                        maxSenior={salaryMaxSenior}
                      />
                    ) : null}
                    {row.mid_salary ? (
                      <SalaryBarRow
                        label={t.midSalary}
                        value={row.mid_salary}
                        maxSenior={salaryMaxSenior}
                      />
                    ) : null}
                    {row.senior_salary ? (
                      <SalaryBarRow
                        label={t.seniorSalary}
                        value={row.senior_salary}
                        maxSenior={salaryMaxSenior}
                      />
                    ) : null}
                  </div>
                  <div className={detailStyles.salaryRange}>
                    {row.demand || program.salaryPotential || "—"}
                  </div>
                </div>
              ))}
            </div>
            <div className={detailStyles.salaryNote}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7a7a7a"
                strokeWidth="2"
                aria-hidden
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <div>{t.salaryNote}</div>
            </div>
          </div>
        </section>
      ) : null}

      {(program.demandLevel || program.tags.length > 0) && (
        <section className={detailStyles.section}>
          <div className={detailStyles.sectionEyebrow}>{t.demandEyebrow}</div>
          <h2 className={detailStyles.sectionTitle}>{t.demandTitleDetail}</h2>
          <p className={detailStyles.sectionSub}>{t.demandSubtitleDetail}</p>
          <div className={detailStyles.demandGrid}>
            {program.demandLevel ? (
              <div className={detailStyles.demandCard}>
                <div className={detailStyles.demandNum}>{program.demandLevel}</div>
                <div className={detailStyles.demandLabel}>{t.demandGrowthLabel}</div>
                <p className={detailStyles.demandText}>{program.description || t.demandSubtitle}</p>
              </div>
            ) : null}
            {program.tags.length > 0 ? (
              <div className={detailStyles.demandCard}>
                <div className={detailStyles.demandNum}>
                  {program.tags.length}
                  <small> {t.industries.toLowerCase()}</small>
                </div>
                <div className={detailStyles.demandLabel}>{t.demandIndustriesLabel}</div>
                <div className={detailStyles.industriesList}>
                  {program.tags.map((tag) => (
                    <span key={tag} className={detailStyles.industryChip}>
                      <span className={detailStyles.industryChipDot} />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <InfoNote>{t.demandDisclaimer}</InfoNote>
        </section>
      )}

      {program.employers.length > 0 ? (
        <section className={detailStyles.section}>
          <div className={detailStyles.sectionEyebrow}>{t.employersEyebrow}</div>
          <h2 className={detailStyles.sectionTitle}>{t.employersTitleDetail}</h2>
          <p className={detailStyles.sectionSub}>{t.employersSubtitleDetail}</p>
          <div className={detailStyles.employersGrid}>
            {program.employers.map((employer) => (
              <div
                key={`${employer.name}-${employer.region ?? ""}`}
                className={detailStyles.employerCard}
              >
                <div className={detailStyles.employerLogo}>
                  {initialsFromName(employer.name)}
                </div>
                <div className={detailStyles.employerName}>{employer.name}</div>
                <div className={detailStyles.employerMeta}>
                  {[employer.region, employer.meta].filter(Boolean).join(" · ")}
                </div>
              </div>
            ))}
          </div>
          <InfoNote>{t.employersDisclaimer}</InfoNote>
        </section>
      ) : null}

      {program.careerExamples.length > 0 ? (
        <section className={detailStyles.section}>
          <div className={detailStyles.sectionEyebrow}>{t.careerExamplesEyebrow}</div>
          <h2 className={detailStyles.sectionTitle}>{t.careerExamplesTitleDetail}</h2>
          <p className={detailStyles.sectionSub}>{t.careerExamplesSubtitleDetail}</p>
          <div className={detailStyles.peopleGrid}>
            {program.careerExamples.map((person) => (
              <article key={person.name} className={detailStyles.personCard}>
                <div className={detailStyles.personTop}>
                  <div className={detailStyles.personAvatar}>
                    {initialsFromName(person.name)}
                  </div>
                  <div className={detailStyles.personInfo}>
                    <div className={detailStyles.personName}>{person.name}</div>
                    <div className={detailStyles.personRole}>{person.role}</div>
                  </div>
                </div>
                <div className={detailStyles.careerPathMeta}>
                  {person.region ? (
                    <span className={detailStyles.careerPathMetaItem}>
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {person.region}
                    </span>
                  ) : null}
                  {person.years ? (
                    <span className={detailStyles.careerPathMetaItem}>
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {person.years}
                    </span>
                  ) : null}
                </div>
                {(person.path_steps ?? []).length > 0 ? (
                  <div className={detailStyles.careerPathPillRow}>
                    {person.path_steps!.map((step, index) => (
                      <span key={`${step}-${index}`} className={detailStyles.careerPathPillWrap}>
                        {index > 0 ? (
                          <span className={detailStyles.careerPathArrow} aria-hidden>
                            <svg
                              width="9"
                              height="9"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </span>
                        ) : null}
                        <span className={detailStyles.careerPathStep}>{step}</span>
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className={detailStyles.personBottom}>
                  <span className={detailStyles.personRegion}>{person.tag ?? "—"}</span>
                  <span className={detailStyles.personLink}>
                    {t.viewCareerPath}
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden
                    >
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </article>
            ))}
          </div>
          <InfoNote>{t.careerExamplesDisclaimer}</InfoNote>
        </section>
      ) : null}

      {program.dayInLife.length > 0 ? (
        <section className={detailStyles.section}>
          <div className={detailStyles.sectionEyebrow}>{t.dayInLifeEyebrow}</div>
          <h2 className={detailStyles.sectionTitle}>{t.dayInLifeTitle}</h2>
          <p className={detailStyles.sectionSub}>{t.dayInLifeSubtitle}</p>
          <div className={detailStyles.dayGrid}>
            {program.dayInLife.map((block, index) => {
              const periodKey = DAY_PERIOD_KEYS[index % DAY_PERIOD_KEYS.length]!;
              const periodLabel = dayPeriodLabels[periodKey];
              return (
                <article key={`${block.time}-${index}`} className={detailStyles.dayCard}>
                  {block.time ? (
                    <div className={detailStyles.dayCardTime}>{block.time}</div>
                  ) : null}
                  <div
                    className={clsx(
                      detailStyles.dayIcon,
                      DAY_ICON_CLASSES[index % DAY_ICON_CLASSES.length],
                    )}
                    aria-hidden
                  >
                    <DayPeriodIcon index={index} />
                  </div>
                  <div>
                    <div className={detailStyles.dayTitle}>{periodLabel}</div>
                    {block.notes ? (
                      <div className={detailStyles.daySub}>{block.notes}</div>
                    ) : null}
                  </div>
                  <div className={detailStyles.dayList}>
                    {(block.activities ?? []).map((activity) => (
                      <div key={activity} className={detailStyles.dayItem}>
                        {activity}
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className={detailStyles.section}>
        <div className={detailStyles.reality}>
          <div className={detailStyles.realityIcon} aria-hidden>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <div className={detailStyles.realityTitle}>{t.realityTitle}</div>
            <div className={detailStyles.realitySub}>{t.realitySub}</div>
            <div className={detailStyles.realityList}>
              {t.realityItems.map((item, index) => (
                <div key={item} className={detailStyles.realityItem}>
                  <div className={detailStyles.realityItemNum}>{index + 1}</div>
                  <div>{item}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {program.videos.length > 0 ? (
        <section className={detailStyles.section}>
          <div className={detailStyles.sectionEyebrow}>{t.videosEyebrow}</div>
          <h2 className={detailStyles.sectionTitle}>{t.videosTitleDetail}</h2>
          <p className={detailStyles.sectionSub}>{t.videosSubtitleDetail}</p>
          <div className={detailStyles.videosGrid}>
            {program.videos.map((video) => (
              <a
                key={video.youtube_id}
                href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={detailStyles.videoCard}
              >
                <div
                  className={detailStyles.videoThumb}
                  style={{
                    backgroundImage: `url(https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg)`,
                  }}
                >
                  <div className={detailStyles.videoPlay}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="6 4 20 12 6 20 6 4" />
                    </svg>
                  </div>
                </div>
                <div className={detailStyles.videoMeta}>
                  {video.category ? (
                    <div className={detailStyles.videoCat}>{video.category}</div>
                  ) : null}
                  <div className={detailStyles.videoTitle}>{video.title}</div>
                  {video.channel ? (
                    <div className={detailStyles.videoChannel}>{video.channel}</div>
                  ) : null}
                </div>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <ProgramUniversitiesSection
        programTitle={program.title}
        offerings={universityOfferings}
      />

      {relatedPrograms.length > 0 ? (
        <section className={detailStyles.section}>
          <div className={detailStyles.sectionEyebrow}>{t.relatedEyebrow}</div>
          <h2 className={detailStyles.sectionTitle}>{t.relatedTitle}</h2>
          <p className={detailStyles.sectionSub}>{t.relatedSubtitle}</p>
          <div className={detailStyles.relatedGrid}>
            {relatedPrograms.map((related) => (
              <Link
                key={related.slug}
                href={`/student/programs/${related.slug}`}
                className={detailStyles.relatedChip}
              >
                {related.title}
                <span className={detailStyles.relatedArrow} aria-hidden>
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className={detailStyles.section}>
        <div className={detailStyles.pnsBlock}>
          <div className={detailStyles.pnsHead}>
            <h3>{t.pnsTitle.replace("{program}", program.title)}</h3>
            <p>{t.pnsSubtitle}</p>
          </div>
          <div className={detailStyles.pnsGrid}>
            <Link href="/student/ambassadors" className={detailStyles.pnsCard}>
              <div className={detailStyles.pnsIcon} aria-hidden>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <div className={detailStyles.pnsText}>
                <div className={detailStyles.pnsTitle}>{t.pnsAmbassadors}</div>
                <div className={detailStyles.pnsSub}>{t.pnsAmbassadorsDesc}</div>
              </div>
            </Link>
            <Link href="/student/advisor-sessions" className={detailStyles.pnsCard}>
              <div className={detailStyles.pnsIcon} aria-hidden>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <polyline points="17 11 19 13 23 9" />
                </svg>
              </div>
              <div className={detailStyles.pnsText}>
                <div className={detailStyles.pnsTitle}>{t.pnsAdvisor}</div>
                <div className={detailStyles.pnsSub}>{t.pnsAdvisorDesc}</div>
              </div>
            </Link>
            <Link href="/student/application-support" className={detailStyles.pnsCard}>
              <div className={detailStyles.pnsIcon} aria-hidden>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <polyline points="9 15 11 17 15 13" />
                </svg>
              </div>
              <div className={detailStyles.pnsText}>
                <div className={detailStyles.pnsTitle}>{t.pnsApplication}</div>
                <div className={detailStyles.pnsSub}>{t.pnsApplicationDesc}</div>
              </div>
            </Link>
            <span className={clsx(detailStyles.pnsCard, detailStyles.pnsCardDisabled)}>
              <div className={detailStyles.pnsIcon} aria-hidden>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2l2 4 4 1-4 1-2 4-2-4-4-1 4-1 2-4z" />
                </svg>
              </div>
              <div className={detailStyles.pnsText}>
                <div className={detailStyles.pnsTitle}>
                  {t.pnsAiFit}
                  <span className={detailStyles.pnsComing}>{t.comingSoon}</span>
                </div>
                <div className={detailStyles.pnsSub}>{t.pnsAiFitDesc}</div>
              </div>
            </span>
          </div>
        </div>
      </section>

      <ProgramDetailStickyCta
        title={t.stickyCtaTitle.replace("{program}", program.title)}
        subtitle={t.stickyCtaSubtitle}
        buttonLabel={t.stickyCtaBtn}
      />
    </div>
  );
}

function Badge({
  label,
  metricClass,
}: {
  label: string;
  metricClass: string;
}) {
  const className =
    metricClass === "badgeHigh"
      ? detailStyles.badgeHigh
      : metricClass === "badgeStrong"
        ? detailStyles.badgeStrong
        : detailStyles.badgeMedhigh;

  return (
    <span className={clsx(detailStyles.badge, className)}>
      <span className={detailStyles.badgeDot} />
      {label}
    </span>
  );
}

function SnapItem({
  label,
  value,
  meta,
}: {
  label: string;
  value: string;
  meta?: string;
}) {
  return (
    <div className={detailStyles.snapItem}>
      <div className={detailStyles.snapLabel}>{label}</div>
      <div className={detailStyles.snapValue}>{value || "—"}</div>
      {meta ? <div className={detailStyles.snapMeta}>{meta}</div> : null}
    </div>
  );
}

function SalaryBarRow({
  label,
  value,
  maxSenior,
}: {
  label: string;
  value: string;
  maxSenior: number;
}) {
  return (
    <div className={detailStyles.salaryBarRow}>
      <span className={detailStyles.salaryBarLabel}>{label}</span>
      <div className={detailStyles.salaryBarBg}>
        <div
          className={detailStyles.salaryBarFill}
          style={{ width: `${salaryBarPct(value, maxSenior)}%` }}
        >
          <span className={detailStyles.salaryBarNum}>{value}</span>
        </div>
      </div>
    </div>
  );
}

function DayPeriodIcon({ index }: { index: number }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (index % 3 === 1) {
    return (
      <svg {...common}>
        <path d="M3 3v18h18" />
        <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
      </svg>
    );
  }
  if (index % 3 === 2) {
    return (
      <svg {...common}>
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
    </svg>
  );
}

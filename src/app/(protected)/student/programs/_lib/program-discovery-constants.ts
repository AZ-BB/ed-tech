export type InterestTile = {
  id: string;
  title: string;
  meta: string;
  characteristicId: string;
  listEyebrow: string;
  listTitle: string;
  listSubtitle: string;
  listNote?: string;
};

export const PROGRAM_INTEREST_TILES: InterestTile[] = [
  {
    id: "solving-problems",
    title: "I like solving problems",
    meta: "Engineering · CS · Math",
    characteristicId: "solving-problems",
    listEyebrow: "For curious minds",
    listTitle: "Programs for problem solvers",
    listSubtitle:
      "For students who enjoy logic, puzzles, systems, equations, building solutions, and understanding how things work.",
  },
  {
    id: "working-with-people",
    title: "I like working with people",
    meta: "Psychology · HR · Education",
    characteristicId: "working-with-people",
    listEyebrow: "For relationship builders",
    listTitle: "People-focused programs",
    listSubtitle:
      "For students who enjoy understanding people, helping others, communicating, advising, teaching, or working in team-based environments.",
  },
  {
    id: "numbers-and-money",
    title: "I like numbers and money",
    meta: "Finance · Economics · Accounting",
    characteristicId: "numbers-and-money",
    listEyebrow: "For business minds",
    listTitle: "Programs for numbers and money",
    listSubtitle:
      "For students who enjoy money, markets, business decisions, investments, companies, and how economies work.",
  },
  {
    id: "creating-things",
    title: "I like creating things",
    meta: "Design · Architecture · Film",
    characteristicId: "creating-things",
    listEyebrow: "For makers and storytellers",
    listTitle: "Creative programs",
    listSubtitle:
      "For students who enjoy visual thinking, design, storytelling, building concepts, creating content, or turning ideas into something people can see or experience.",
  },
  {
    id: "high-income-path",
    title: "I want a high-income path",
    meta: "Medicine · Law · Banking",
    characteristicId: "high-income-path",
    listEyebrow: "For ambitious earners",
    listTitle: "High-income programs",
    listSubtitle:
      "For students who are motivated by competitive career paths, strong earning potential, and fields with high demand.",
    listNote:
      "Income varies by country, university, industry, experience and individual performance. These programs are commonly linked to strong earning potential, but no degree guarantees a specific salary.",
  },
  {
    id: "make-an-impact",
    title: "I want to make an impact",
    meta: "Public Health · Policy · Social Work",
    characteristicId: "make-an-impact",
    listEyebrow: "For changemakers",
    listTitle: "Impact-driven programs",
    listSubtitle:
      "For students who care about improving people's lives, solving social problems, supporting communities, protecting the environment, or shaping the future.",
  },
  {
    id: "helping-others",
    title: "I want to help others",
    meta: "Pharmacy · Physio · Nutrition",
    characteristicId: "helping-others",
    listEyebrow: "For caregivers",
    listTitle: "Programs for helping others",
    listSubtitle:
      "For students drawn to healthcare, therapy, nutrition, and other paths focused on improving people's wellbeing.",
  },
  {
    id: "science-and-research",
    title: "I love science and research",
    meta: "Biology · Chemistry · Neuroscience",
    characteristicId: "science-and-research",
    listEyebrow: "For researchers",
    listTitle: "Science and research programs",
    listSubtitle:
      "For students who love experiments, discovery, and pushing the boundaries of what we know.",
  },
  {
    id: "hands-on",
    title: "I like hands-on work",
    meta: "Engineering · Hospitality · Trades",
    characteristicId: "hands-on",
    listEyebrow: "For doers",
    listTitle: "Hands-on programs",
    listSubtitle:
      "For students who learn best by building, fixing, operating, and working with their hands.",
  },
];

export const PROGRAM_QUICK_CHIPS = [
  "Computer Science",
  "Finance",
  "Medicine",
  "Engineering",
  "Business",
  "Psychology",
] as const;

export const HERO_FLOAT_PROGRAMS = [
  "Computer Science",
  "Finance",
  "Architecture",
] as const;

type ProgramRailFilterInput = {
  salaryPotential: string;
  aiResilience: string;
  category: string;
  characteristicIds: string[];
  title: string;
  slug: string;
};

export type ProgramRailConfig = {
  id: string;
  eyebrow: string;
  title: string;
  /**
   * Curated titles in display order. Titles with no matching DB program are skipped.
   * When set, this takes precedence over `filter`.
   */
  programTitles?: readonly string[];
  filter?: (program: ProgramRailFilterInput) => boolean;
};

export const PROGRAM_SECTION_DISPLAY_LIMIT = 10;

export const PROGRAM_RAILS: ProgramRailConfig[] = [
  {
    id: "high-income",
    eyebrow: "For ambitious earners",
    title: "High-income programs",
    programTitles: [
      "Artificial Intelligence",
      "Biomedical Engineering",
      "Chemical Engineering",
      "Chemistry",
      "Cloud Computing",
      "Cybersecurity",
      "Data Science",
      "Entrepreneurship",
      "Finance",
    ],
  },
  {
    id: "future-proof",
    eyebrow: "Built for what's next",
    title: "Future-proof programs",
    programTitles: [
      "Investment Banking",
      "Supply Chain & Logistics",
      "Medicine",
      "Computer Science",
      "Neuroscience",
      "Radiology & Medical Imaging",
      "Hospitality & Tourism Management",
      "Pharmacy",
      "Mathematics",
      "Aerospace Engineering",
    ],
  },
  {
    id: "creative",
    eyebrow: "For visual thinkers",
    title: "Creative programs",
    filter: (p) =>
      p.characteristicIds.includes("creating-things") ||
      /creative|design|media|film|architecture/i.test(p.category),
  },
  {
    id: "problem-solvers",
    eyebrow: "If you love a tough question",
    title: "Programs for problem solvers",
    programTitles: [
      "Physics",
      "Electrical Engineering",
      "Civil Engineering",
      "Mechanical Engineering",
      "Biology",
      "Petroleum Engineering",
      "Medicine",
      "Psychology",
      "Public Policy",
      "Financial Technology",
    ],
  },
];

/** Extra search needles for common title variants / typos. */
const PROGRAM_TITLE_ALIASES: Record<string, readonly string[]> = {
  chemistry: ["chemistery"],
  neuroscience: ["neuro science"],
  psychology: ["phsycology"],
  "supply chain and logistics": [
    "supply chain and logistic",
    "supply chain logistics",
    "supply chain logistic",
  ],
  "financial technology": [
    "fintech",
    "fin tech",
    "financial technology fintech",
    "financial technology fin tech",
  ],
  "data science": ["datascience"],
  cybersecurity: ["cyber security"],
  "investment banking": ["investment bank"],
  "public policy": ["public policy studies"],
  "radiology and medical imaging": [
    "radiology medical imaging",
    "medical imaging",
  ],
  "hospitality and tourism management": [
    "hospitality tourism management",
    "hospitality and tourism",
  ],
};

function normalizeProgramKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleSearchNeedles(curatedTitle: string): string[] {
  const normalized = normalizeProgramKey(curatedTitle);
  const aliases = PROGRAM_TITLE_ALIASES[normalized] ?? [];
  return [normalized, ...aliases.map(normalizeProgramKey)];
}

function findProgramByCuratedTitle<
  T extends { title: string; slug: string; id: string },
>(programs: T[], curatedTitle: string, usedIds: Set<string>): T | null {
  const needles = titleSearchNeedles(curatedTitle);
  const available = programs.filter((program) => !usedIds.has(program.id));

  const exact = available.find((program) => {
    const titleKey = normalizeProgramKey(program.title);
    const slugKey = normalizeProgramKey(program.slug.replace(/-/g, " "));
    return needles.some((needle) => titleKey === needle || slugKey === needle);
  });
  if (exact) return exact;

  const startsWith = available.find((program) => {
    const titleKey = normalizeProgramKey(program.title);
    return needles.some(
      (needle) => titleKey.startsWith(needle) || needle.startsWith(titleKey),
    );
  });
  if (startsWith) return startsWith;

  // Prefer longer needles so short titles like "Finance" don't over-match.
  const rankedNeedles = [...needles].sort((a, b) => b.length - a.length);
  for (const needle of rankedNeedles) {
    if (needle.length < 5) continue;
    const includes = available.find((program) =>
      normalizeProgramKey(program.title).includes(needle),
    );
    if (includes) return includes;
  }

  return null;
}

export function pickProgramsByTitles<
  T extends { title: string; slug: string; id: string },
>(programs: T[], curatedTitles: readonly string[]): T[] {
  const usedIds = new Set<string>();
  const matched: T[] = [];

  for (const curatedTitle of curatedTitles) {
    const program = findProgramByCuratedTitle(programs, curatedTitle, usedIds);
    if (!program) continue;
    usedIds.add(program.id);
    matched.push(program);
  }

  return matched;
}

export function selectProgramsForRail<T extends ProgramRailFilterInput & { id: string }>(
  programs: T[],
  rail: ProgramRailConfig,
): T[] {
  if (rail.programTitles?.length) {
    return pickProgramsByTitles(programs, rail.programTitles);
  }

  if (!rail.filter) return [];

  return programs.filter(rail.filter).slice(0, PROGRAM_SECTION_DISPLAY_LIMIT);
}

export const PROGRAM_ICON_VARIANTS = [
  "bgGreen",
  "bgBlue",
  "bgOrange",
  "bgPurple",
  "bgPink",
  "bgYellow",
] as const;

export type ProgramIconVariant = (typeof PROGRAM_ICON_VARIANTS)[number];

export function iconVariantForSlug(slug: string): ProgramIconVariant {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash + slug.charCodeAt(i)) % PROGRAM_ICON_VARIANTS.length;
  }
  return PROGRAM_ICON_VARIANTS[hash]!;
}

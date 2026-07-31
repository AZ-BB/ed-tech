import { programFitTestOptionsEn } from "@/lib/i18n/dictionaries/program-fit-test-options-en";
import type { ProgramCatalogEntry } from "@/lib/fetch-program-catalog-for-ai";
import {
  PROGRAM_FIT_TEST_STEPS,
  type ProgramFitTestAnswers,
} from "@/lib/program-fit-test-steps";

type LabeledAnswers = Record<string, string | string[] | number>;

function labelOption(questionId: string, code: string): string {
  for (const step of PROGRAM_FIT_TEST_STEPS) {
    const stepOpts =
      programFitTestOptionsEn.steps[
        step.key as keyof typeof programFitTestOptionsEn.steps
      ];
    const qCopy = stepOpts.questions[questionId as keyof typeof stepOpts.questions] as
      | { options?: Record<string, string> }
      | undefined;
    if (qCopy?.options?.[code]) return qCopy.options[code];
  }
  return code;
}

function labelAnswer(questionId: string, value: string | string[] | number): string | string[] | number {
  if (typeof value === "number") return value;
  if (Array.isArray(value)) return value.map((code) => labelOption(questionId, code));
  return labelOption(questionId, value);
}

export function buildEnglishLabeledAnswers(
  answers: ProgramFitTestAnswers,
): LabeledAnswers {
  const labeled: LabeledAnswers = {};
  for (const [questionId, value] of Object.entries(answers)) {
    labeled[questionId] = labelAnswer(questionId, value);
  }
  return labeled;
}

function formatAnswerLines(answers: LabeledAnswers): string {
  const lines: string[] = [];

  const sections: Array<{ title: string; weight: string; ids: string[] }> = [
    {
      title: "Interests (highest weight)",
      weight: "critical",
      ids: ["topics", "subjects"],
    },
    {
      title: "Future vision (highest weight)",
      weight: "critical",
      ids: ["future", "identity"],
    },
    {
      title: "Motivation (high weight)",
      weight: "high",
      ids: ["matters", "priority"],
    },
    {
      title: "Thinking style (high weight)",
      weight: "high",
      ids: ["approach", "challenge"],
    },
    {
      title: "Work environment (medium weight)",
      weight: "medium",
      ids: ["environment", "focus", "pressure"],
    },
    {
      title: "Strengths (medium weight)",
      weight: "medium",
      ids: ["strengths", "improve"],
    },
    {
      title: "Study preferences (medium weight)",
      weight: "medium",
      ids: ["learning", "duration", "breadth"],
    },
    {
      title: "Practical preferences (low weight for program choice)",
      weight: "low",
      ids: ["regions", "salaryWeight", "enjoyWeight"],
    },
  ];

  for (const section of sections) {
    lines.push(`### ${section.title}`);
    for (const id of section.ids) {
      const val = answers[id];
      if (val === undefined) continue;
      if (typeof val === "number") {
        lines.push(`- ${id}: ${val}/5`);
        continue;
      }
      if (Array.isArray(val)) {
        lines.push(`- ${id}: ${val.join("; ")}`);
        continue;
      }
      lines.push(`- ${id}: ${val}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

function extractDomainSignals(answers: ProgramFitTestAnswers): string[] {
  const signals = new Set<string>();

  const addFrom = (value: unknown) => {
    if (typeof value === "string") signals.add(value);
    if (Array.isArray(value)) value.forEach((v) => signals.add(v));
  };

  addFrom(answers.topics);
  addFrom(answers.subjects);
  addFrom(answers.future);
  addFrom(answers.identity);
  addFrom(answers.priority);
  addFrom(answers.matters);
  addFrom(answers.environment);
  addFrom(answers.approach);
  addFrom(answers.challenge);
  addFrom(answers.strengths);

  const domains: string[] = [];

  const hasAny = (...codes: string[]) => codes.some((c) => signals.has(c));

  if (hasAny("tech", "cs", "build", "patterns")) {
    domains.push("technology-computing");
  }
  if (hasAny("business", "econ", "income", "founder", "numbers", "case")) {
    domains.push("business-finance-economics");
  }
  if (hasAny("health", "bio", "chem", "doctor", "help", "helping")) {
    domains.push("health-medicine-life-sciences");
  }
  if (hasAny("creative", "art", "design", "visualize", "studio", "designer", "creativity")) {
    domains.push("creative-design-media");
  }
  if (hasAny("eng", "phys", "engineer")) {
    domains.push("engineering-physical-sciences");
  }
  if (hasAny("social", "hist", "law", "impact", "advocate", "community", "social")) {
    domains.push("law-policy-social-impact");
  }
  if (hasAny("env", "impact", "social")) {
    domains.push("environment-sustainability");
  }
  if (hasAny("edu", "mentor", "advisor", "community", "helping")) {
    domains.push("education-human-services");
  }
  if (hasAny("psy", "empathy", "discuss", "help", "people")) {
    domains.push("psychology-people-sciences");
  }
  if (hasAny("research", "researcher", "theory", "intellect", "ideas")) {
    domains.push("research-academia");
  }

  return domains;
}

function scaleGuidance(answers: ProgramFitTestAnswers): string {
  const salaryWeight = typeof answers.salaryWeight === "number" ? answers.salaryWeight : 3;
  const enjoyWeight = typeof answers.enjoyWeight === "number" ? answers.enjoyWeight : 3;
  const pressure = typeof answers.pressure === "number" ? answers.pressure : 3;

  const lines: string[] = [];

  if (salaryWeight >= 4) {
    lines.push(
      "- Salary weight is high: prefer programs with strong salary_potential in the catalog when interests allow.",
    );
  } else if (salaryWeight <= 2) {
    lines.push(
      "- Salary weight is low: do not prioritize high salary alone; fit with interests matters more.",
    );
  }

  if (enjoyWeight >= 4) {
    lines.push(
      "- Enjoyment weight is high: rank 1 must closely match topics + subjects + future vision, even if less lucrative.",
    );
  }

  if (pressure >= 4) {
    lines.push(
      "- Pressure tolerance is high: competitive or high-stakes paths (medicine, finance, entrepreneurship, law) are acceptable.",
    );
  } else if (pressure <= 2) {
    lines.push(
      "- Pressure tolerance is low: avoid recommending highly competitive paths unless the student explicitly chose health/law/founder futures.",
    );
  }

  return lines.join("\n");
}

function responseLanguageInstructions(locale: "en" | "ar" | undefined): string {
  if (locale === "ar") {
    return `
Language (required):
- Write profileSummary, profileTags, hook, description, and every whyItFits bullet in Modern Standard Arabic.
- Keep slug values exactly as provided in the catalog (Latin slug strings, unchanged).
- rank must remain exactly 1, 2, or 3.
- When citing student answers in whyItFits, use the human-readable labels from labeledAnswers (Arabic), not raw codes.
`;
  }
  return `
Language:
- Write profileSummary, profileTags, hook, description, and whyItFits in clear English.
- When citing student answers in whyItFits, use the human-readable labels from labeledAnswers, not raw codes.
`;
}

export function buildProgramFitMatchingPrompt(input: {
  answers: ProgramFitTestAnswers;
  labeledAnswers?: unknown;
  catalog: ProgramCatalogEntry[];
  locale?: "en" | "ar";
}): string {
  const englishLabeled = buildEnglishLabeledAnswers(input.answers);
  const clientLabeled =
    input.labeledAnswers && typeof input.labeledAnswers === "object" && !Array.isArray(input.labeledAnswers)
      ? (input.labeledAnswers as LabeledAnswers)
      : englishLabeled;

  const domainSignals = extractDomainSignals(input.answers);
  const profileBlock = formatAnswerLines(englishLabeled);
  const scales = scaleGuidance(input.answers);

  return `
You are Univeera's program fit advisor. Your job is to recommend exactly 3 study programs from the catalog that genuinely fit this student's questionnaire — not generic popular programs.

${responseLanguageInstructions(input.locale)}

## Matching method (follow before writing JSON)

1. Read every answer below. Treat interests (topics, subjects), future vision (future, identity), and motivation (priority, matters) as the strongest signals.
2. Infer 2–4 domain clusters the student belongs to (examples: technology-computing, health-medicine, business-finance, creative-design, engineering, law-policy, psychology-people).
   Detected clusters from this student: ${domainSignals.length > 0 ? domainSignals.join(", ") : "infer from answers"}.
3. Scan the full catalog. Shortlist programs whose title, category, tags, short_description, and characteristic_ids align with those clusters.
4. Rank 1 must be the best overall fit across interests + future vision + motivation — not just salary or demand.
5. Rank 2 should be a strong alternate in the same or adjacent domain.
6. Rank 3 should offer a meaningful alternative (adjacent field or different angle) while still fitting the student's profile.
7. Reject programs that contradict the student's core interests. Example: if they chose only creative topics/subjects and creative future, do NOT recommend pure finance or petroleum engineering unless strongly justified by other answers.
8. If the student chose health topics/subjects OR doctor identity OR health future, at least one of the 3 recommendations must be health/medicine/life-sciences related.
9. If the student chose creative topics/subjects OR designer identity OR creative priority, at least one recommendation must be creative/design/media/architecture related.
10. If the student chose tech/cs topics/subjects OR tech future OR engineer identity, at least one recommendation must be technology or engineering related.

## Scale interpretation
${scales || "- No strong scale bias detected; balance fit and practicality."}

## Student profile (English labels for reasoning)
${profileBlock}

## Student answers for citations (use these exact labels in whyItFits when locale matches)
${JSON.stringify(clientLabeled, null, 2)}

## Raw answer codes (for disambiguation only — do not cite codes in output)
${JSON.stringify(input.answers, null, 2)}

## Catalog field guide
Each program includes: slug, title, category, short_description, tags, demand_level, salary_potential, characteristic_ids.
- characteristic_ids describe student interest tiles (e.g. solving-problems, creating-things, high-income-path, science-and-research).
- Prefer programs whose characteristic_ids and tags reinforce the student's domains.

## Available programs (pick slugs from this list ONLY)
${JSON.stringify(input.catalog, null, 2)}

## Output JSON
Return valid JSON with:
- profileSummary: 2–3 sentences summarizing this specific student. Reference at least 3 different answer areas (e.g. interests + motivation + future). You may use <strong> for emphasis. Do not be generic.
- profileTags: 3–7 short trait tags derived from their actual answers (not generic words like "motivated").
- recommendations: exactly 3 items, distinct slugs, ranks 1 (best), 2, 3
  - hook: one personalized opener tied to their future vision or motivation
  - description: what they would study/do in this program, connected to their interests
  - whyItFits: exactly 4–5 bullets. Rules for EVERY bullet:
    • Must reference a specific answer the student gave (quote or paraphrase the labeled answer)
    • Must explain why THAT answer points to THIS program
    • Must not repeat the same answer twice across bullets for the same program
    • Must not use vague lines like "this aligns with your interests" without naming the interest
    • Cover at least 3 different question areas across the 4–5 bullets (e.g. topics + priority + future + strengths)

## Hard rules
- slug must exactly match a catalog entry
- Recommend programs only — never universities, schools, or campuses
- Do not invent programs, slugs, or careers
- Do not recommend the same program twice
- Do not ignore the student's top priority (priority question) when choosing rank 1
- regions answer must NOT determine which program slug you pick
- No markdown outside JSON
`.trim();
}

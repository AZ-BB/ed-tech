export type FitTestOptionDef = { v: string };

export type FitTestQuestionDef =
  | {
      id: string;
      type: "multi";
      max: number;
      options: FitTestOptionDef[];
    }
  | {
      id: string;
      type: "single";
      options: FitTestOptionDef[];
    }
  | {
      id: string;
      type: "scale";
      min: number;
      max: number;
    };

export type FitTestStepDef = {
  key: string;
  questions: FitTestQuestionDef[];
};

/** Structural step config — labels live in i18n dictionaries. */
export const PROGRAM_FIT_TEST_STEPS: FitTestStepDef[] = [
  {
    key: "interests",
    questions: [
      {
        id: "topics",
        type: "multi",
        max: 3,
        options: [
          { v: "tech" },
          { v: "business" },
          { v: "health" },
          { v: "creative" },
          { v: "social" },
          { v: "eng" },
          { v: "env" },
          { v: "edu" },
        ],
      },
      {
        id: "subjects",
        type: "multi",
        max: 3,
        options: [
          { v: "math" },
          { v: "phys" },
          { v: "bio" },
          { v: "chem" },
          { v: "econ" },
          { v: "psy" },
          { v: "eng" },
          { v: "art" },
          { v: "cs" },
          { v: "hist" },
        ],
      },
    ],
  },
  {
    key: "thinkingStyle",
    questions: [
      {
        id: "approach",
        type: "single",
        options: [
          { v: "logic" },
          { v: "patterns" },
          { v: "discuss" },
          { v: "visualize" },
          { v: "research" },
          { v: "empathy" },
        ],
      },
      {
        id: "challenge",
        type: "single",
        options: [
          { v: "logic" },
          { v: "build" },
          { v: "help" },
          { v: "design" },
          { v: "business" },
          { v: "social" },
        ],
      },
    ],
  },
  {
    key: "environment",
    questions: [
      {
        id: "environment",
        type: "single",
        options: [
          { v: "corporate" },
          { v: "health" },
          { v: "tech" },
          { v: "creative" },
          { v: "community" },
          { v: "engineer" },
          { v: "research" },
        ],
      },
      { id: "pressure", type: "scale", min: 1, max: 5 },
      {
        id: "focus",
        type: "single",
        options: [
          { v: "people" },
          { v: "systems" },
          { v: "ideas" },
          { v: "mix" },
        ],
      },
    ],
  },
  {
    key: "motivation",
    questions: [
      {
        id: "matters",
        type: "multi",
        max: 2,
        options: [
          { v: "income" },
          { v: "stability" },
          { v: "helping" },
          { v: "impact" },
          { v: "creative" },
          { v: "building" },
          { v: "prestige" },
          { v: "flexible" },
        ],
      },
      {
        id: "priority",
        type: "single",
        options: [
          { v: "income" },
          { v: "meaning" },
          { v: "creativity" },
          { v: "stability" },
          { v: "intellect" },
          { v: "independence" },
        ],
      },
    ],
  },
  {
    key: "strengths",
    questions: [
      {
        id: "strengths",
        type: "multi",
        max: 4,
        options: [
          { v: "numbers" },
          { v: "explain" },
          { v: "detail" },
          { v: "empathy" },
          { v: "creative" },
          { v: "organize" },
          { v: "research" },
          { v: "pressure" },
          { v: "build" },
          { v: "debate" },
          { v: "tech" },
          { v: "social" },
        ],
      },
      {
        id: "improve",
        type: "single",
        options: [
          { v: "comm" },
          { v: "tech" },
          { v: "analytic" },
          { v: "creative" },
          { v: "leader" },
          { v: "research" },
          { v: "business" },
        ],
      },
    ],
  },
  {
    key: "studyStyle",
    questions: [
      {
        id: "learning",
        type: "single",
        options: [
          { v: "theory" },
          { v: "project" },
          { v: "lab" },
          { v: "studio" },
          { v: "case" },
          { v: "field" },
        ],
      },
      {
        id: "duration",
        type: "single",
        options: [
          { v: "long" },
          { v: "standard" },
          { v: "practical" },
          { v: "unsure" },
        ],
      },
      {
        id: "breadth",
        type: "single",
        options: [
          { v: "specialize" },
          { v: "broad" },
          { v: "hybrid" },
        ],
      },
    ],
  },
  {
    key: "futureVision",
    questions: [
      {
        id: "future",
        type: "single",
        options: [
          { v: "business" },
          { v: "tech" },
          { v: "health" },
          { v: "creative" },
          { v: "mentor" },
          { v: "impact" },
          { v: "law" },
          { v: "founder" },
        ],
      },
      {
        id: "identity",
        type: "single",
        options: [
          { v: "analyst" },
          { v: "engineer" },
          { v: "doctor" },
          { v: "designer" },
          { v: "advisor" },
          { v: "researcher" },
          { v: "leader" },
          { v: "advocate" },
        ],
      },
    ],
  },
  {
    key: "preferences",
    questions: [
      {
        id: "regions",
        type: "multi",
        max: 3,
        options: [
          { v: "gcc" },
          { v: "uk" },
          { v: "us" },
          { v: "canada" },
          { v: "europe" },
          { v: "aus" },
          { v: "unsure" },
        ],
      },
      { id: "salaryWeight", type: "scale", min: 1, max: 5 },
      { id: "enjoyWeight", type: "scale", min: 1, max: 5 },
    ],
  },
];

export type ProgramFitTestAnswers = Record<string, string | string[] | number>;

export const PROGRAM_FIT_TEST_QUESTION_IDS = PROGRAM_FIT_TEST_STEPS.flatMap((step) =>
  step.questions.map((q) => q.id),
);

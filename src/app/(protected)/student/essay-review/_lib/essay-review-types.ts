export type EssayReviewStats = {
  words: number;
  sentences: number;
  paragraphs: number;
  avgSentLen: number;
  score: number;
};

export type EssayReviewFeedback = {
  is_valid_essay: boolean;
  invalid_reason?: string;
  assessment: string;
  structure: Array<{ section: string; rating: string; note: string }>;
  strengths: string[];
  improvements: string[];
  suggestions: Array<{ original: string; improved: string; reason: string }>;
  quality: Array<{ name: string; rating: string; tip: string }>;
  authenticity: { assessment: string; flags: string[] };
  recommendation: string;
  _stats: EssayReviewStats;
};

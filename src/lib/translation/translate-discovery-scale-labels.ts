import type { ScaleId } from "@/types/discovery";

/** Static Arabic labels for discovery rating scales (no AI / DB translation needed). */
const SCALE_LABELS_AR: Partial<Record<ScaleId, Record<number, string>>> = {
  interest: {
    1: "غير مهتم إطلاقاً",
    2: "مهتم قليلاً",
    3: "مهتم إلى حد ما",
    4: "مهتم",
    5: "مهتم جداً",
  },
  frequency: {
    1: "نادراً جداً",
    2: "أحياناً",
    3: "غالباً",
    4: "كثيراً",
    5: "دائماً تقريباً",
  },
  importance: {
    1: "غير مهم بالنسبة لي",
    2: "مهم قليلاً",
    3: "مهم بدرجة متوسطة",
    4: "مهم",
    5: "من أولوياتي الرئيسية",
  },
  preference: {
    1: "نادراً ما يساعدني هذا",
    2: "يساعدني أحياناً",
    3: "محايد",
    4: "يساعدني غالباً",
    5: "يساعدني حقاً على التعلم",
  },
  forced: {
    1: "أ",
    2: "ب",
  },
};

/** Fallback lookup by normalized English label text. */
const LABEL_TEXT_AR: Record<string, string> = {
  "not interested at all": "غير مهتم إطلاقاً",
  "slightly interested": "مهتم قليلاً",
  "somewhat interested": "مهتم إلى حد ما",
  interested: "مهتم",
  "very interested": "مهتم جداً",
  "almost never": "نادراً جداً",
  sometimes: "أحياناً",
  often: "غالباً",
  "very often": "كثيراً",
  "almost always": "دائماً تقريباً",
  "not important to me": "غير مهم بالنسبة لي",
  "slightly important": "مهم قليلاً",
  "moderately important": "مهم بدرجة متوسطة",
  important: "مهم",
  "one of my top priorities": "من أولوياتي الرئيسية",
  "this rarely helps me": "نادراً ما يساعدني هذا",
  "sometimes helps": "يساعدني أحياناً",
  neutral: "محايد",
  "often helps": "يساعدني غالباً",
  "this really helps me learn": "يساعدني حقاً على التعلم",
};

export function translateDiscoveryScaleLabelToArabic(
  scaleId: string,
  value: number,
  enLabel: string,
): string {
  const byScale = SCALE_LABELS_AR[scaleId as ScaleId]?.[value];
  if (byScale) return byScale;

  const normalized = enLabel.trim().toLowerCase();
  return LABEL_TEXT_AR[normalized] ?? enLabel;
}

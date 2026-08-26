/** Static Arabic labels for discovery module categories (no AI / DB translation needed). */

const CATEGORY_LABELS_AR: Record<string, string> = {
  "analytical & problem-solving": "تحليل وحل المشكلات",
  "big-picture": "نظرة شمولية",
  "business & finance": "أعمال وتمويل",
  "business, finance & entrepreneurship": "أعمال وتمويل وريادة",
  "communication & explaining": "تواصل وشرح",
  "creative & communication": "إبداع وتواصل",
  "creative, media & communication": "إبداع وإعلام وتواصل",
  "creativity & ideas": "إبداع وأفكار",
  "deep-focus": "تركيز عميق",
  "detail-focused": "تركيز على التفاصيل",
  "discuss-first": "النقاش أولاً",
  "discussion & seminar-based": "نقاش وندوات",
  "empathy & working with people": "تعاطف والعمل مع الناس",
  "engineering & build": "هندسة وبناء",
  "engineering & the physical world": "الهندسة والعالم المادي",
  explorer: "مستكشف",
  "family pride & recognition": "فخر عائلي وتقدير",
  "fast-momentum": "زخم سريع",
  "feedback & self-management": "ملاحظات وإدارة الذات",
  "financial security": "أمان مالي",
  "freedom-preferring": "تفضيل الحرية",
  "global exposure & challenge": "تعرّض عالمي وتحدّ",
  "group-energized": "طاقة جماعية",
  "health & life sciences": "الصحة وعلوم الحياة",
  "independence & freedom": "استقلالية وحرية",
  "law, policy & society": "قانون وسياسة ومجتمع",
  "leadership & organizing": "قيادة وتنظيم",
  "people, society, policy & education": "الناس والمجتمع والسياسة والتعليم",
  "practical & project-based": "عملي قائم على المشاريع",
  "proven-path": "مسار مُجرّب",
  "reading & independent study": "قراءة ودراسة مستقلة",
  "self-management & independence": "إدارة الذات والاستقلالية",
  "social impact & meaning": "أثر اجتماعي ومعنى",
  "solo-energized": "طاقة فردية",
  "stability & predictability": "استقرار وقابلية للتوقع",
  "structure & exam confidence": "بنية وثقة في الامتحانات",
  "structure-preferring": "تفضيل البنية",
  "technology, ai & data": "التكنولوجيا والذكاء الاصطناعي والبيانات",
  "technology, data & ai": "التكنولوجيا والبيانات والذكاء الاصطناعي",
  "think-first": "التفكير أولاً",
  "visual & example-based": "بصري قائم على الأمثلة",
};

export function translateDiscoveryCategoryToArabic(enCategory: string): string {
  const normalized = enCategory.trim().toLowerCase();
  return CATEGORY_LABELS_AR[normalized] ?? enCategory;
}

export function localizeDiscoveryCategoryName(
  locale: string,
  category: string,
  options?: {
    enCategories?: string[];
    arCategories?: string[];
  },
): string {
  if (locale !== "ar") return category;

  const { enCategories, arCategories } = options ?? {};
  if (enCategories && arCategories) {
    const index = enCategories.indexOf(category);
    if (index >= 0 && arCategories[index]?.trim()) {
      return arCategories[index].trim();
    }
  }

  return translateDiscoveryCategoryToArabic(category);
}

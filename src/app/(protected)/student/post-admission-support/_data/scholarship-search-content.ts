export const SCHOLARSHIP_SEARCH_CONTENT = {
  title: "Scholarship Search",
  summary:
    "Most students stop searching for scholarships once they get accepted. That's a mistake — many scholarships open AFTER acceptance and are less competitive because fewer students apply. We help you find and apply to those.",
  includes: [
    "Personalized scholarship search based on your nationality, university, field, and acceptance status",
    "CPISP, Saudi Vision 2030, UAE national scholarship eligibility check",
    "University-specific bursaries that activate after enrolment",
    "Country-of-study scholarships (UK Chevening, US Fulbright variations)",
    "Application support including essays and recommendation letter coordination",
    "Deadline tracking and reminders",
  ],
  steps: [
    {
      title: "Profile review",
      description:
        "30 minutes. Your nationality, family circumstances, academic background, university acceptance, and field of study. We map you to eligible scholarships.",
    },
    {
      title: "Scholarship shortlist",
      description:
        "Within 7 days, you receive a personalized list of 8-15 active scholarships you qualify for, ranked by likelihood of award and award amount.",
    },
    {
      title: "Application planning",
      description:
        "For each scholarship, we map deadlines, required documents, essay topics, and recommendation letter requirements.",
    },
    {
      title: "Essay support",
      description:
        "For competitive scholarships, advisor support on essay drafts. Most scholarships require 1-3 essays.",
    },
    {
      title: "Submission and tracking",
      description: "We track submission, follow-up, and notification timelines.",
    },
  ],
  partners: [
    "CPISP",
    "GEMS scholarship network",
    "University international offices",
    "Chevening UK",
    "Fulbright Commission",
  ],
  faqs: [
    {
      question: "I've already been accepted — am I too late?",
      answer:
        "Definitely not. Many scholarships open in March-July of the year you start, specifically for already-accepted students. These have lower applicant pools than pre-acceptance scholarships.",
    },
    {
      question: "I'm not 'top of my class' — should I bother?",
      answer:
        "Yes. Need-based scholarships, scholarships tied to specific nationalities, and scholarships for specific fields don't all require top grades. Some require demonstrated commitment to a cause.",
    },
    {
      question: "How many should I apply to?",
      answer:
        "Aim for 5-8 strong applications rather than 20 weak ones. Each scholarship requires real essay work — quality matters more than quantity.",
    },
  ],
  cta: {
    eyebrow: "Get started",
    title: "Book a 30-min advisor session",
    description:
      "We'll walk you through the scholarship search process specific to your situation.",
    buttonLabel: "Book a session",
  },
} as const;

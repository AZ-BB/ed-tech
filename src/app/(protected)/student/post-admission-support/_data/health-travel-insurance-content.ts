export const HEALTH_TRAVEL_INSURANCE_CONTENT = {
  title: "Health & Travel Insurance",
  summary:
    "Most universities require proof of insurance before they'll issue your CAS or I-20. The wrong plan gets rejected; the right one is accepted in minutes. We help you choose plans that meet university requirements and embassy standards.",
  includes: [
    "University-specific insurance requirements review",
    "Plan comparison across student-specialized providers",
    "CAS / I-20 / visa documentation that insurance is in place",
    "Coverage for emergency medical, dental emergency, mental health",
    "Travel insurance for the journey to your university",
    "Annual renewal management while studying",
  ],
  steps: [
    {
      title: "Requirements check",
      description:
        "Each university has specific minimum coverage requirements (US universities especially strict). We verify what your university requires.",
    },
    {
      title: "Plan comparison",
      description:
        "We present 3-5 plans that meet your university requirements, with clear comparison of coverage, exclusions, and price.",
    },
    {
      title: "Application",
      description:
        "We help you complete the insurance application with the correct dates, beneficiary information, and university details.",
    },
    {
      title: "Documentation",
      description:
        "You receive insurance certificates formatted to satisfy your university and embassy requirements. Submitted to university and kept on file.",
    },
    {
      title: "Active management",
      description:
        "If you need to make a claim during your studies, we help you navigate the process. If you need to renew, we handle it.",
    },
  ],
  partners: ["Daman", "Sukoon", "Cigna Global", "IMG Global", "PassportCard"],
  faqs: [
    {
      question: "Doesn't my university provide insurance?",
      answer:
        "US universities typically require their own plan or an equivalent that meets ACA standards. UK universities don't provide insurance — you're covered by NHS but need supplementary cover for things NHS doesn't cover.",
    },
    {
      question: "What about my home country insurance?",
      answer:
        "Home country insurance rarely covers international study and almost never meets US university requirements. Confirm with your provider before relying on it.",
    },
    {
      question: "What if I need to claim while abroad?",
      answer:
        "Choose a provider with 24/7 multi-language support and direct billing relationships with hospitals in your study country. We prioritize these in our recommendations.",
    },
  ],
  cta: {
    eyebrow: "Get started",
    title: "Book a 30-min advisor session",
    description:
      "We'll walk you through the health & travel insurance process specific to your situation.",
    buttonLabel: "Book a session",
  },
} as const;

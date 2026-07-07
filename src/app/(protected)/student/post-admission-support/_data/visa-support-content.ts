export const VISA_SUPPORT_CONTENT = {
  title: "Visa Support",
  summary:
    "Student visas are the single biggest source of stress between acceptance and arrival. We've handled hundreds of applications across the four major destinations and built the process so you don't have to figure it out alone.",
  includes: [
    "Country-specific document checklist tailored to your nationality and program",
    "Financial proof preparation (bank statements, sponsorship letters, scholarship documentation)",
    "CAS / I-20 / Letter of Acceptance review and verification",
    "Application form completion review before submission",
    "Visa interview preparation including mock interviews where required",
    "Real-time tracking of your application status",
  ],
  steps: [
    {
      title: "Initial assessment call",
      description:
        "30 minutes. We confirm your destination country, university, and visa category. You leave with a clear checklist.",
    },
    {
      title: "Document collection",
      description:
        "You gather documents using our checklist. We review each as you submit them and flag anything missing or incorrect before you book the appointment.",
    },
    {
      title: "Application preparation",
      description:
        "We help you complete the visa application form, prepare your statement of purpose where required, and organise supporting documents.",
    },
    {
      title: "Interview prep (if applicable)",
      description:
        "For US F-1 visas, we run a 60-minute mock interview covering likely questions, what officers look for, and red flags to avoid.",
    },
    {
      title: "Submission and tracking",
      description:
        "You submit. We track. If anything comes back requiring response, we draft it with you within 24 hours.",
    },
    {
      title: "Pre-arrival briefing",
      description:
        "Once approved, a final 20-minute call covering port-of-entry expectations, what to carry, and what NOT to say at immigration.",
    },
  ],
  partners: [
    "VFS Global",
    "Embassy advisor network",
    "Educated immigration consultants",
  ],
  faqs: [
    {
      question: "How long before my course start date should I begin?",
      answer:
        "Start at least 12 weeks before. UK and Canada visas typically take 3-6 weeks once submitted. US visas can take longer due to interview wait times.",
    },
    {
      question: "Can you guarantee my visa will be approved?",
      answer:
        "No legitimate provider can guarantee approval — that decision is made by the embassy. What we can do is dramatically reduce the chance of refusal due to documentation or interview errors.",
    },
    {
      question: "What happens if my visa is refused?",
      answer:
        "We help you understand the refusal reason, address it, and reapply. There's no additional fee for one reapplication within 90 days.",
    },
  ],
  cta: {
    eyebrow: "Get started",
    title: "Book a 30-min advisor session",
    description:
      "We'll walk you through the visa support process specific to your situation.",
    buttonLabel: "Book a session",
  },
} as const;

export const TUITION_PAYMENT_CONTENT = {
  title: "Tuition Payment",
  summary:
    "Sending tuition through your bank can cost 3-5% in hidden FX markups — that's AED 6,000+ on a typical UK tuition bill. We help you use FX-optimized international payment platforms designed for student tuition.",
  includes: [
    "Comparison of payment routes across Flywire, Wise, PayMyTuition, and direct wire",
    "Real-time FX rate monitoring",
    "University-accepted payment confirmation",
    "Transaction tracking until receipt confirmation",
    "Multi-payer support (parent abroad, family in different country, scholarship payer)",
    "Tax documentation for tuition payments where required",
  ],
  steps: [
    {
      title: "Account setup",
      description:
        "30-minute call. We verify your university, the tuition amount, and the deadline. Set up accounts with the right payment platform.",
    },
    {
      title: "Payer onboarding",
      description:
        "If a parent or family member is paying, we onboard them too. Verify identity, link bank accounts, set sending limits.",
    },
    {
      title: "Rate monitoring",
      description:
        "Tuition is often paid in tranches. We watch FX rates and notify you when it's optimal to send each tranche.",
    },
    {
      title: "Send and track",
      description:
        "You initiate the transfer. We monitor delivery. Most transfers reach the university within 2-3 business days.",
    },
    {
      title: "Receipt confirmation",
      description:
        "We confirm the university has marked your payment as received and your enrolment status is active.",
    },
  ],
  partners: [
    "Flywire",
    "Wise Business",
    "PayMyTuition",
    "Convera (formerly Western Union Business)",
  ],
  faqs: [
    {
      question: "Why not just use my bank?",
      answer:
        "Banks add a hidden FX markup of 2.5-4% on top of the published rate. On AED 200,000 tuition, that's AED 5,000-8,000 you're losing. Specialized providers charge 0.5-1.5%.",
    },
    {
      question: "Is it safe to use platforms like Flywire?",
      answer:
        "Yes. These are the platforms universities themselves recommend — your university likely has a Flywire portal already integrated.",
    },
    {
      question: "Can someone else pay my tuition from a different country?",
      answer:
        "Yes, this is standard. We help you set up multi-payer flows where, say, your father in Saudi Arabia and uncle in the UK can both contribute.",
    },
  ],
  cta: {
    eyebrow: "Get started",
    title: "Book a 30-min advisor session",
    description:
      "We'll walk you through the tuition payment process specific to your situation.",
    buttonLabel: "Book a session",
  },
} as const;

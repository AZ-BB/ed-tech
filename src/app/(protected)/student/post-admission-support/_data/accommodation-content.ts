export const ACCOMMODATION_CONTENT = {
  title: "Accommodation",
  summary:
    "University housing fills up fast and the wrong choice can ruin your first year. We help you secure verified accommodation that fits your budget, location preference, and lifestyle — before the desperate-search panic begins.",
  includes: [
    "University residence application support (where eligible)",
    "Private halls comparison across UNITE, iQ, Vita Student, and similar providers",
    "Shared flat search with vetted landlords in your university city",
    "Lease and deposit review before you sign anything",
    "Currency-aware payment guidance for UK/US/Canada landlords",
    "On-arrival check-in support if you need it",
  ],
  steps: [
    {
      title: "Preferences call",
      description:
        "30-minute call to understand your budget, distance preference from campus, room type (en-suite vs shared), and whether you want catered or self-catered.",
    },
    {
      title: "Curated shortlist",
      description:
        "Within 5 days you get a shortlist of 5-8 verified options matching your criteria, with photos, pricing, contracts, and our notes on each.",
    },
    {
      title: "Application support",
      description:
        "We help you complete each application correctly, prepare guarantor documents (UK halls require this), and submit before the booking deadline.",
    },
    {
      title: "Lease review",
      description:
        "Before you sign anything, our team reviews the contract. We flag unfair terms, hidden fees, and break clauses.",
    },
    {
      title: "Booking confirmation",
      description:
        "Payment guidance — we ensure your deposit goes to a legitimate provider, not a scam listing.",
    },
    {
      title: "Move-in support",
      description:
        "Optional check-in concierge for your first day. Inventory check, key collection, room condition documentation.",
    },
  ],
  partners: [
    "UNITE Students",
    "iQ Student Accommodation",
    "Vita Student",
    "Host Student Housing",
    "University residence offices",
  ],
  faqs: [
    {
      question: "How early should I start the housing search?",
      answer:
        "For UK universities, start as soon as you have a firm offer — popular halls are full by April for September entry. US universities, start at deposit confirmation.",
    },
    {
      question: "Should I choose university halls or private?",
      answer:
        "University halls are usually cheaper and easier for international students because they handle utilities and contracts. Private halls offer more amenities but cost 20-40% more.",
    },
    {
      question: "What about shared flats with other students?",
      answer:
        "Best for second year onwards. For your first year, halls help you meet people and remove the stress of utility bills, contracts, and finding flatmates.",
    },
  ],
  cta: {
    eyebrow: "Get started",
    title: "Book a 30-min advisor session",
    description:
      "We'll walk you through the accommodation process specific to your situation.",
    buttonLabel: "Book a session",
  },
} as const;

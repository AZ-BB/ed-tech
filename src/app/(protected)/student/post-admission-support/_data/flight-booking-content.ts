export const FLIGHT_BOOKING_CONTENT = {
  title: "Flight Booking",
  summary:
    "Student fares are real but airlines hide them. We work with travel partners who specialize in student tickets — meaning extra baggage included, flexible date changes, and 10-20% lower fares than what you see on Skyscanner.",
  includes: [
    "Student fare access across major airlines (Emirates, BA, Qatar, Etihad, Lufthansa)",
    "Extra baggage allowance included (40-46kg vs standard 23kg)",
    "Flexible date changes if your visa is delayed",
    "Stopover and multi-city options",
    "Group student fares for cohorts traveling together",
    "Family visit discounts for parents visiting during semester",
  ],
  steps: [
    {
      title: "Quick consultation",
      description:
        "15 minutes. We confirm your origin, destination, ideal dates, baggage needs, and any flexibility constraints.",
    },
    {
      title: "Quote within 24 hours",
      description:
        "You receive 3-5 options with student-fare pricing, baggage allowance, change policies, and total cost in AED.",
    },
    {
      title: "Booking",
      description: "Once you confirm, we book directly. Payment in AED via card or transfer.",
    },
    {
      title: "Pre-flight reminders",
      description:
        "72 hours before flight: reminder of check-in opening, baggage rules, and any visa documentation needed at airport.",
    },
    {
      title: "Disruption support",
      description:
        "If your flight is delayed, cancelled, or your visa is delayed, we help rebook at no change fee.",
    },
  ],
  partners: [
    "STA Travel",
    "Student Universe",
    "Direct airline partnerships",
    "Dnata Travel",
  ],
  faqs: [
    {
      question: "Why not just book on Skyscanner?",
      answer:
        "Skyscanner shows public fares. Student fares require travel agency relationships with airlines. Same flight, lower price, more baggage.",
    },
    {
      question: "What if my flight is cancelled?",
      answer:
        "With student fares we book, you typically get free re-routing. Public fares often charge change fees. This is one of the main reasons to book through a student specialist.",
    },
    {
      question: "Can my parents book a flight to visit me?",
      answer:
        "Yes. We offer family visit fares from MENA to most major university cities at student-equivalent rates.",
    },
  ],
  cta: {
    eyebrow: "Get started",
    title: "Book a 30-min advisor session",
    description:
      "We'll walk you through the flight booking process specific to your situation.",
    buttonLabel: "Book a session",
  },
} as const;

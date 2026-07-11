export const postAdmissionSupportEn = {
  landing: {
    checklistItems: [
      "Apply for your visa",
      "Secure accommodation",
      "Send tuition payment",
      "Find late scholarships",
      "Sort out insurance",
      "Book your flight",
    ],
    heroTitleBeforeEmphasis: "From offer letter",
    heroTitleEmphasis: "to your first day",
    heroSubtitle:
      "Six things stand between acceptance and the first lecture - visa, housing, tuition, scholarships, insurance, and flights. We'll get you through each one.",
    talkToAdvisor: "Talk to an advisor",
    starting: "Starting...",
    browseServices: "Browse services",
    schedulingUnavailable:
      "Scheduling is temporarily unavailable. Please try again later.",
    previewBadge: "What you'll do",
    previewLabel: "Your checklist",
    servicesTitle: "Your services",
    servicesMeta: "Tap any service for full details",
    learnMore: "Learn more",
    helpTitle: "Not sure where to start?",
    helpSubtitle:
      "Book a 30-minute session with an advisor and we'll walk you through which services make sense for your situation.",
    bookSession: "Book a session",
    genericServiceLabel: "Post-admission support",
  },
  detail: {
    breadcrumb: "Post-Admission Support",
    eyebrow: "Post-Admission Service",
    includedTitle: "What's included",
    howItWorksTitle: "How it works",
    partnersTitle: "Trusted partners",
    faqTitle: "Frequently asked",
    starting: "Starting...",
    schedulingUnavailable:
      "Scheduling is temporarily unavailable. Please try again later.",
  },
  modal: {
    title: "Book {service} session",
    alreadyScheduledTitle: "Session already booked",
    alreadyScheduledMessage:
      "You already have a post-admission session scheduled for {date}.",
    alreadyScheduledClose: "Got it",
    closeAria: "Close booking modal",
    loading: "Loading calendar...",
  },
  serviceSelection: {
    title: "What do you need help with?",
    subtitle: "Choose the service you'd like to discuss with your advisor.",
    serviceLabel: "Service",
    servicePlaceholder: "Select a service",
    otherLabel: "Tell us more",
    otherPlaceholder: "Describe what you need help with...",
    continue: "Continue to scheduling",
    continuing: "Starting...",
    cancel: "Cancel",
    closeAria: "Close service selection",
    errors: {
      serviceRequired: "Please select a service.",
      otherRequired: "Please describe the service you need.",
    },
    otherOption: "Other",
  },
  services: {
    visaSupport: {
      slug: "visa-support",
      href: "/student/post-admission-support/visa-support",
      title: "Visa Support",
      desc: "Step-by-step help with student visa applications for the UK, US, Canada, and Australia.",
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
            "No legitimate provider can guarantee approval - that decision is made by the embassy. What we can do is dramatically reduce the chance of refusal due to documentation or interview errors.",
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
    },
    accommodation: {
      slug: "accommodation",
      href: "/student/post-admission-support/accommodation",
      title: "Accommodation",
      desc: "Find safe, verified student housing near your university with trusted partners.",
      summary:
        "University housing fills up fast and the wrong choice can ruin your first year. We help you secure verified accommodation that fits your budget, location preference, and lifestyle - before the desperate-search panic begins.",
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
            "Payment guidance - we ensure your deposit goes to a legitimate provider, not a scam listing.",
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
            "For UK universities, start as soon as you have a firm offer - popular halls are full by April for September entry. US universities, start at deposit confirmation.",
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
    },
    tuitionPayment: {
      slug: "tuition-payment",
      href: "/student/post-admission-support/tuition-payment",
      title: "Tuition Payment",
      desc: "Send tuition securely from MENA to any university worldwide with low FX fees.",
      summary:
        "Sending tuition through your bank can cost 3-5% in hidden FX markups - that's AED 6,000+ on a typical UK tuition bill. We help you use FX-optimized international payment platforms designed for student tuition.",
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
            "Yes. These are the platforms universities themselves recommend - your university likely has a Flywire portal already integrated.",
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
    },
    scholarshipSearch: {
      slug: "scholarship-search",
      href: "/student/post-admission-support/scholarship-search",
      title: "Scholarship Search",
      desc: "Discover scholarships you still qualify for, filtered by your nationality and field.",
      summary:
        "Most students stop searching for scholarships once they get accepted. That's a mistake - many scholarships open AFTER acceptance and are less competitive because fewer students apply. We help you find and apply to those.",
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
          description:
            "We track submission, follow-up, and notification timelines.",
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
          question: "I've already been accepted - am I too late?",
          answer:
            "Definitely not. Many scholarships open in March-July of the year you start, specifically for already-accepted students. These have lower applicant pools than pre-acceptance scholarships.",
        },
        {
          question: "I'm not 'top of my class' - should I bother?",
          answer:
            "Yes. Need-based scholarships, scholarships tied to specific nationalities, and scholarships for specific fields don't all require top grades. Some require demonstrated commitment to a cause.",
        },
        {
          question: "How many should I apply to?",
          answer:
            "Aim for 5-8 strong applications rather than 20 weak ones. Each scholarship requires real essay work - quality matters more than quantity.",
        },
      ],
      cta: {
        eyebrow: "Get started",
        title: "Book a 30-min advisor session",
        description:
          "We'll walk you through the scholarship search process specific to your situation.",
        buttonLabel: "Book a session",
      },
    },
    healthTravelInsurance: {
      slug: "health-travel-insurance",
      href: "/student/post-admission-support/health-travel-insurance",
      title: "Health & Travel Insurance",
      desc: "Student-specific insurance plans accepted by your university.",
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
      partners: [
        "Daman",
        "Sukoon",
        "Cigna Global",
        "IMG Global",
        "PassportCard",
      ],
      faqs: [
        {
          question: "Doesn't my university provide insurance?",
          answer:
            "US universities typically require their own plan or an equivalent that meets ACA standards. UK universities don't provide insurance - you're covered by NHS but need supplementary cover for things NHS doesn't cover.",
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
    },
    flightBooking: {
      slug: "flight-booking",
      href: "/student/post-admission-support/flight-booking",
      title: "Flight Booking",
      desc: "Discounted student fares and flexible tickets through our travel partners.",
      summary:
        "Student fares are real but airlines hide them. We work with travel partners who specialize in student tickets - meaning extra baggage included, flexible date changes, and 10-20% lower fares than what you see on Skyscanner.",
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
          description:
            "Once you confirm, we book directly. Payment in AED via card or transfer.",
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
    },
  },
} as const;

// /**
//  * Exports bilingual (en/ar) JSON files for each public marketing page.
//  * Run: node --experimental-strip-types scripts/export-public-page-content.ts
//  */

// import { mkdirSync, writeFileSync } from "node:fs";
// import { join } from "node:path";

// import { ar } from "../src/lib/i18n/dictionaries/ar.ts";
// import { en } from "../src/lib/i18n/dictionaries/en.ts";

// const OUT_DIR = join(process.cwd(), "content-review");

// type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// function toBilingual(enVal: unknown, arVal: unknown): JsonValue {
//   if (
//     typeof enVal === "string" ||
//     typeof enVal === "number" ||
//     typeof enVal === "boolean" ||
//     enVal === null ||
//     enVal === undefined
//   ) {
//     return { en: enVal ?? null, ar: arVal ?? null };
//   }

//   if (Array.isArray(enVal) && Array.isArray(arVal)) {
//     return enVal.map((item, i) => toBilingual(item, arVal[i]));
//   }

//   if (
//     typeof enVal === "object" &&
//     enVal !== null &&
//     typeof arVal === "object" &&
//     arVal !== null
//   ) {
//     const result: Record<string, JsonValue> = {};
//     for (const key of Object.keys(enVal as object)) {
//       result[key] = toBilingual(
//         (enVal as Record<string, unknown>)[key],
//         (arVal as Record<string, unknown>)[key],
//       );
//     }
//     return result;
//   }

//   return { en: enVal as JsonValue, ar: arVal as JsonValue };
// }

// function sharedShell() {
//   return {
//     header: {
//       brand: toBilingual(en.common.brand, ar.common.brand),
//       navigation: toBilingual(en.nav, ar.nav),
//       languageSwitcher: {
//         label: toBilingual(en.common.language, ar.common.language),
//         english: toBilingual(en.common.english, ar.common.english),
//         arabic: toBilingual(en.common.arabic, ar.common.arabic),
//       },
//     },
//     footer: toBilingual(en.footer, ar.footer),
//   };
// }

// function writePage(filename: string, payload: Record<string, unknown>) {
//   const path = join(OUT_DIR, filename);
//   writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
//   console.log(`Wrote ${path}`);
// }

// mkdirSync(OUT_DIR, { recursive: true });

// const generatedAt = new Date().toISOString().split("T")[0];

// writePage("home.json", {
//   page: "Home",
//   route: "/",
//   generatedAt,
//   note: "Landing page for students. Header and footer appear on all public pages.",
//   ...sharedShell(),
//   metadata: {
//     title: toBilingual("Univeera — University guidance for MENA students", "يونيفيرا — إرشاد جامعي لطلاب الشرق الأوسط"),
//   },
//   sections: {
//     hero: {
//       badge: toBilingual(en.home.heroBadge, ar.home.heroBadge),
//       title: toBilingual(en.home.heroTitle, ar.home.heroTitle),
//       titleEmphasis: toBilingual(en.home.heroTitleEm, ar.home.heroTitleEm),
//       subtitle: toBilingual(en.home.heroSub, ar.home.heroSub),
//       cta: toBilingual(en.nav.startJourney, ar.nav.startJourney),
//     },
//     howItWorks: {
//       label: toBilingual(en.home.howItWorksLabel, ar.home.howItWorksLabel),
//       title: toBilingual(en.home.howItWorksTitle, ar.home.howItWorksTitle),
//       subtitle: toBilingual(en.home.howItWorksSub, ar.home.howItWorksSub),
//       steps: toBilingual(en.home.steps, ar.home.steps),
//     },
//     features: {
//       label: toBilingual(en.home.featuresLabel, ar.home.featuresLabel),
//       title: toBilingual(en.home.featuresTitle, ar.home.featuresTitle),
//       subtitle: toBilingual(en.home.featuresSub, ar.home.featuresSub),
//       items: toBilingual(en.home.features, ar.home.features),
//     },
//     socialProof: {
//       label: toBilingual(en.home.proofLabel, ar.home.proofLabel),
//       title: toBilingual(en.home.proofTitle, ar.home.proofTitle),
//       stats: toBilingual(en.home.proofStats, ar.home.proofStats),
//     },
//     testimonials: {
//       label: toBilingual(en.home.testiLabel, ar.home.testiLabel),
//       title: toBilingual(en.home.testiTitle, ar.home.testiTitle),
//       items: toBilingual(en.home.testimonials, ar.home.testimonials),
//     },
//     mission: {
//       label: toBilingual(en.home.missionLabel, ar.home.missionLabel),
//       title: toBilingual(en.home.missionTitle, ar.home.missionTitle),
//       description: toBilingual(en.home.missionDesc, ar.home.missionDesc),
//     },
//     faq: {
//       label: toBilingual(en.home.faqLabel, ar.home.faqLabel),
//       title: toBilingual(en.home.faqTitle, ar.home.faqTitle),
//       items: toBilingual(en.home.faqItems, ar.home.faqItems),
//     },
//     cta: {
//       title: toBilingual(en.home.ctaTitle, ar.home.ctaTitle),
//       subtitle: toBilingual(en.home.ctaSub, ar.home.ctaSub),
//       signUp: toBilingual(en.home.signUp, ar.home.signUp),
//     },
//   },
// });

// writePage("about.json", {
//   page: "About",
//   route: "/about",
//   generatedAt,
//   ...sharedShell(),
//   metadata: {
//     title: toBilingual(en.about.metadataTitle, ar.about.metadataTitle),
//     description: toBilingual(en.about.metadataDescription, ar.about.metadataDescription),
//   },
//   sections: {
//     hero: {
//       badge: toBilingual(en.about.heroBadge, ar.about.heroBadge),
//       title: {
//         start: toBilingual(en.about.heroTitleStart, ar.about.heroTitleStart),
//         confusion: toBilingual(en.about.heroEmConfusion, ar.about.heroEmConfusion),
//         to1: toBilingual(en.about.heroTitleTo1, ar.about.heroTitleTo1),
//         clarity: toBilingual(en.about.heroEmClarity, ar.about.heroEmClarity),
//         to2: toBilingual(en.about.heroTitleTo2, ar.about.heroTitleTo2),
//         confidence: toBilingual(en.about.heroEmConfidence, ar.about.heroEmConfidence),
//       },
//       subtitle: toBilingual(en.about.heroSub, ar.about.heroSub),
//       journey: toBilingual(en.about.journey, ar.about.journey),
//     },
//     advisoryBoard: {
//       label: toBilingual(en.about.advisorsLabel, ar.about.advisorsLabel),
//       title: {
//         before: toBilingual(en.about.advisorsTitleBefore, ar.about.advisorsTitleBefore),
//         emphasis: toBilingual(en.about.advisorsTitleEm, ar.about.advisorsTitleEm),
//         after: toBilingual(en.about.advisorsTitleAfter, ar.about.advisorsTitleAfter),
//       },
//       description: toBilingual(en.about.advisorsDesc, ar.about.advisorsDesc),
//       moreLabel: toBilingual(en.about.advisorMore, ar.about.advisorMore),
//       growingLabel: toBilingual(en.about.advisorGrowing, ar.about.advisorGrowing),
//       advisors: [
//         "James T.",
//         "Ahmed M.",
//         "Rana J.",
//         "Nadia H.",
//         "Sarah K.",
//         "Omar B.",
//       ].map((name) => ({ name: { en: name, ar: name } })),
//     },
//     missionQuote: {
//       before: toBilingual(en.about.missionQuoteBefore, ar.about.missionQuoteBefore),
//       clarity: toBilingual(en.about.missionQuoteEmClarity, ar.about.missionQuoteEmClarity),
//       mid: toBilingual(en.about.missionQuoteMid, ar.about.missionQuoteMid),
//       confusion: toBilingual(en.about.missionQuoteEmConfusion, ar.about.missionQuoteEmConfusion),
//       after: toBilingual(en.about.missionQuoteAfter, ar.about.missionQuoteAfter),
//     },
//     problem: {
//       label: toBilingual(en.about.problemLabel, ar.about.problemLabel),
//       title: {
//         before: toBilingual(en.about.problemTitleBefore, ar.about.problemTitleBefore),
//         emphasis: toBilingual(en.about.problemTitleEm, ar.about.problemTitleEm),
//         after: toBilingual(en.about.problemTitleAfter, ar.about.problemTitleAfter),
//       },
//       description: toBilingual(en.about.problemDesc, ar.about.problemDesc),
//       items: toBilingual(en.about.problems, ar.about.problems),
//     },
//     beliefs: {
//       label: toBilingual(en.about.beliefsLabel, ar.about.beliefsLabel),
//       title: {
//         before: toBilingual(en.about.beliefsTitleBefore, ar.about.beliefsTitleBefore),
//         emphasis: toBilingual(en.about.beliefsTitleEm, ar.about.beliefsTitleEm),
//         after: toBilingual(en.about.beliefsTitleAfter, ar.about.beliefsTitleAfter),
//       },
//       description: toBilingual(en.about.beliefsDesc, ar.about.beliefsDesc),
//       cards: toBilingual(en.about.beliefCards, ar.about.beliefCards),
//     },
//     platform: {
//       label: toBilingual(en.about.platformLabel, ar.about.platformLabel),
//       title: {
//         before: toBilingual(en.about.platformTitleBefore, ar.about.platformTitleBefore),
//         emphasis1: toBilingual(en.about.platformTitleEm1, ar.about.platformTitleEm1),
//         mid: toBilingual(en.about.platformTitleMid, ar.about.platformTitleMid),
//         emphasis2: toBilingual(en.about.platformTitleEm2, ar.about.platformTitleEm2),
//         after: toBilingual(en.about.platformTitleAfter, ar.about.platformTitleAfter),
//       },
//       description: toBilingual(en.about.platformDesc, ar.about.platformDesc),
//       steps: toBilingual(en.about.steps, ar.about.steps),
//     },
//     missionVision: {
//       label: toBilingual(en.about.mvLabel, ar.about.mvLabel),
//       title: toBilingual(en.about.mvTitle, ar.about.mvTitle),
//       titleEmphasis: toBilingual(en.about.mvTitleEm, ar.about.mvTitleEm),
//       description: toBilingual(en.about.mvDesc, ar.about.mvDesc),
//       mission: {
//         label: toBilingual(en.about.missionLabel, ar.about.missionLabel),
//         title: {
//           before: toBilingual(en.about.missionTitleBefore, ar.about.missionTitleBefore),
//           emphasis: toBilingual(en.about.missionTitleEm, ar.about.missionTitleEm),
//           after: toBilingual(en.about.missionTitleAfter, ar.about.missionTitleAfter),
//         },
//         text: toBilingual(en.about.missionText, ar.about.missionText),
//       },
//       vision: {
//         label: toBilingual(en.about.visionLabel, ar.about.visionLabel),
//         title: {
//           before: toBilingual(en.about.visionTitleBefore, ar.about.visionTitleBefore),
//           emphasis: toBilingual(en.about.visionTitleEm, ar.about.visionTitleEm),
//           after: toBilingual(en.about.visionTitleAfter, ar.about.visionTitleAfter),
//         },
//         text: toBilingual(en.about.visionText, ar.about.visionText),
//       },
//     },
//     region: {
//       label: toBilingual(en.about.regionLabel, ar.about.regionLabel),
//       title: toBilingual(en.about.regionTitle, ar.about.regionTitle),
//       titleEmphasis: toBilingual(en.about.regionTitleEm, ar.about.regionTitleEm),
//       description1: toBilingual(en.about.regionDesc1, ar.about.regionDesc1),
//       description2: toBilingual(en.about.regionDesc2, ar.about.regionDesc2),
//       list: toBilingual(en.about.regionList, ar.about.regionList),
//       visual: {
//         title: toBilingual(en.about.regionVisualTitle, ar.about.regionVisualTitle),
//         subtitle: toBilingual(en.about.regionVisualSubtitle, ar.about.regionVisualSubtitle),
//         statusActive: toBilingual(en.about.statusActive, ar.about.statusActive),
//         statusExpanding: toBilingual(en.about.statusExpanding, ar.about.statusExpanding),
//         countries: [
//           { flag: "🇦🇪", name: { en: "UAE", ar: "الإمارات" }, status: "active" },
//           { flag: "🇸🇦", name: { en: "Saudi Arabia", ar: "السعودية" }, status: "active" },
//           { flag: "🇧🇭", name: { en: "Bahrain", ar: "البحرين" }, status: "active" },
//           { flag: "🇶🇦", name: { en: "Qatar", ar: "قطر" }, status: "active" },
//           { flag: "🇰🇼", name: { en: "Kuwait", ar: "الكويت" }, status: "active" },
//           { flag: "🇯🇴", name: { en: "Jordan", ar: "الأردن" }, status: "active" },
//           { flag: "🇴🇲", name: { en: "Oman", ar: "عُمان" }, status: "expanding" },
//           { flag: "🇪🇬", name: { en: "Egypt", ar: "مصر" }, status: "expanding" },
//         ],
//       },
//     },
//     cta: {
//       title: {
//         before: toBilingual(en.about.ctaTitleBefore, ar.about.ctaTitleBefore),
//         emphasis: toBilingual(en.about.ctaTitleEm, ar.about.ctaTitleEm),
//         after: toBilingual(en.about.ctaTitleAfter, ar.about.ctaTitleAfter),
//       },
//       description: toBilingual(en.about.ctaDesc, ar.about.ctaDesc),
//       button: toBilingual(en.about.ctaButton, ar.about.ctaButton),
//     },
//   },
// });

// writePage("contact.json", {
//   page: "Contact",
//   route: "/contact",
//   generatedAt,
//   ...sharedShell(),
//   sections: {
//     hero: {
//       title: toBilingual(en.contact.title, ar.contact.title),
//       subtitle: toBilingual(en.contact.subtitle, ar.contact.subtitle),
//       reachUs: toBilingual(en.contact.reachUs, ar.contact.reachUs),
//       responseTime: toBilingual(en.contact.responseTime, ar.contact.responseTime),
//       email: { en: "admin@univeera.me", ar: "admin@univeera.me" },
//     },
//     form: toBilingual(en.contact, ar.contact),
//   },
// });

// writePage("blog.json", {
//   page: "Blog",
//   route: "/blog",
//   generatedAt,
//   ...sharedShell(),
//   sections: {
//     hero: {
//       title: toBilingual(en.blog.title, ar.blog.title),
//       subtitle: toBilingual(en.blog.subtitle, ar.blog.subtitle),
//     },
//     comingSoon: {
//       label: toBilingual(en.blog.comingSoon, ar.blog.comingSoon),
//       backHome: toBilingual(en.blog.backHome, ar.blog.backHome),
//     },
//   },
// });

// writePage("for-schools.json", {
//   page: "For Schools",
//   route: "/for-schools",
//   generatedAt,
//   note: "Demo UI mock data (student names, university names, stats) is English-only and not localized.",
//   ...sharedShell(),
//   metadata: {
//     title: toBilingual(en.forSchools.metadataTitle, ar.forSchools.metadataTitle),
//     description: toBilingual(en.forSchools.metadataDescription, ar.forSchools.metadataDescription),
//   },
//   sections: {
//     hero: {
//       badge: toBilingual(en.forSchools.heroBadge, ar.forSchools.heroBadge),
//       title: {
//         before: toBilingual(en.forSchools.heroTitleBefore, ar.forSchools.heroTitleBefore),
//         emphasis: toBilingual(en.forSchools.heroTitleEm, ar.forSchools.heroTitleEm),
//       },
//       subtitle: toBilingual(en.forSchools.heroSub, ar.forSchools.heroSub),
//       bookDemo: toBilingual(en.forSchools.bookDemo, ar.forSchools.bookDemo),
//       seeWhatsIncluded: toBilingual(en.forSchools.seeWhatsIncluded, ar.forSchools.seeWhatsIncluded),
//       demoPreview: {
//         note: {
//           en: "Illustrative dashboard preview — not live data",
//           ar: "معاينة توضيحية للوحة التحكم — ليست بيانات حية",
//         },
//         counsellorOverview: toBilingual(en.forSchools.counsellorOverview, ar.forSchools.counsellorOverview),
//         live: toBilingual(en.forSchools.live, ar.forSchools.live),
//         kpis: toBilingual(
//           {
//             onboarded: en.forSchools.kpiOnboarded,
//             discovery: en.forSchools.kpiDiscovery,
//             sessions: en.forSchools.kpiSessions,
//           },
//           {
//             onboarded: ar.forSchools.kpiOnboarded,
//             discovery: ar.forSchools.kpiDiscovery,
//             sessions: ar.forSchools.kpiSessions,
//           },
//         ),
//         studentsInProgress: toBilingual(en.forSchools.studentsInProgress, ar.forSchools.studentsInProgress),
//         viewAll: toBilingual(en.forSchools.viewAll, ar.forSchools.viewAll),
//         sampleStudents: [
//           { name: { en: "Sara H.", ar: "Sara H." }, stage: { en: "Applications · Y13", ar: "Applications · Y13" } },
//           { name: { en: "Omar K.", ar: "Omar K." }, stage: { en: "Discovery · Y12", ar: "Discovery · Y12" } },
//           { name: { en: "Layla A.", ar: "Layla A." }, stage: { en: "Exploring · Y12", ar: "Exploring · Y12" } },
//         ],
//         recentActivity: toBilingual(en.forSchools.recentActivity, ar.forSchools.recentActivity),
//       },
//     },
//     unlock: {
//       label: toBilingual(en.forSchools.unlockLabel, ar.forSchools.unlockLabel),
//       title: {
//         before: toBilingual(en.forSchools.unlockTitleBefore, ar.forSchools.unlockTitleBefore),
//         emphasis: toBilingual(en.forSchools.unlockTitleEm, ar.forSchools.unlockTitleEm),
//       },
//       description: toBilingual(en.forSchools.unlockDesc, ar.forSchools.unlockDesc),
//       features: toBilingual(
//         {
//           commandCentre: { title: en.forSchools.commandCentreTitle, desc: en.forSchools.commandCentreDesc },
//           matching: { title: en.forSchools.matchingTitle, desc: en.forSchools.matchingDesc },
//           essayReview: { title: en.forSchools.essayReviewTitle, desc: en.forSchools.essayReviewDesc },
//           advisorSessions: { title: en.forSchools.advisorSessionsTitle, desc: en.forSchools.advisorSessionsDesc },
//           ambassador: { title: en.forSchools.ambassadorTitle, desc: en.forSchools.ambassadorDesc },
//           applicationSupport: { title: en.forSchools.applicationSupportTitle, desc: en.forSchools.applicationSupportDesc },
//           discoveryJourney: { title: en.forSchools.discoveryJourneyTitle, desc: en.forSchools.discoveryJourneyDesc },
//           scholarship: { title: en.forSchools.scholarshipTitle, desc: en.forSchools.scholarshipDesc },
//         },
//         {
//           commandCentre: { title: ar.forSchools.commandCentreTitle, desc: ar.forSchools.commandCentreDesc },
//           matching: { title: ar.forSchools.matchingTitle, desc: ar.forSchools.matchingDesc },
//           essayReview: { title: ar.forSchools.essayReviewTitle, desc: ar.forSchools.essayReviewDesc },
//           advisorSessions: { title: ar.forSchools.advisorSessionsTitle, desc: ar.forSchools.advisorSessionsDesc },
//           ambassador: { title: ar.forSchools.ambassadorTitle, desc: ar.forSchools.ambassadorDesc },
//           applicationSupport: { title: ar.forSchools.applicationSupportTitle, desc: ar.forSchools.applicationSupportDesc },
//           discoveryJourney: { title: ar.forSchools.discoveryJourneyTitle, desc: ar.forSchools.discoveryJourneyDesc },
//           scholarship: { title: ar.forSchools.scholarshipTitle, desc: ar.forSchools.scholarshipDesc },
//         },
//       ),
//     },
//     beyondAdmission: {
//       exclusiveBadge: toBilingual(en.forSchools.exclusiveBadge, ar.forSchools.exclusiveBadge),
//       title: {
//         before: toBilingual(en.forSchools.beyondAdmissionTitleBefore, ar.forSchools.beyondAdmissionTitleBefore),
//         emphasis: toBilingual(en.forSchools.beyondAdmissionTitleEm, ar.forSchools.beyondAdmissionTitleEm),
//       },
//       description: toBilingual(en.forSchools.beyondAdmissionDesc, ar.forSchools.beyondAdmissionDesc),
//       chips: toBilingual(en.forSchools.postAdmissionChips, ar.forSchools.postAdmissionChips),
//       additionalFeatures: toBilingual(
//         {
//           webinars: { title: en.forSchools.webinarsTitle, desc: en.forSchools.webinarsDesc },
//           bulkOnboarding: { title: en.forSchools.bulkOnboardingTitle, desc: en.forSchools.bulkOnboardingDesc },
//           monthlyReports: { title: en.forSchools.monthlyReportsTitle, desc: en.forSchools.monthlyReportsDesc },
//         },
//         {
//           webinars: { title: ar.forSchools.webinarsTitle, desc: ar.forSchools.webinarsDesc },
//           bulkOnboarding: { title: ar.forSchools.bulkOnboardingTitle, desc: ar.forSchools.bulkOnboardingDesc },
//           monthlyReports: { title: ar.forSchools.monthlyReportsTitle, desc: ar.forSchools.monthlyReportsDesc },
//         },
//       ),
//     },
//     howItWorks: {
//       label: toBilingual(en.forSchools.howItWorksLabel, ar.forSchools.howItWorksLabel),
//       title: {
//         before: toBilingual(en.forSchools.howItWorksTitleBefore, ar.forSchools.howItWorksTitleBefore),
//         emphasis1: toBilingual(en.forSchools.howItWorksTitleEm1, ar.forSchools.howItWorksTitleEm1),
//         mid: toBilingual(en.forSchools.howItWorksTitleMid, ar.forSchools.howItWorksTitleMid),
//         emphasis2: toBilingual(en.forSchools.howItWorksTitleEm2, ar.forSchools.howItWorksTitleEm2),
//       },
//       description: toBilingual(en.forSchools.howItWorksDesc, ar.forSchools.howItWorksDesc),
//       steps: toBilingual(en.forSchools.journeySteps, ar.forSchools.journeySteps),
//     },
//     wholeSchool: {
//       label: toBilingual(en.forSchools.wholeSchoolLabel, ar.forSchools.wholeSchoolLabel),
//       title: {
//         before: toBilingual(en.forSchools.wholeSchoolTitleBefore, ar.forSchools.wholeSchoolTitleBefore),
//         emphasis1: toBilingual(en.forSchools.wholeSchoolTitleEm1, ar.forSchools.wholeSchoolTitleEm1),
//         mid: toBilingual(en.forSchools.wholeSchoolTitleMid, ar.forSchools.wholeSchoolTitleMid),
//         emphasis2: toBilingual(en.forSchools.wholeSchoolTitleEm2, ar.forSchools.wholeSchoolTitleEm2),
//       },
//       description: toBilingual(en.forSchools.wholeSchoolDesc, ar.forSchools.wholeSchoolDesc),
//       forCounsellors: {
//         label: toBilingual(en.forSchools.forCounsellorsLabel, ar.forSchools.forCounsellorsLabel),
//         title: toBilingual(en.forSchools.forCounsellorsTitle, ar.forSchools.forCounsellorsTitle),
//         description: toBilingual(en.forSchools.forCounsellorsDesc, ar.forSchools.forCounsellorsDesc),
//         points: toBilingual(en.forSchools.counsellorPoints, ar.forSchools.counsellorPoints),
//       },
//       forLeadership: {
//         label: toBilingual(en.forSchools.forLeadershipLabel, ar.forSchools.forLeadershipLabel),
//         title: toBilingual(en.forSchools.forLeadershipTitle, ar.forSchools.forLeadershipTitle),
//         description: toBilingual(en.forSchools.forLeadershipDesc, ar.forSchools.forLeadershipDesc),
//         points: toBilingual(en.forSchools.leadershipPoints, ar.forSchools.leadershipPoints),
//       },
//     },
//     practice: {
//       label: toBilingual(en.forSchools.practiceLabel, ar.forSchools.practiceLabel),
//       title: {
//         before: toBilingual(en.forSchools.practiceTitleBefore, ar.forSchools.practiceTitleBefore),
//         emphasis: toBilingual(en.forSchools.practiceTitleEm, ar.forSchools.practiceTitleEm),
//       },
//       description: toBilingual(en.forSchools.practiceDesc, ar.forSchools.practiceDesc),
//       report: {
//         title: toBilingual(en.forSchools.partnerSchoolReport, ar.forSchools.partnerSchoolReport),
//         updatedAgo: toBilingual(en.forSchools.updatedAgo, ar.forSchools.updatedAgo),
//         stats: toBilingual(
//           {
//             onboarded: en.forSchools.statOnboarded,
//             discoveryCompleted: en.forSchools.statDiscoveryCompleted,
//             essaysSubmitted: en.forSchools.statEssaysSubmitted,
//             advisorSessions: en.forSchools.statAdvisorSessions,
//           },
//           {
//             onboarded: ar.forSchools.statOnboarded,
//             discoveryCompleted: ar.forSchools.statDiscoveryCompleted,
//             essaysSubmitted: ar.forSchools.statEssaysSubmitted,
//             advisorSessions: ar.forSchools.statAdvisorSessions,
//           },
//         ),
//         topDestinations: toBilingual(en.forSchools.topDestinations, ar.forSchools.topDestinations),
//         topProgrammes: toBilingual(en.forSchools.topProgrammes, ar.forSchools.topProgrammes),
//       },
//     },
//     cta: {
//       title: {
//         before: toBilingual(en.forSchools.ctaTitleBefore, ar.forSchools.ctaTitleBefore),
//         emphasis: toBilingual(en.forSchools.ctaTitleEm, ar.forSchools.ctaTitleEm),
//       },
//       description: toBilingual(en.forSchools.ctaDesc, ar.forSchools.ctaDesc),
//       emailSchoolsTeam: toBilingual(en.forSchools.emailSchoolsTeam, ar.forSchools.emailSchoolsTeam),
//     },
//   },
// });

// writePage("for-advisors.json", {
//   page: "For Advisors",
//   route: "/for-advisors",
//   generatedAt,
//   note: "Demo UI mock data in the hero preview is English-only and not localized.",
//   ...sharedShell(),
//   metadata: {
//     title: toBilingual(en.forAdvisors.metadataTitle, ar.forAdvisors.metadataTitle),
//     description: toBilingual(en.forAdvisors.metadataDescription, ar.forAdvisors.metadataDescription),
//   },
//   sections: {
//     hero: {
//       badge: toBilingual(en.forAdvisors.heroBadge, ar.forAdvisors.heroBadge),
//       title: {
//         prefix: toBilingual(en.forAdvisors.heroTitlePrefix, ar.forAdvisors.heroTitlePrefix),
//         emphasis: toBilingual(en.forAdvisors.heroTitleEmphasis, ar.forAdvisors.heroTitleEmphasis),
//         suffix: toBilingual(en.forAdvisors.heroTitleSuffix, ar.forAdvisors.heroTitleSuffix),
//       },
//       subtitle: toBilingual(en.forAdvisors.heroSub, ar.forAdvisors.heroSub),
//       applyAsAdvisor: toBilingual(en.forAdvisors.applyAsAdvisor, ar.forAdvisors.applyAsAdvisor),
//       howItWorks: toBilingual(en.forAdvisors.howItWorks, ar.forAdvisors.howItWorks),
//       demoPreview: {
//         advisorProfile: {
//           name: { en: "Sarah Khalil", ar: "Sarah Khalil" },
//           title: { en: "Admissions Advisor · 8 yrs", ar: "Admissions Advisor · 8 yrs" },
//           rating: { en: "★★★★★ 4.9 · 84 sessions", ar: "★★★★★ 4.9 · 84 sessions" },
//           tags: [
//             { en: "US admissions", ar: "US admissions" },
//             { en: "UK · UCAS", ar: "UK · UCAS" },
//             { en: "Common App", ar: "Common App" },
//             { en: "Essays", ar: "Essays" },
//             { en: "Scholarships", ar: "Scholarships" },
//           ],
//         },
//         upcomingSession: {
//           title: { en: "Common App essay review", ar: "Common App essay review" },
//           time: { en: "4:30 PM · 45 min", ar: "4:30 PM · 45 min" },
//           student: { en: "Omar K. · Y13 · UAE", ar: "Omar K. · Y13 · UAE" },
//         },
//         request: {
//           from: { en: "Layla A.", ar: "Layla A." },
//           time: { en: "2 hrs ago", ar: "2 hrs ago" },
//           message: {
//             en: 'Hi Sarah, I\'m applying to LSE for Economics. Can we review my personal statement?',
//             ar: 'Hi Sarah, I\'m applying to LSE for Economics. Can we review my personal statement?',
//           },
//         },
//         stats: toBilingual(
//           { sessions: en.forAdvisors.statSessions, students: en.forAdvisors.statStudents, rating: en.forAdvisors.statRating },
//           { sessions: ar.forAdvisors.statSessions, students: ar.forAdvisors.statStudents, rating: ar.forAdvisors.statRating },
//         ),
//         labels: toBilingual(
//           { upcoming: en.forAdvisors.upcoming, today: en.forAdvisors.today, withPrefix: en.forAdvisors.withPrefix, viewRequest: en.forAdvisors.viewRequest },
//           { upcoming: ar.forAdvisors.upcoming, today: ar.forAdvisors.today, withPrefix: ar.forAdvisors.withPrefix, viewRequest: ar.forAdvisors.viewRequest },
//         ),
//       },
//     },
//     whyJoin: {
//       label: toBilingual(en.forAdvisors.whyLabel, ar.forAdvisors.whyLabel),
//       title: {
//         prefix: toBilingual(en.forAdvisors.whyTitlePrefix, ar.forAdvisors.whyTitlePrefix),
//         emphasis: toBilingual(en.forAdvisors.whyTitleEmphasis, ar.forAdvisors.whyTitleEmphasis),
//       },
//       description: toBilingual(en.forAdvisors.whyDesc, ar.forAdvisors.whyDesc),
//       cards: toBilingual(en.forAdvisors.whyCards, ar.forAdvisors.whyCards),
//     },
//     howItWorks: {
//       label: toBilingual(en.forAdvisors.howLabel, ar.forAdvisors.howLabel),
//       title: {
//         prefix: toBilingual(en.forAdvisors.howTitlePrefix, ar.forAdvisors.howTitlePrefix),
//         emphasis1: toBilingual(en.forAdvisors.howTitleEm1, ar.forAdvisors.howTitleEm1),
//         between: toBilingual(en.forAdvisors.howTitleBetween, ar.forAdvisors.howTitleBetween),
//         emphasis2: toBilingual(en.forAdvisors.howTitleEm2, ar.forAdvisors.howTitleEm2),
//       },
//       description: toBilingual(en.forAdvisors.howDesc, ar.forAdvisors.howDesc),
//       steps: toBilingual(en.forAdvisors.journeySteps, ar.forAdvisors.journeySteps),
//     },
//     supportAreas: {
//       label: toBilingual(en.forAdvisors.supportLabel, ar.forAdvisors.supportLabel),
//       title: {
//         prefix: toBilingual(en.forAdvisors.supportTitlePrefix, ar.forAdvisors.supportTitlePrefix),
//         emphasis: toBilingual(en.forAdvisors.supportTitleEmphasis, ar.forAdvisors.supportTitleEmphasis),
//       },
//       description: toBilingual(en.forAdvisors.supportDesc, ar.forAdvisors.supportDesc),
//       areas: toBilingual(en.forAdvisors.supportAreas, ar.forAdvisors.supportAreas),
//     },
//     differentiator: {
//       label: toBilingual(en.forAdvisors.diffLabel, ar.forAdvisors.diffLabel),
//       title: {
//         prefix: toBilingual(en.forAdvisors.diffTitlePrefix, ar.forAdvisors.diffTitlePrefix),
//         emphasis: toBilingual(en.forAdvisors.diffTitleEmphasis, ar.forAdvisors.diffTitleEmphasis),
//       },
//       description: toBilingual(en.forAdvisors.diffDesc, ar.forAdvisors.diffDesc),
//       heading: {
//         prefix: toBilingual(en.forAdvisors.diffHeadingPrefix, ar.forAdvisors.diffHeadingPrefix),
//         emphasis: toBilingual(en.forAdvisors.diffHeadingEmphasis, ar.forAdvisors.diffHeadingEmphasis),
//       },
//       lead: toBilingual(en.forAdvisors.diffLead, ar.forAdvisors.diffLead),
//       points: toBilingual(en.forAdvisors.diffPoints, ar.forAdvisors.diffPoints),
//       profileLabels: toBilingual(
//         {
//           school: en.forAdvisors.profileSchool,
//           targetCountries: en.forAdvisors.profileTargetCountries,
//           interests: en.forAdvisors.profileInterests,
//           predictedGrades: en.forAdvisors.profilePredictedGrades,
//           topTraits: en.forAdvisors.profileTopTraits,
//         },
//         {
//           school: ar.forAdvisors.profileSchool,
//           targetCountries: ar.forAdvisors.profileTargetCountries,
//           interests: ar.forAdvisors.profileInterests,
//           predictedGrades: ar.forAdvisors.profilePredictedGrades,
//           topTraits: ar.forAdvisors.profileTopTraits,
//         },
//       ),
//     },
//     cta: {
//       title: {
//         prefix: toBilingual(en.forAdvisors.ctaTitlePrefix, ar.forAdvisors.ctaTitlePrefix),
//         emphasis: toBilingual(en.forAdvisors.ctaTitleEmphasis, ar.forAdvisors.ctaTitleEmphasis),
//       },
//       description: toBilingual(en.forAdvisors.ctaDesc, ar.forAdvisors.ctaDesc),
//       talkToTeam: toBilingual(en.forAdvisors.talkToTeam, ar.forAdvisors.talkToTeam),
//     },
//   },
// });

// writePage("privacy.json", {
//   page: "Privacy Policy",
//   route: "/privacy",
//   generatedAt,
//   ...sharedShell(),
//   sections: {
//     document: toBilingual(
//       { title: en.privacy.title, effectiveDate: en.privacy.effectiveDate, sections: en.privacy.sections },
//       { title: ar.privacy.title, effectiveDate: ar.privacy.effectiveDate, sections: ar.privacy.sections },
//     ),
//   },
// });

// writePage("terms.json", {
//   page: "Terms & Conditions",
//   route: "/terms",
//   generatedAt,
//   ...sharedShell(),
//   sections: {
//     document: toBilingual(
//       { title: en.terms.title, effectiveDate: en.terms.effectiveDate, sections: en.terms.sections },
//       { title: ar.terms.title, effectiveDate: ar.terms.effectiveDate, sections: ar.terms.sections },
//     ),
//   },
// });

// writePage("webinars.json", {
//   page: "Webinars",
//   route: "/webinars",
//   generatedAt,
//   note: "Individual webinar titles, descriptions, and agendas come from the database and are not included here.",
//   ...sharedShell(),
//   metadata: {
//     title: toBilingual(en.webinars.metadataTitle, ar.webinars.metadataTitle),
//     description: toBilingual(en.webinars.metadataDescription, ar.webinars.metadataDescription),
//   },
//   sections: {
//     hero: {
//       badge: toBilingual(en.webinars.heroBadge, ar.webinars.heroBadge),
//       title: toBilingual(en.webinars.heroTitle, ar.webinars.heroTitle),
//       titleEmphasis: toBilingual(en.webinars.heroTitleEmphasis, ar.webinars.heroTitleEmphasis),
//       subtitle: toBilingual(en.webinars.heroSubtitle, ar.webinars.heroSubtitle),
//       ctaViewUpcoming: toBilingual(en.webinars.heroCtaViewUpcoming, ar.webinars.heroCtaViewUpcoming),
//       ctaRegisterNext: toBilingual(en.webinars.heroCtaRegisterNext, ar.webinars.heroCtaRegisterNext),
//       footnote: toBilingual(en.webinars.heroFootnote, ar.webinars.heroFootnote),
//       features: toBilingual(en.webinars.heroFeatures, ar.webinars.heroFeatures),
//     },
//     topics: {
//       label: toBilingual(en.webinars.topicsSectionLabel, ar.webinars.topicsSectionLabel),
//       title: toBilingual(en.webinars.topicsTitle, ar.webinars.topicsTitle),
//       subtitle: toBilingual(en.webinars.topicsSubtitle, ar.webinars.topicsSubtitle),
//       items: toBilingual(en.webinars.topics, ar.webinars.topics),
//     },
//     faq: {
//       label: toBilingual(en.webinars.faqSectionLabel, ar.webinars.faqSectionLabel),
//       title: toBilingual(en.webinars.faqTitle, ar.webinars.faqTitle),
//       subtitle: toBilingual(en.webinars.faqSubtitle, ar.webinars.faqSubtitle),
//       items: toBilingual(en.webinars.faqsPublic, ar.webinars.faqsPublic),
//     },
//     listing: {
//       calendar: toBilingual(en.webinars.calendar, ar.webinars.calendar),
//       upcomingTitle: toBilingual(en.webinars.upcomingTitle, ar.webinars.upcomingTitle),
//       upcomingSub: toBilingual(en.webinars.upcomingSub, ar.webinars.upcomingSub),
//       empty: toBilingual(en.webinars.empty, ar.webinars.empty),
//       featuredSectionLabel: toBilingual(en.webinars.featuredSectionLabel, ar.webinars.featuredSectionLabel),
//       featuredSectionTitle: toBilingual(en.webinars.featuredSectionTitle, ar.webinars.featuredSectionTitle),
//       featuredSectionDescription: toBilingual(en.webinars.featuredSectionDescription, ar.webinars.featuredSectionDescription),
//       allWebinars: toBilingual(en.webinars.allWebinars, ar.webinars.allWebinars),
//     },
//     registration: toBilingual(
//       {
//         registerForWebinar: en.webinars.registerForWebinar,
//         registerPublicHint: en.webinars.registerPublicHint,
//         fullName: en.webinars.fullName,
//         fullNamePlaceholder: en.webinars.fullNamePlaceholder,
//         emailAddress: en.webinars.emailAddress,
//         emailPlaceholder: en.webinars.emailPlaceholder,
//         phoneNumber: en.webinars.phoneNumber,
//         phoneOptional: en.webinars.phoneOptional,
//         phonePlaceholder: en.webinars.phonePlaceholder,
//         registering: en.webinars.registering,
//         confirmRegistration: en.webinars.confirmRegistration,
//         registeredSuccess: en.webinars.registeredSuccess,
//         registeredSuccessHint: en.webinars.registeredSuccessHint,
//         gotIt: en.webinars.gotIt,
//         close: en.webinars.close,
//         registered: en.webinars.registered,
//         full: en.webinars.full,
//         registerNow: en.webinars.registerNow,
//         seatsOf: en.webinars.seatsOf,
//         seatsUnit: en.webinars.seatsUnit,
//         seatsRemaining: en.webinars.seatsRemaining,
//         notFound: en.webinars.notFound,
//       },
//       {
//         registerForWebinar: ar.webinars.registerForWebinar,
//         registerPublicHint: ar.webinars.registerPublicHint,
//         fullName: ar.webinars.fullName,
//         fullNamePlaceholder: ar.webinars.fullNamePlaceholder,
//         emailAddress: ar.webinars.emailAddress,
//         emailPlaceholder: ar.webinars.emailPlaceholder,
//         phoneNumber: ar.webinars.phoneNumber,
//         phoneOptional: ar.webinars.phoneOptional,
//         phonePlaceholder: ar.webinars.phonePlaceholder,
//         registering: ar.webinars.registering,
//         confirmRegistration: ar.webinars.confirmRegistration,
//         registeredSuccess: ar.webinars.registeredSuccess,
//         registeredSuccessHint: ar.webinars.registeredSuccessHint,
//         gotIt: ar.webinars.gotIt,
//         close: ar.webinars.close,
//         registered: ar.webinars.registered,
//         full: ar.webinars.full,
//         registerNow: ar.webinars.registerNow,
//         seatsOf: ar.webinars.seatsOf,
//         seatsUnit: ar.webinars.seatsUnit,
//         seatsRemaining: ar.webinars.seatsRemaining,
//         notFound: ar.webinars.notFound,
//       },
//     ),
//   },
// });

// writePage("login.json", {
//   page: "Login",
//   route: "/login",
//   generatedAt,
//   note: "Auth pages use a minimal layout without the full marketing footer.",
//   header: {
//     brand: toBilingual(en.common.brand, ar.common.brand),
//   },
//   sections: {
//     form: toBilingual(
//       {
//         welcomeBack: en.auth.welcomeBack,
//         subtitle: en.auth.logInSubtitle,
//         email: en.auth.email,
//         emailPlaceholder: en.auth.emailPlaceholder,
//         password: en.auth.password,
//         forgotPassword: en.auth.forgotPassword,
//         loggingIn: en.auth.loggingIn,
//         logIn: en.auth.logIn,
//         newHere: en.auth.newHere,
//         startUniversityJourney: en.auth.startUniversityJourney,
//         createAccount: en.auth.createAccount,
//         schoolDeactivated: en.auth.schoolDeactivated,
//         accountDeactivated: en.auth.accountDeactivated,
//         hidePassword: en.auth.hidePassword,
//         showPassword: en.auth.showPassword,
//       },
//       {
//         welcomeBack: ar.auth.welcomeBack,
//         subtitle: ar.auth.logInSubtitle,
//         email: ar.auth.email,
//         emailPlaceholder: ar.auth.emailPlaceholder,
//         password: ar.auth.password,
//         forgotPassword: ar.auth.forgotPassword,
//         loggingIn: ar.auth.loggingIn,
//         logIn: ar.auth.logIn,
//         newHere: ar.auth.newHere,
//         startUniversityJourney: ar.auth.startUniversityJourney,
//         createAccount: ar.auth.createAccount,
//         schoolDeactivated: ar.auth.schoolDeactivated,
//         accountDeactivated: ar.auth.accountDeactivated,
//         hidePassword: ar.auth.hidePassword,
//         showPassword: ar.auth.showPassword,
//       },
//     ),
//   },
// });

// writePage("signup.json", {
//   page: "Sign Up",
//   route: "/signup",
//   generatedAt,
//   note: "Auth pages use a minimal layout without the full marketing footer. Grade and country dropdown options use ISO country names.",
//   header: {
//     brand: toBilingual(en.common.brand, ar.common.brand),
//   },
//   sections: {
//     wizard: toBilingual(en.signup, ar.signup),
//     auth: toBilingual(
//       {
//         createAccountSubtitle: en.auth.createAccountSubtitle,
//         signupCreateAccount: en.auth.signupCreateAccount,
//         signupCredentials: en.auth.signupCredentials,
//         email: en.auth.email,
//         emailPlaceholder: en.auth.emailPlaceholder,
//         password: en.auth.password,
//         hidePassword: en.auth.hidePassword,
//         showPassword: en.auth.showPassword,
//       },
//       {
//         createAccountSubtitle: ar.auth.createAccountSubtitle,
//         signupCreateAccount: ar.auth.signupCreateAccount,
//         signupCredentials: ar.auth.signupCredentials,
//         email: ar.auth.email,
//         emailPlaceholder: ar.auth.emailPlaceholder,
//         password: ar.auth.password,
//         hidePassword: ar.auth.hidePassword,
//         showPassword: ar.auth.showPassword,
//       },
//     ),
//   },
// });

// writePage("reset-password.json", {
//   page: "Reset Password",
//   route: "/auth/reset-password",
//   generatedAt,
//   note: "Auth pages use a minimal layout without the full marketing footer.",
//   header: {
//     brand: toBilingual(en.common.brand, ar.common.brand),
//   },
//   sections: {
//     requestLink: toBilingual(
//       {
//         resetTitle: en.auth.resetTitle,
//         resetSubtitle: en.auth.resetSubtitle,
//         emailAddress: en.auth.emailAddress,
//         emailPlaceholder: en.auth.emailPlaceholder,
//         sendResetLink: en.auth.sendResetLink,
//         sending: en.auth.sending,
//         backToLogin: en.auth.backToLogin,
//       },
//       {
//         resetTitle: ar.auth.resetTitle,
//         resetSubtitle: ar.auth.resetSubtitle,
//         emailAddress: ar.auth.emailAddress,
//         emailPlaceholder: ar.auth.emailPlaceholder,
//         sendResetLink: ar.auth.sendResetLink,
//         sending: ar.auth.sending,
//         backToLogin: ar.auth.backToLogin,
//       },
//     ),
//     checkEmail: toBilingual(
//       {
//         checkEmail: en.auth.checkEmail,
//         resetEmailSent: en.auth.resetEmailSent,
//         backToLogin: en.auth.backToLogin,
//       },
//       {
//         checkEmail: ar.auth.checkEmail,
//         resetEmailSent: ar.auth.resetEmailSent,
//         backToLogin: ar.auth.backToLogin,
//       },
//     ),
//     chooseNewPassword: toBilingual(
//       {
//         chooseNewPassword: en.auth.chooseNewPassword,
//         chooseNewPasswordSubtitle: en.auth.chooseNewPasswordSubtitle,
//         newPassword: en.auth.newPassword,
//         confirmPassword: en.auth.confirmPassword,
//         updating: en.auth.updating,
//         updatePassword: en.auth.updatePassword,
//         passwordsDoNotMatch: en.auth.passwordsDoNotMatch,
//         passwordMinLength: en.auth.passwordMinLength,
//       },
//       {
//         chooseNewPassword: ar.auth.chooseNewPassword,
//         chooseNewPasswordSubtitle: ar.auth.chooseNewPasswordSubtitle,
//         newPassword: ar.auth.newPassword,
//         confirmPassword: ar.auth.confirmPassword,
//         updating: ar.auth.updating,
//         updatePassword: ar.auth.updatePassword,
//         passwordsDoNotMatch: ar.auth.passwordsDoNotMatch,
//         passwordMinLength: ar.auth.passwordMinLength,
//       },
//     ),
//     success: toBilingual(
//       {
//         passwordUpdated: en.auth.passwordUpdated,
//         passwordUpdatedSubtitle: en.auth.passwordUpdatedSubtitle,
//         goToLogin: en.auth.goToLogin,
//       },
//       {
//         passwordUpdated: ar.auth.passwordUpdated,
//         passwordUpdatedSubtitle: ar.auth.passwordUpdatedSubtitle,
//         goToLogin: ar.auth.goToLogin,
//       },
//     ),
//     expiredLink: toBilingual(
//       {
//         resetLinkExpired: en.auth.resetLinkExpired,
//         resetLinkInvalid: en.auth.resetLinkInvalid,
//         backToLogin: en.auth.backToLogin,
//       },
//       {
//         resetLinkExpired: ar.auth.resetLinkExpired,
//         resetLinkInvalid: ar.auth.resetLinkInvalid,
//         backToLogin: ar.auth.backToLogin,
//       },
//     ),
//     shared: toBilingual(
//       { close: en.auth.close, verifyingLink: en.auth.verifyingLink },
//       { close: ar.auth.close, verifyingLink: ar.auth.verifyingLink },
//     ),
//   },
// });

// writePage("README.json", {
//   title: "Public page content review — README",
//   generatedAt,
//   format: {
//     description:
//       "Each JSON file contains all user-facing copy for one public page. Every string is shown as { en: \"...\", ar: \"...\" } for side-by-side review.",
//     pages: [
//       { file: "home.json", route: "/" },
//       { file: "about.json", route: "/about" },
//       { file: "contact.json", route: "/contact" },
//       { file: "blog.json", route: "/blog" },
//       { file: "for-schools.json", route: "/for-schools" },
//       { file: "for-advisors.json", route: "/for-advisors" },
//       { file: "privacy.json", route: "/privacy" },
//       { file: "terms.json", route: "/terms" },
//       { file: "webinars.json", route: "/webinars" },
//       { file: "login.json", route: "/login" },
//       { file: "signup.json", route: "/signup" },
//       { file: "reset-password.json", route: "/auth/reset-password" },
//     ],
//     notes: [
//       "Marketing pages include header.navigation and footer in each file.",
//       "Auth pages (login, signup, reset-password) use a minimal header only.",
//       "Webinar detail pages (/webinars/[id]) load title, description, and agenda from the database.",
//       "Some dashboard preview mock data on For Schools and For Advisors is English-only.",
//     ],
//     regenerate: "node --experimental-strip-types scripts/export-public-page-content.ts",
//   },
// });

// console.log(`\nDone. ${OUT_DIR}`);

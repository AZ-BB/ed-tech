import {
  authAr,
  blogAr,
  commonAr,
  contactAr,
  footerAr,
  homeAr,
  navAr,
} from "./shared-ar";
import { privacyAr, termsAr } from "./legal-ar";
import { signupAr } from "./signup-ar";
import { forAdvisorsAr } from "./for-advisors-ar";
import { aboutAr } from "./about-ar";
import { webinarsAr } from "./webinars-ar";
import { forSchoolsAr } from "./for-schools-ar";
import { studentAr } from "./student-ar";

export const ar = {
  common: commonAr,
  nav: navAr,
  footer: footerAr,
  contact: contactAr,
  blog: blogAr,
  auth: authAr,
  home: homeAr,
  webinars: webinarsAr,
  forSchools: forSchoolsAr,
  privacy: privacyAr,
  terms: termsAr,
  signup: signupAr,
  forAdvisors: forAdvisorsAr,
  about: aboutAr,
  student: studentAr,
} as const;

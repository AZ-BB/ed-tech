import {
  authEn,
  blogEn,
  commonEn,
  contactEn,
  footerEn,
  homeEn,
  navEn,
} from "./shared";
import { privacyEn, termsEn } from "./legal-en";
import { signupEn } from "./signup-en";
import { forAdvisorsEn } from "./for-advisors-en";
import { aboutEn } from "./about-en";
import { webinarsEn } from "./webinars-en";
import { forSchoolsEn } from "./for-schools-en";

export const en = {
  common: commonEn,
  nav: navEn,
  footer: footerEn,
  contact: contactEn,
  blog: blogEn,
  auth: authEn,
  home: homeEn,
  webinars: webinarsEn,
  forSchools: forSchoolsEn,
  privacy: privacyEn,
  terms: termsEn,
  signup: signupEn,
  forAdvisors: forAdvisorsEn,
  about: aboutEn,
} as const;

"use client";

import { PublicMarketingNav } from "./public-marketing-nav";

type LandingNavProps = {
  signupHref?: string;
  landingPath?: string;
};

export function LandingNav({ signupHref = "/signup", landingPath = "/" }: LandingNavProps) {
  return (
    <PublicMarketingNav
      variant="landing"
      scrollMode="landing"
      signupHref={signupHref}
      landingPath={landingPath}
    />
  );
}

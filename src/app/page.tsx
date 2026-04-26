import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingPageContent } from "@/components/landing/landing-page-content";

export default function Home() {
  return (
    <>
      <LandingNav />
      <div className="main-content" id="main-content">
        <LandingPageContent />
      </div>
      <LandingFooter />
    </>
  );
}

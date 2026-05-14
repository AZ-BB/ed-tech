import { ContactForm } from "./contact-form";
import { MarketingSubpageNav } from "@/components/landing/marketing-subpage-chrome";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function ContactPage() {
  return (
    <>
      <MarketingSubpageNav />

      <div className="page-wrap">
        <div className="page-hero">
          <h1>Contact us</h1>
          <p>
            Have a question, partnership inquiry, or need support? We&apos;d
            love to hear from you.
          </p>
        </div>

        <div className="form-section">
          <ContactForm />
          <div className="support-info">
            <div className="support-divider" />
            <p>
              You can also reach us at{" "}
              <strong>
                <a href="mailto:admin@univeera.me">admin@univeera.me</a>
              </strong>
            </p>
            <p>We usually respond within 2-4 hours.</p>
          </div>
        </div>
      </div>

      <LandingFooter />
    </>
  );
}

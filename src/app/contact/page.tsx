import { ContactForm } from "./contact-form";
import {
  MarketingSubpageFooter,
  MarketingSubpageNav,
} from "@/components/landing/marketing-subpage-chrome";

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
                <a href="mailto:hello@univeera.com">hello@univeera.com</a>
              </strong>
            </p>
            <p>We usually respond within 1–2 business days.</p>
          </div>
        </div>
      </div>

      <MarketingSubpageFooter />
    </>
  );
}

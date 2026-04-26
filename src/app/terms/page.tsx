import Link from "next/link";

export default function TermsPage() {
  return (
    <>
      <nav className="nav" id="navbar">
        <Link className="nav-logo" href="/">
          <div className="nav-logo-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          UniApply
        </Link>
        <div className="nav-links">
          <Link className="nav-link" href="/#how-it-works">
            How it works
          </Link>
          <Link className="nav-link" href="/#features">
            Features
          </Link>
          <Link className="nav-link" href="/#testimonials">
            Testimonials
          </Link>
          <Link className="nav-link" href="/#faq">
            FAQ
          </Link>
          <Link className="nav-login" href="#">
            Log in
          </Link>
          <Link className="nav-cta" href="#">
            Start your journey
          </Link>
        </div>
      </nav>

      <div className="page-header">
        <h1>Terms &amp; Conditions</h1>
        <p>Effective date: April 2026</p>
      </div>

      <div className="content">
        <h2>Acceptance of terms</h2>
        <p>
          By accessing or using UniApply (&quot;the platform&quot;), you agree
          to be bound by these Terms and Conditions. If you do not agree to
          these terms, please do not use the platform. These terms apply to all
          users, including students, advisors, ambassadors, school
          administrators, and visitors.
        </p>

        <h2>About UniApply</h2>
        <p>
          UniApply is an education technology platform that helps students
          discover universities, find scholarships, receive essay feedback,
          connect with advisors and ambassadors, and manage their university
          application journey. The platform is designed primarily for students
          in the Middle East applying to universities globally.
        </p>

        <h2>User accounts</h2>
        <p>
          To access certain features, you must create an account. You agree to:
        </p>
        <ul>
          <li>Provide accurate and complete information during registration</li>
          <li>
            Keep your login credentials confidential and not share them with
            others
          </li>
          <li>
            Notify us immediately if you suspect unauthorised access to your
            account
          </li>
          <li>
            Accept responsibility for all activity that occurs under your
            account
          </li>
        </ul>
        <p>
          We reserve the right to suspend or terminate accounts that violate
          these terms or engage in behaviour that harms other users or the
          platform.
        </p>

        <h2>Acceptable use</h2>
        <p>
          You agree to use UniApply only for its intended purpose and in
          compliance with all applicable laws. You may not:
        </p>
        <ul>
          <li>
            Use the platform to submit false, misleading, or plagiarised
            information
          </li>
          <li>
            Attempt to access another user&apos;s account or data without
            permission
          </li>
          <li>
            Use automated tools, bots, or scrapers to collect data from the
            platform
          </li>
          <li>
            Upload content that is offensive, harmful, or violates the rights of
            others
          </li>
          <li>Interfere with the operation or security of the platform</li>
          <li>
            Use the platform for any commercial purpose not authorised by
            UniApply
          </li>
        </ul>

        <h2>Content and intellectual property</h2>
        <p>
          All content on UniApply, including text, design, logos, features, and
          software, is owned by or licensed to UniApply and is protected by
          intellectual property laws. You may not copy, modify, distribute, or
          create derivative works from our content without written permission.
        </p>
        <p>
          Content you submit to the platform (such as essays, profile
          information, and messages) remains yours. By submitting content, you
          grant UniApply a limited licence to use it solely for the purpose of
          providing and improving our services.
        </p>

        <h2>Essay review and AI tools</h2>
        <p>
          UniApply offers AI-powered essay feedback and university matching
          tools. These tools are designed to assist and guide you, but they are
          not a substitute for professional advice. You acknowledge that:
        </p>
        <ul>
          <li>
            AI-generated feedback is informational and should be used as one
            input among many
          </li>
          <li>
            UniApply does not guarantee specific outcomes, admissions results,
            or scholarship awards
          </li>
          <li>
            You are responsible for all final decisions regarding your
            applications
          </li>
        </ul>

        <h2>Advisor and ambassador sessions</h2>
        <p>
          UniApply facilitates connections between students and advisors or
          university ambassadors. We do not employ advisors or ambassadors
          directly and are not responsible for the advice they provide. Sessions
          are subject to availability and any applicable fees.
        </p>
        <ul>
          <li>
            Advisors and ambassadors are independent individuals sharing their
            personal experience and expertise
          </li>
          <li>
            UniApply does not guarantee the accuracy or completeness of advice
            given during sessions
          </li>
          <li>
            Session cancellation and rescheduling policies will be communicated
            at the time of booking
          </li>
        </ul>

        <h2>School partnerships</h2>
        <p>
          Schools that partner with UniApply may have access to aggregate
          student engagement data and counsellor tools. Student data shared with
          partner schools is governed by our Privacy Policy and any applicable
          data sharing agreements.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          UniApply is provided on an &quot;as is&quot; and &quot;as
          available&quot; basis. We make no warranties, express or implied,
          regarding the platform&apos;s availability, accuracy, or fitness for a
          particular purpose. To the fullest extent permitted by law:
        </p>
        <ul>
          <li>
            UniApply shall not be liable for any indirect, incidental, or
            consequential damages arising from your use of the platform
          </li>
          <li>
            Our total liability for any claim shall not exceed the amount you
            paid to UniApply in the 12 months preceding the claim
          </li>
          <li>
            We are not responsible for decisions made based on information or
            tools provided through the platform
          </li>
        </ul>

        <h2>Modifications to the platform</h2>
        <p>
          We may update, modify, or discontinue features of the platform at any
          time without prior notice. We will make reasonable efforts to
          communicate significant changes that affect your use of the platform.
        </p>

        <h2>Changes to these terms</h2>
        <p>
          We may revise these Terms and Conditions from time to time. When we
          make material changes, we will notify you through the platform or by
          email. Your continued use of UniApply after changes are posted
          constitutes your acceptance of the revised terms.
        </p>

        <h2>Governing law</h2>
        <p>
          These terms are governed by the laws of the United Arab Emirates. Any
          disputes arising from these terms or your use of the platform will be
          subject to the exclusive jurisdiction of the courts of the United Arab
          Emirates.
        </p>

        <h2>Contact us</h2>
        <p>
          If you have questions about these Terms and Conditions, please contact
          us at hello@uniapply.com.
        </p>
      </div>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-brand-name">
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "6px",
                  background: "var(--green)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                </svg>
              </div>
              UniApply
            </div>
            <div className="footer-brand-desc">
              Empowering MENA students to access better education opportunities
              through technology and guidance.
            </div>
          </div>
          <div>
            <div className="footer-col-title">Product</div>
            <Link className="footer-link" href="#">
              University search
            </Link>
            <Link className="footer-link" href="#">
              AI matching
            </Link>
            <Link className="footer-link" href="#">
              Essay feedback
            </Link>
            <Link className="footer-link" href="#">
              Scholarships
            </Link>
            <Link className="footer-link" href="#">
              Test prep
            </Link>
          </div>
          <div>
            <div className="footer-col-title">Resources</div>
            <Link className="footer-link" href="for_schools.html">
              For schools
            </Link>
            <Link className="footer-link" href="for_advisors.html">
              For advisors
            </Link>
            <Link className="footer-link" href="blog.html">
              Blog
            </Link>
          </div>
          <div>
            <div className="footer-col-title">Company</div>
            <Link className="footer-link" href="/about">
              About
            </Link>
            <Link className="footer-link" href="contact.html">
              Contact
            </Link>
            <Link className="footer-link" href="/privacy">
              Privacy
            </Link>
            <Link className="footer-link" href="/terms">
              Terms
            </Link>
          </div>
        </div>
        <div className="footer-bottom">2026 UniApply. All rights reserved.</div>
      </footer>
    </>
  );
}

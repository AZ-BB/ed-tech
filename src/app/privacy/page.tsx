import Link from "next/link";

export default function PrivacyPage() {
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
        <h1>Privacy Policy</h1>
        <p>Effective date: April 2026</p>
      </div>

      <div className="content">
        <h2>Introduction</h2>
        <p>
          UniApply (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is
          committed to protecting the privacy of our users. This Privacy Policy
          explains how we collect, use, store, and protect your personal
          information when you use our platform, website, and services.
        </p>
        <p>
          By using UniApply, you agree to the collection and use of information
          in accordance with this policy. If you do not agree, please do not use
          our services.
        </p>

        <h2>Information we collect</h2>
        <p>
          We collect information that you provide directly to us, as well as
          information generated through your use of the platform.
        </p>
        <ul>
          <li>
            Account information such as your name, email address, nationality,
            and school name when you register
          </li>
          <li>
            Academic profile data including your grades, test scores, preferred
            fields of study, and university preferences
          </li>
          <li>
            Content you create on the platform, such as essays submitted for
            review, saved universities, and scholarship bookmarks
          </li>
          <li>
            Communication data when you contact us, book advisor sessions, or
            interact with ambassadors
          </li>
          <li>
            Usage data including pages visited, features used, time spent on the
            platform, and device information
          </li>
        </ul>

        <h2>How we use your information</h2>
        <p>
          We use the information we collect to operate, improve, and personalise
          your experience on UniApply.
        </p>
        <ul>
          <li>
            To provide our core services including university search,
            scholarship discovery, AI matching, and essay review
          </li>
          <li>
            To personalise your experience by recommending universities and
            scholarships based on your profile
          </li>
          <li>
            To facilitate connections with advisors and university ambassadors
          </li>
          <li>
            To communicate with you about your account, sessions, and platform
            updates
          </li>
          <li>
            To improve our platform, features, and content based on usage
            patterns
          </li>
          <li>
            To provide aggregate, anonymised insights to partner schools (if
            applicable)
          </li>
        </ul>

        <h2>Information sharing</h2>
        <p>
          We do not sell your personal information. We may share your
          information only in the following circumstances:
        </p>
        <ul>
          <li>
            With advisors or ambassadors you choose to connect with, limited to
            what is necessary for the session
          </li>
          <li>
            With partner schools, only if you are a student enrolled at that
            school and only in aggregate or with your consent
          </li>
          <li>
            With service providers who help us operate the platform (such as
            hosting, analytics, and email services), under strict data
            protection agreements
          </li>
          <li>If required by law, regulation, or legal process</li>
        </ul>

        <h2>Data storage and security</h2>
        <p>
          We store your data on secure servers and use industry-standard
          encryption and access controls to protect your information. We retain
          your data for as long as your account is active or as needed to
          provide our services. You may request deletion of your account and
          associated data at any time.
        </p>

        <h2>Your rights</h2>
        <p>Depending on your location, you may have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate information</li>
          <li>Request deletion of your account and personal data</li>
          <li>Object to certain types of processing</li>
          <li>Export your data in a portable format</li>
        </ul>
        <p>
          To exercise any of these rights, please contact us at
          hello@uniapply.com.
        </p>

        <h2>Cookies</h2>
        <p>
          We use cookies and similar technologies to remember your preferences,
          understand how you use the platform, and improve your experience. You
          can manage your cookie preferences through your browser settings.
        </p>

        <h2>Children&apos;s privacy</h2>
        <p>
          UniApply is designed for students who are typically 16 years or older.
          We do not knowingly collect personal information from children under
          the age of 13. If we become aware that we have collected data from a
          child under 13, we will take steps to delete it promptly.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time. When we make
          significant changes, we will notify you through the platform or by
          email. Your continued use of UniApply after changes are posted
          constitutes your acceptance of the updated policy.
        </p>

        <h2>Contact us</h2>
        <p>
          If you have questions about this Privacy Policy or how we handle your
          data, please contact us at hello@uniapply.com.
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

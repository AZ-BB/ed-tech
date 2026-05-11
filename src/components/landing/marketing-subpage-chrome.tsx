import Link from "next/link";

export function MarketingSubpageNav() {
  return (
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
        Univeera
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
        <Link className="nav-login" href="/login">
          Log in
        </Link>
        <Link className="nav-cta" href="/signup">
          Start your journey
        </Link>
      </div>
    </nav>
  );
}

export function MarketingSubpageFooter() {
  return (
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
            Univeera
          </div>
          <div className="footer-brand-desc">
            Empowering MENA students to access better education opportunities
            through technology and guidance.
          </div>
        </div>
        <div>
          <div className="footer-col-title">Resources</div>
          <Link className="footer-link" href="/for-schools">
            For schools
          </Link>
          <Link className="footer-link" href="/for-advisors">
            For advisors
          </Link>
          <Link className="footer-link" href="/blog">
            Blog
          </Link>
        </div>
        <div>
          <div className="footer-col-title">Company</div>
          <Link className="footer-link" href="/about">
            About
          </Link>
          <Link className="footer-link" href="/contact">
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
      <div className="footer-bottom">2026 Univeera. All rights reserved.</div>
    </footer>
  );
}

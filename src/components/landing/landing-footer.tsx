export function LandingFooter() {
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
          <a className="footer-link" href="/for-schools">
            For schools
          </a>
          <a className="footer-link" href="/for-advisors">
            For advisors
          </a>
          <a className="footer-link" href="/blog">
            Blog
          </a>
        </div>
        <div>
          <div className="footer-col-title">Company</div>
          <a className="footer-link" href="/about">
            About
          </a>
          <a className="footer-link" href="/contact">
            Contact
          </a>
          <a className="footer-link" href="/privacy">
            Privacy
          </a>
          <a className="footer-link" href="/terms">
            Terms
          </a>
        </div>
      </div>
      <div className="footer-bottom">2026 Univeera. All rights reserved.</div>
    </footer>
  );
}

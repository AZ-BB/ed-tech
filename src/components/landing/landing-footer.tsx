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
            UniApply
          </div>
          <div className="footer-brand-desc">
            Empowering MENA students to access better education opportunities
            through technology and guidance.
          </div>
        </div>
        <div>
          <div className="footer-col-title">Product</div>
          <a className="footer-link" href="university_search_page.html">
            University search
          </a>
          <a className="footer-link" href="ai_university_matching.html">
            AI matching
          </a>
          <a className="footer-link" href="essay_review_page.html">
            Essay feedback
          </a>
          <a className="footer-link" href="scholarship_discovery_page.html">
            Scholarships
          </a>
          <a className="footer-link" href="#">
            Test prep
          </a>
        </div>
        <div>
          <div className="footer-col-title">Resources</div>
          <a className="footer-link" href="for_schools.html">
            For schools
          </a>
          <a className="footer-link" href="for_advisors.html">
            For advisors
          </a>
          <a className="footer-link" href="blog.html">
            Blog
          </a>
        </div>
        <div>
          <div className="footer-col-title">Company</div>
          <a className="footer-link" href="/about">
            About
          </a>
          <a className="footer-link" href="contact.html">
            Contact
          </a>
          <a className="footer-link" href="privacy.html">
            Privacy
          </a>
          <a className="footer-link" href="terms.html">
            Terms
          </a>
        </div>
      </div>
      <div className="footer-bottom">2026 UniApply. All rights reserved.</div>
    </footer>
  );
}

import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <div className="footer-brand">Univeera</div>
          <p className="footer-tagline">
            A MENA-focused university guidance platform built for schools,
            students, and families.
          </p>
        </div>
        <div className="footer-col">
          <h5>Platform</h5>
          <ul>
            <li>
              <Link href="/for-schools">For Schools</Link>
            </li>
            <li>
              <Link href="/webinars">Webinars</Link>
            </li>
            <li>
              <Link href="/for-advisors">For Advisors</Link>
            </li>
          </ul>
        </div>
        <div className="footer-col">
          <h5>Company</h5>
          <ul>
            <li>
              <Link href="/about">About</Link>
            </li>
            <li>
              <Link href="/blog">Blog</Link>
            </li>
            <li>
              <Link href="/contact">Contact</Link>
            </li>
          </ul>
        </div>
        <div className="footer-col">
          <h5>Legal</h5>
          <ul>
            <li>
              <Link href="/privacy">Privacy</Link>
            </li>
            <li>
              <Link href="/terms">Terms</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <div>© 2026 Univeera. All rights reserved.</div>
      </div>
    </footer>
  );
}

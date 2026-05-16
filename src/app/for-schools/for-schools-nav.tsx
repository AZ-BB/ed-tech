"use client";

import Link from "next/link";
import { useEffect } from "react";

export function ForSchoolsNav() {
  useEffect(() => {
    const nav = document.getElementById("navbar");
    const onScroll = () => {
      if (!nav) return;
      nav.classList.toggle("scrolled", window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
        <Link className="nav-link active" href="/for-schools">
          For Schools
        </Link>
        <Link className="nav-link" href="/for-advisors">
          For Advisors
        </Link>
        <Link className="nav-link" href="/about">
          About
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

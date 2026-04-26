"use client";

import { useEffect } from "react";

const SECTIONS = ["how-it-works", "features", "testimonials", "faq"] as const;

export function LandingNav() {
  useEffect(() => {
    const nav = document.getElementById("navbar");
    const navLinks = document.querySelectorAll<HTMLAnchorElement>(".nav-link");

    const onScroll = () => {
      if (!nav) return;
      if (window.scrollY > 60) nav.classList.add("scrolled");
      else nav.classList.remove("scrolled");
      const scrollPos = window.scrollY + 120;
      let currentSection = "";
      for (const id of SECTIONS) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollPos) {
          currentSection = id;
        }
      }
      for (const link of navLinks) {
        link.classList.remove("active");
        if (link.getAttribute("href") === `#${currentSection}`) {
          link.classList.add("active");
        }
      }
    };

    const onDocClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a.nav-link");
      if (!target) return;
      const href = target.getAttribute("href");
      if (href?.startsWith("#") && href.length > 1) {
        e.preventDefault();
        for (const p of document.querySelectorAll(".sub-page")) {
          p.classList.remove("active");
        }
        document.getElementById("main-content")?.classList.remove("hidden");
        setTimeout(() => {
          const id = href.slice(1);
          const sectionEl = document.getElementById(id);
          if (sectionEl) {
            const offset = sectionEl.offsetTop - 70;
            window.scrollTo({ top: offset, behavior: "smooth" });
          }
        }, 50);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onDocClick);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onDocClick);
    };
  }, []);

  return (
    <nav className="nav" id="navbar">
      <a className="nav-logo" href="/">
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
      </a>
      <div className="nav-links">
        <a className="nav-link" href="#how-it-works">
          How it works
        </a>
        <a className="nav-link" href="#features">
          Features
        </a>
        <a className="nav-link" href="#testimonials">
          Testimonials
        </a>
        <a className="nav-link" href="#faq">
          FAQ
        </a>
        <a className="nav-login" href="signup.html">
          Log in
        </a>
        <a className="nav-cta" href="signup.html">
          Start your journey
        </a>
      </div>
    </nav>
  );
}

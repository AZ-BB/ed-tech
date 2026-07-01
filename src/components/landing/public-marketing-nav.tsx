"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "@/lib/i18n/language-switcher";
import { LocalizedLink } from "@/lib/i18n/localized-link";
import { useLocale, useLocaleContext } from "@/lib/i18n/locale-context";

export type PublicNavVariant = "landing" | "marketing" | "audience";

export type AudienceActive = "about" | "for-schools" | "for-advisors";

type PublicMarketingNavProps = {
  variant: PublicNavVariant;
  audienceActive?: AudienceActive;
  /** Landing page: track section scroll + hash clicks. Subpage: toggle scrolled at 20px. */
  scrollMode?: "landing" | "subpage";
};

function NavLogoIcon() {
  return (
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
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

const LANDING_SECTIONS = ["how-it-works", "features", "testimonials", "faq"] as const;

export function PublicMarketingNav({
  variant,
  audienceActive,
  scrollMode = variant === "landing" ? "landing" : "subpage",
}: PublicMarketingNavProps) {
  const { dict } = useLocale();
  const hasLocale = useLocaleContext() !== null;
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);

  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen, closeDrawer]);

  useEffect(() => {
    const nav = document.getElementById("navbar");
    if (!nav) return;

    if (scrollMode === "subpage") {
      const onScroll = () => {
        nav.classList.toggle("scrolled", window.scrollY > 20);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      return () => window.removeEventListener("scroll", onScroll);
    }

    const navLinks = document.querySelectorAll<HTMLAnchorElement>(".nav-link");
    const onScroll = () => {
      if (window.scrollY > 60) nav.classList.add("scrolled");
      else nav.classList.remove("scrolled");
      const scrollPos = window.scrollY + 120;
      let currentSection = "";
      for (const id of LANDING_SECTIONS) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollPos) {
          currentSection = id;
        }
      }
      for (const link of navLinks) {
        link.classList.remove("active");
        if (link.getAttribute("href")?.endsWith(`#${currentSection}`)) {
          link.classList.add("active");
        }
      }
    };

    const onDocClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a.nav-link");
      if (!target) return;
      const href = target.getAttribute("href");
      if (href?.includes("#") && href.length > 1) {
        const hash = href.slice(href.indexOf("#"));
        if (hash.startsWith("#") && hash.length > 1) {
          e.preventDefault();
          for (const p of document.querySelectorAll(".sub-page")) {
            p.classList.remove("active");
          }
          document.getElementById("main-content")?.classList.remove("hidden");
          setTimeout(() => {
            const id = hash.slice(1);
            const sectionEl = document.getElementById(id);
            if (sectionEl) {
              const offset = sectionEl.offsetTop - 70;
              window.scrollTo({ top: offset, behavior: "smooth" });
            }
          }, 50);
          closeDrawer();
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onDocClick);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onDocClick);
    };
  }, [scrollMode, closeDrawer]);

  const renderNavLinks = (inDrawer: boolean) => {
    const linkClass = inDrawer ? "nav-drawer-link" : "nav-link";

    if (variant === "audience") {
      return (
        <>
          <LocalizedLink
            className={`${linkClass}${audienceActive === "for-schools" ? " active" : ""}`}
            href="/for-schools"
            onClick={inDrawer ? closeDrawer : undefined}
          >
            {dict.nav.forSchools}
          </LocalizedLink>
          <LocalizedLink
            className={`${linkClass}${audienceActive === "for-advisors" ? " active" : ""}`}
            href="/for-advisors"
            onClick={inDrawer ? closeDrawer : undefined}
          >
            {dict.nav.forAdvisors}
          </LocalizedLink>
          <LocalizedLink
            className={`${linkClass}${audienceActive === "about" ? " active" : ""}`}
            href="/about"
            onClick={inDrawer ? closeDrawer : undefined}
          >
            {dict.nav.about}
          </LocalizedLink>
        </>
      );
    }

    return (
      <>
        <LocalizedLink
          className={linkClass}
          href="/#how-it-works"
          onClick={inDrawer ? closeDrawer : undefined}
        >
          {dict.nav.howItWorks}
        </LocalizedLink>
        <LocalizedLink
          className={linkClass}
          href="/#features"
          onClick={inDrawer ? closeDrawer : undefined}
        >
          {dict.nav.features}
        </LocalizedLink>
        <LocalizedLink
          className={linkClass}
          href="/#testimonials"
          onClick={inDrawer ? closeDrawer : undefined}
        >
          {dict.nav.testimonials}
        </LocalizedLink>
        {variant === "marketing" ? (
          <LocalizedLink
            className={linkClass}
            href="/webinars"
            onClick={inDrawer ? closeDrawer : undefined}
          >
            {dict.nav.webinars}
          </LocalizedLink>
        ) : null}
        <LocalizedLink
          className={linkClass}
          href="/#faq"
          onClick={inDrawer ? closeDrawer : undefined}
        >
          {dict.nav.faq}
        </LocalizedLink>
      </>
    );
  };

  const renderActions = (inDrawer: boolean) => (
    <>
      <LocalizedLink
        className={inDrawer ? "nav-drawer-login" : "nav-login"}
        href="/login"
        onClick={inDrawer ? closeDrawer : undefined}
      >
        {dict.nav.logIn}
      </LocalizedLink>
      <LocalizedLink
        className={inDrawer ? "nav-drawer-cta" : "nav-cta"}
        href="/signup"
        onClick={inDrawer ? closeDrawer : undefined}
      >
        {dict.nav.startJourney}
      </LocalizedLink>
    </>
  );

  const drawerPortal =
    mounted && typeof document !== "undefined"
      ? createPortal(
          <>
            <div
              role="presentation"
              className={`nav-overlay${drawerOpen ? " nav-overlay--open" : ""}`}
              onClick={closeDrawer}
              aria-hidden={!drawerOpen}
            />

            <aside
              id="nav-drawer"
              className={`nav-drawer${drawerOpen ? " nav-drawer--open" : ""}`}
              role="dialog"
              aria-modal="true"
              aria-label={dict.nav.openMenu}
              dir="ltr"
            >
              <div className="nav-drawer-header">
                <span className="nav-drawer-title">{dict.common.brand}</span>
                <button
                  type="button"
                  className="nav-drawer-close"
                  aria-label={dict.nav.closeMenu}
                  onClick={closeDrawer}
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="nav-drawer-body">
                {renderNavLinks(true)}
                <div className="nav-drawer-actions">{renderActions(true)}</div>
              </div>
            </aside>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      <nav className="nav" id="navbar" dir="ltr">
        <div className="nav-brand">
          <LocalizedLink className="nav-logo" href="/">
            <div className="nav-logo-icon">
              <NavLogoIcon />
            </div>
            {dict.common.brand}
          </LocalizedLink>
          {hasLocale ? <LanguageSwitcher /> : null}
        </div>

        <div className="nav-links nav-links--desktop">
          {renderNavLinks(false)}
          {renderActions(false)}
        </div>

        <button
          type="button"
          className="nav-menu-btn"
          aria-expanded={drawerOpen}
          aria-controls="nav-drawer"
          aria-label={drawerOpen ? dict.nav.closeMenu : dict.nav.openMenu}
          onClick={drawerOpen ? closeDrawer : openDrawer}
        >
          {drawerOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </nav>

      {drawerPortal}
    </>
  );
}

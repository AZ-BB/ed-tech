"use client";

import { usePathname } from "next/navigation";
import { localizePath, stripLocaleFromPath, type Locale } from "./config";
import { useLocale, useLocaleContext } from "./locale-context";

export function LanguageSwitcher() {
  const { locale, dict } = useLocale();
  const hasLocale = useLocaleContext() !== null;
  const pathname = usePathname();
  const { pathnameWithoutLocale } = stripLocaleFromPath(pathname);

  if (!hasLocale) return null;

  function switchHref(target: Locale) {
    const path =
      pathnameWithoutLocale === "/"
        ? localizePath("/", target)
        : localizePath(pathnameWithoutLocale, target);
    return path;
  }

  return (
    <div className="lang-switcher" role="navigation" aria-label={dict.common.language}>
      <a
        href={switchHref("en")}
        className={`lang-switcher-link${locale === "en" ? " active" : ""}`}
        aria-current={locale === "en" ? "page" : undefined}
      >
        {dict.common.english}
      </a>
      <span className="lang-switcher-sep" aria-hidden>
        |
      </span>
      <a
        href={switchHref("ar")}
        className={`lang-switcher-link${locale === "ar" ? " active" : ""}`}
        aria-current={locale === "ar" ? "page" : undefined}
      >
        {dict.common.arabic}
      </a>
    </div>
  );
}

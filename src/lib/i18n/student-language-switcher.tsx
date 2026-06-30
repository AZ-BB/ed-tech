"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "./config";
import { setLocaleCookie } from "./locale-cookie";
import { useLocale } from "./locale-context";

export function StudentLanguageSwitcher({ className }: { className?: string }) {
  const { locale, dict } = useLocale();
  const router = useRouter();

  function switchLocale(target: Locale) {
    if (target === locale) return;
    setLocaleCookie(target);
    router.refresh();
  }

  return (
    <div className={`lang-switcher${className ? ` ${className}` : ""}`} role="navigation" aria-label={dict.common.language}>
      <button
        type="button"
        className={`lang-switcher-link m-0 cursor-pointer border-0 bg-transparent p-0${locale === "en" ? " active" : ""}`}
        aria-current={locale === "en" ? "true" : undefined}
        onClick={() => switchLocale("en")}
      >
        {dict.common.english}
      </button>
      <span className="lang-switcher-sep" aria-hidden>
        |
      </span>
      <button
        type="button"
        className={`lang-switcher-link m-0 cursor-pointer border-0 bg-transparent p-0${locale === "ar" ? " active" : ""}`}
        aria-current={locale === "ar" ? "true" : undefined}
        onClick={() => switchLocale("ar")}
      >
        {dict.common.arabic}
      </button>
    </div>
  );
}

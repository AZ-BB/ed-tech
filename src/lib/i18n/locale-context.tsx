"use client";

import { createContext, useContext, useEffect } from "react";
import { en } from "./dictionaries/en";
import type { Dictionary } from "./get-dictionary";
import { getDirection, type Locale } from "./config";

type LocaleContextValue = {
  locale: Locale;
  dict: Dictionary;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = getDirection(locale);
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, dict }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;
  return { locale: "en", dict: en };
}

export function useLocaleContext(): LocaleContextValue | null {
  return useContext(LocaleContext);
}

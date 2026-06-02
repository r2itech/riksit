"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LOCALE,
  type DictKey,
  htmlLang,
  isLocale,
  type Locale,
  translate,
} from "@/lib/i18n";

const STORAGE_KEY = "riksit:locale";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // SSR-safe: start at the default locale so the server HTML and the first
  // client render agree on `lang="id"`. The post-mount effect below swaps to
  // the persisted user choice if it differs.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isLocale(stored) && stored !== locale) {
        setLocaleState(stored);
        document.documentElement.lang = htmlLang(stored);
      }
    } catch {
      // localStorage unavailable — stay on the default. Not fatal.
    }
    // We intentionally don't depend on `locale`: this is a one-shot rehydrate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore — selection still applies for this session.
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = htmlLang(next);
    }
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used inside <LocaleProvider>.");
  }
  return ctx;
}

/** Convenience hook for components that only need the translation function. */
export function useT(): LocaleContextValue["t"] {
  return useLocale().t;
}

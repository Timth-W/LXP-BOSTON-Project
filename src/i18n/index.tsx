"use client";

/**
 * Language system. The chosen language is kept in the browser (localStorage "joyto-locale").
 * Usage in a screen: const { t, f, locale, setLocale } = useI18n();
 *   t.senior.hello("Marie")      → texts from the dictionaries
 *   f.date(activity.start)        → dates, prices and durations in the current language
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { formatDate, formatDuration, formatMoney, formatMonth, formatShortDate, formatTime, joinNames, tx } from "@/lib/format";
import type { Locale, Slot, Text } from "@/lib/types";
import { en, type Dict } from "./en";
import { fr } from "./fr";

export const LOCALES: { id: Locale; label: string }[] = [
  { id: "en", label: "English" },
  { id: "fr", label: "Français" },
];

const DICTS: Record<Locale, Dict> = { en, fr };
const STORAGE_KEY = "joyto-locale";

export function makeFormatters(locale: Locale, t: Dict) {
  return {
    date: (iso: string) => formatDate(iso, locale),
    day: (iso: string) => formatDate(iso, locale, false),
    time: (iso: string) => formatTime(iso, locale),
    short: (iso: string) => formatShortDate(iso, locale),
    month: (iso: string) => formatMonth(iso, locale),
    money: (cents: number) => formatMoney(cents, locale),
    duration: (minutes: number) => formatDuration(minutes, locale),
    /** "5 hours" when it is a whole number of hours, otherwise "2 h 30 min". */
    hours: (minutes: number) => (minutes % 60 === 0 ? t.units.hours(minutes / 60) : formatDuration(minutes, locale)),
    names: (names: string[]) => joinNames(names, locale),
    text: (value: Text) => tx(value, locale),
    slot: (slot: Slot) => {
      const [day, moment] = slot.split("-") as [keyof Dict["days"], keyof Dict["moments"]];
      return t.slot(t.days[day], t.moments[moment]);
    },
  };
}

export type Formatters = ReturnType<typeof makeFormatters>;

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dict;
  f: Formatters;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "fr") setLocaleState(saved);
    } catch {
      /* storage unavailable: keep English */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const value = useMemo<I18nValue>(() => {
    const t = DICTS[locale];
    return { locale, setLocale, t, f: makeFormatters(locale, t) };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>.");
  return ctx;
}

export function dictFor(locale: Locale): Dict {
  return DICTS[locale];
}

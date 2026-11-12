import { DAY_KEYS } from "./constants";
import type { DayKey, Locale, Slot, Text } from "./types";

const LOCALE_TAG: Record<Locale, string> = { en: "en-GB", fr: "fr-FR" };

/** Dates are local times without time zone ("2026-11-14T14:30"). */
export function toDate(iso: string): Date {
  return new Date(iso);
}

export function toLocalIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function addMinutes(iso: string, minutes: number): string {
  const d = toDate(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return toLocalIso(d);
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function formatTime(iso: string, locale: Locale): string {
  const d = toDate(iso);
  if (locale === "fr") return d.getMinutes() === 0 ? `${d.getHours()} h` : `${d.getHours()} h ${String(d.getMinutes()).padStart(2, "0")}`;
  return d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }).replace(":00", "").replace(" ", " ");
}

export function formatDate(iso: string, locale: Locale, withTime = true): string {
  const d = toDate(iso);
  const day = d.toLocaleDateString(LOCALE_TAG[locale], { weekday: "long", day: "numeric", month: "long" });
  return withTime ? `${capitalize(day)}, ${formatTime(iso, locale)}` : capitalize(day);
}

export function formatShortDate(iso: string, locale: Locale): string {
  return toDate(iso).toLocaleDateString(LOCALE_TAG[locale], { day: "numeric", month: "short" });
}

export function formatMonth(iso: string, locale: Locale): string {
  return toDate(iso).toLocaleDateString(LOCALE_TAG[locale], { month: "short" });
}

export function formatMoney(cents: number, locale: Locale): string {
  return (cents / 100).toLocaleString(LOCALE_TAG[locale], { style: "currency", currency: "EUR" });
}

export function formatDuration(minutes: number, locale: Locale): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (locale === "fr") {
    if (h === 0) return `${m} min`;
    return m ? `${h} h ${m}` : `${h} h`;
  }
  if (h === 0) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function dayKey(iso: string): DayKey {
  return DAY_KEYS[toDate(iso).getDay()];
}

export function slotOf(iso: string): Slot {
  return `${dayKey(iso)}-${toDate(iso).getHours() < 12 ? "am" : "pm"}`;
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((toDate(toIso).getTime() - toDate(fromIso).getTime()) / 86_400_000);
}

export function joinNames(names: string[], locale: Locale): string {
  if (names.length <= 1) return names.join("");
  const and = locale === "fr" ? "et" : "and";
  return `${names.slice(0, -1).join(", ")} ${and} ${names[names.length - 1]}`;
}

export function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

/** Resolves a bilingual seed text or returns free text as typed. */
export function tx(value: Text, locale: Locale): string {
  return typeof value === "string" ? value : value[locale];
}

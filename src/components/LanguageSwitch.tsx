"use client";

import { LOCALES, useI18n } from "@/i18n";

export function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label={t.nav.language}>
      {LOCALES.map((l) => (
        <button key={l.id} type="button" aria-pressed={locale === l.id} onClick={() => setLocale(l.id)} lang={l.id} title={l.label}>
          {l.id.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

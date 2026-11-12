"use client";

import { useI18n } from "@/i18n";
import type { User } from "@/lib/types";

/** For relatives linked to several seniors. Hidden when there is only one. */
export function SeniorSwitcher({ seniors, value, onChange }: { seniors: User[]; value: string; onChange: (id: string) => void }) {
  const { t } = useI18n();
  if (seniors.length < 2) return null;
  return (
    <div className="field" style={{ maxWidth: 360 }}>
      <label htmlFor="senior-switch">{t.family.chooseSenior}</label>
      <select id="senior-switch" className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {seniors.map((s) => (
          <option key={s.id} value={s.id}>
            {s.firstName} {s.lastName}
          </option>
        ))}
      </select>
    </div>
  );
}

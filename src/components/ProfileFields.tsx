"use client";

/** Form controls shared by sign-up and profile screens. */
import { useI18n } from "@/i18n";
import { CATEGORY_IDS, SECTOR_IDS, WEEK_ORDER } from "@/lib/constants";
import type { Category, Moment, SectorId, Slot } from "@/lib/types";
import { CATEGORY_ICON, Icon } from "./Icon";

export function InterestPicker({ value, onChange, legend }: { value: Category[]; onChange: (v: Category[]) => void; legend: string }) {
  const { t } = useI18n();
  const toggle = (c: Category) => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c]);
  return (
    <fieldset className="field">
      <legend>{legend}</legend>
      <div className="toggle-chips">
        {CATEGORY_IDS.map((c) => (
          <label key={c} className="toggle-chip">
            <input type="checkbox" checked={value.includes(c)} onChange={() => toggle(c)} />
            <Icon name={CATEGORY_ICON[c]} size={18} />
            {t.categories[c]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function SectorPicker({
  value,
  onChange,
  legend,
  multiple,
}: { legend: string } & (
  | { multiple?: false; value: SectorId; onChange: (v: SectorId) => void }
  | { multiple: true; value: SectorId[]; onChange: (v: SectorId[]) => void }
)) {
  const { t } = useI18n();
  return (
    <fieldset className="field">
      <legend>{legend}</legend>
      <div className="toggle-chips">
        {SECTOR_IDS.map((s) => (
          <label key={s} className="toggle-chip">
            {multiple ? (
              <input
                type="checkbox"
                checked={value.includes(s)}
                onChange={() => onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s])}
              />
            ) : (
              <input type="radio" name={`sector-${legend}`} checked={value === s} onChange={() => onChange(s)} />
            )}
            <Icon name="pin" size={18} />
            {t.sectors[s]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const MOMENTS: Moment[] = ["am", "pm"];

export function SlotPicker({
  value,
  onChange,
  legend,
  help,
}: {
  value: Slot[];
  onChange: (v: Slot[]) => void;
  legend: string;
  help?: string;
}) {
  const { t } = useI18n();
  const toggle = (slot: Slot) => onChange(value.includes(slot) ? value.filter((x) => x !== slot) : [...value, slot]);
  return (
    <fieldset className="field">
      <legend>{legend}</legend>
      {help ? <small>{help}</small> : null}
      <div className="slot-grid" style={{ marginTop: 6 }}>
        <span />
        {WEEK_ORDER.map((d) => (
          <span key={d} className="slot-head" title={t.days[d]}>
            {t.daysShort[d]}
          </span>
        ))}
        {MOMENTS.map((m) => (
          <div key={m} style={{ display: "contents" }}>
            <span className="slot-row-label">{t.moments[m]}</span>
            {WEEK_ORDER.map((d) => {
              const slot = `${d}-${m}` as Slot;
              return (
                <label key={slot} className="slot">
                  <input
                    type="checkbox"
                    checked={value.includes(slot)}
                    onChange={() => toggle(slot)}
                    aria-label={t.slot(t.days[d], t.moments[m])}
                  />
                  <Icon name="check" size={18} />
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </fieldset>
  );
}

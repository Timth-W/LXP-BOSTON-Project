"use client";

/**
 * Illustrated map of the neighbourhood (moodboard: map with coral pins).
 * Positions are stored in percent on each activity, so the map needs no external service.
 * Production: replace with a real map library (for example MapLibre) and coordinates.
 */
import { useState } from "react";
import { useI18n } from "@/i18n";
import { isRegistered } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { Activity, SectorId, User } from "@/lib/types";
import { ActivityCard } from "./ActivityCard";
import { CATEGORY_ICON, Icon } from "./Icon";

const LABEL_POS: Record<SectorId, { x: number; y: number }> = {
  gardens: { x: 24, y: 88 },
  centre: { x: 56, y: 12 },
  university: { x: 88, y: 6 },
  station: { x: 84, y: 92 },
};

const SECTOR_POS: Record<SectorId, { x: number; y: number }> = {
  gardens: { x: 22, y: 50 },
  centre: { x: 62, y: 33 },
  station: { x: 82, y: 78 },
  university: { x: 86, y: 14 },
};

export function ActivityMap({ activities, viewer }: { activities: Activity[]; viewer?: User }) {
  const { state } = useStore();
  const { t, f } = useI18n();
  const [selected, setSelected] = useState<string | null>(activities[0]?.id ?? null);
  const current = activities.find((a) => a.id === selected) ?? null;
  const home = viewer ? SECTOR_POS[viewer.sector] : null;

  return (
    <div className="stack">
      <div className="map" role="group" aria-label={t.senior.mapLegend}>
        <svg className="map-bg" viewBox="0 0 100 75" preserveAspectRatio="none" aria-hidden="true">
          <rect width="100" height="75" fill="#efe7d6" />
          {/* parks */}
          <path d="M4 22 Q14 14 28 18 Q36 26 30 40 Q18 46 8 40 Z" fill="#cfdccf" />
          <path d="M54 6 Q66 2 76 8 Q78 18 68 22 Q56 20 54 6 Z" fill="#cfdccf" />
          <path d="M8 56 Q16 50 26 56 Q28 66 18 70 Q8 68 8 56 Z" fill="#d9e3d6" />
          {/* river */}
          <path d="M-2 62 Q20 54 40 60 T78 56 T104 64" fill="none" stroke="#c7d6de" strokeWidth="5" strokeLinecap="round" />
          {/* roads */}
          <g stroke="#fbf8f2" strokeWidth="1.6" fill="none" strokeLinecap="round">
            <path d="M0 30 H100" />
            <path d="M44 0 V75" />
            <path d="M0 48 Q30 44 60 46 T100 40" />
            <path d="M70 0 Q72 30 80 75" />
            <path d="M14 0 Q20 40 30 75" />
          </g>
          {/* blocks */}
          <g fill="#e3d8c2">
            <rect x="48" y="34" width="8" height="6" rx="1" />
            <rect x="58" y="34" width="9" height="6" rx="1" />
            <rect x="48" y="22" width="9" height="6" rx="1" />
            <rect x="74" y="34" width="8" height="5" rx="1" />
            <rect x="84" y="46" width="10" height="6" rx="1" />
            <rect x="32" y="34" width="8" height="8" rx="1" />
            <rect x="84" y="20" width="10" height="7" rx="1" />
          </g>
        </svg>
        {(Object.keys(SECTOR_POS) as SectorId[]).map((s) => (
          <span key={s} className="map-label" style={{ left: `${LABEL_POS[s].x}%`, top: `${LABEL_POS[s].y}%` }}>
            {t.sectors[s]}
          </span>
        ))}
        {home ? (
          <span className="map-home" style={{ left: `${home.x}%`, top: `${home.y}%` }}>
            <Icon name="home" size={16} /> {t.senior.you}
          </span>
        ) : null}
        {activities.map((a) => {
          const mine = viewer ? isRegistered(state, a.id, viewer.id) : false;
          return (
            <button
              key={a.id}
              type="button"
              className={`map-pin${mine ? " pin-mine" : ""}`}
              style={{ left: `${a.map.x}%`, top: `${a.map.y}%` }}
              aria-pressed={selected === a.id}
              aria-label={`${f.text(a.title)}, ${f.date(a.start)}`}
              onClick={() => setSelected(a.id)}
            >
              <span className="pin-head">
                <Icon name={CATEGORY_ICON[a.category]} size={18} />
              </span>
            </button>
          );
        })}
      </div>
      {current ? <ActivityCard activity={current} viewer={viewer} /> : null}
    </div>
  );
}

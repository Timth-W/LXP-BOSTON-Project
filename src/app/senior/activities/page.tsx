"use client";

import { useState } from "react";
import { ActivityCard } from "@/components/ActivityCard";
import { ActivityMap } from "@/components/ActivityMap";
import { CATEGORY_ICON, Icon } from "@/components/Icon";
import { Empty, PageHead } from "@/components/ui";
import { useI18n } from "@/i18n";
import { CATEGORY_IDS } from "@/lib/constants";
import { isPast } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { Category } from "@/lib/types";

export default function ActivitiesPage() {
  const { state, me } = useStore();
  const { t } = useI18n();
  const [category, setCategory] = useState<Category | "all">("all");
  const [view, setView] = useState<"list" | "map">("list");
  if (!me) return null;

  const list = state.activities
    .filter((a) => !isPast(state, a.start))
    .filter((a) => category === "all" || a.category === category)
    .sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="stack-lg">
      <PageHead
        title={t.senior.activitiesTitle}
        action={
          <div className="segmented" role="group" aria-label={`${t.senior.list} / ${t.senior.map}`}>
            <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>
              <Icon name="list" size={18} /> {t.senior.list}
            </button>
            <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}>
              <Icon name="map" size={18} /> {t.senior.map}
            </button>
          </div>
        }
      />

      <div className="scroll-x toggle-chips" role="group" aria-label={t.nav.activities}>
        <label className="toggle-chip">
          <input type="radio" name="category" checked={category === "all"} onChange={() => setCategory("all")} />
          {t.senior.all}
        </label>
        {CATEGORY_IDS.map((c) => (
          <label key={c} className="toggle-chip">
            <input type="radio" name="category" checked={category === c} onChange={() => setCategory(c)} />
            <Icon name={CATEGORY_ICON[c]} size={18} />
            {t.categories[c]}
          </label>
        ))}
      </div>

      {list.length === 0 ? (
        <Empty>{t.senior.noActivity}</Empty>
      ) : view === "map" ? (
        <ActivityMap key={category} activities={list} viewer={me} />
      ) : (
        <div className="grid">
          {list.map((a) => (
            <ActivityCard key={a.id} activity={a} viewer={me} />
          ))}
        </div>
      )}
    </div>
  );
}

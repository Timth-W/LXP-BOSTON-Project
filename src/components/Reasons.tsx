"use client";

import { useI18n } from "@/i18n";
import type { Reason } from "@/lib/matching";
import { activityById } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { Icon } from "./Icon";

/** "Why we suggest this": each reason is translated in the viewer's language. */
export function Reasons({ reasons }: { reasons: Reason[] }) {
  const { t, f } = useI18n();
  const { state } = useStore();
  const text = (r: Reason): string => {
    switch (r.kind) {
      case "likes":
        return t.reasons.likes(t.categories[r.category]);
      case "available":
        return t.reasons.available(f.slot(r.slot));
      case "mates":
        return t.reasons.mates(f.names(r.names));
      case "nearby":
        return t.reasons.nearby;
      case "activityMatch": {
        const a = activityById(state, r.activityId);
        return t.reasons.activityMatch(a ? f.text(a.title) : "");
      }
      case "shared":
        return t.reasons.shared(r.categories.map((c) => t.categories[c]).join(", "));
      case "inArea":
        return t.reasons.inArea(t.sectors[r.sector]);
    }
  };
  if (!reasons.length) return null;
  return (
    <ul className="reasons">
      {reasons.map((r, i) => (
        <li key={`${r.kind}-${i}`}>
          <Icon name="check" size={18} />
          <span>{text(r)}</span>
        </li>
      ))}
    </ul>
  );
}

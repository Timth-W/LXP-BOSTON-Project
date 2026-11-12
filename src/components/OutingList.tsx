"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";
import { toDate } from "@/lib/format";
import { OWNER_TONE, ownerStatus, type OutingItem } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { CATEGORY_ICON, Icon } from "./Icon";
import { Badge } from "./ui";

/** Activities and accompanied outings in one chronological list. */
export function OutingList({
  items,
  outingBase,
  linkActivities = true,
}: {
  items: OutingItem[];
  outingBase: string;
  linkActivities?: boolean;
}) {
  const { state } = useStore();
  const { t, f } = useI18n();
  return (
    <ul className="list card" style={{ paddingBlock: 4 }}>
      {items.map((item) => {
        const date = item.date;
        if (item.kind === "activity") {
          const a = item.activity;
          const body = (
            <>
              <span className="date-block" style={{ width: 54 }} aria-hidden="true">
                <span className="date-day" style={{ fontSize: "1.3rem" }}>
                  {toDate(date).getDate()}
                </span>
                <span className="date-month">{f.month(date)}</span>
              </span>
              <span className="list-body">
                <span className="list-title" style={{ display: "block" }}>
                  {f.text(a.title)}
                </span>
                <span className="muted small" style={{ display: "block" }}>
                  {f.date(date)} · {f.text(a.place)}
                </span>
              </span>
              <span className="cat-icon" aria-hidden="true">
                <Icon name={CATEGORY_ICON[a.category]} />
              </span>
            </>
          );
          return (
            <li key={`a-${a.id}`}>
              {linkActivities ? (
                <Link className="list-link" href={`/senior/activities/${a.id}`}>
                  {body}
                </Link>
              ) : (
                <div className="list-link">{body}</div>
              )}
            </li>
          );
        }
        const m = item.mission;
        const st = ownerStatus(state, m);
        return (
          <li key={`m-${m.id}`}>
            <Link className="list-link" href={`${outingBase}/${m.id}`}>
              <span className="date-block" style={{ width: 54, background: "var(--coral-soft)" }} aria-hidden="true">
                <span className="date-day" style={{ fontSize: "1.3rem" }}>
                  {toDate(date).getDate()}
                </span>
                <span className="date-month">{f.month(date)}</span>
              </span>
              <span className="list-body">
                <span className="list-title" style={{ display: "block" }}>
                  {t.outingTypes[m.type]}
                </span>
                <span className="muted small" style={{ display: "block" }}>
                  {f.date(date)} · {f.duration(m.durationMin)}
                </span>
                <span style={{ display: "block", marginTop: 6 }}>
                  <Badge tone={OWNER_TONE[st]}>{t.status.owner[st]}</Badge>
                </span>
              </span>
              <Icon name="chevronRight" className="muted" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

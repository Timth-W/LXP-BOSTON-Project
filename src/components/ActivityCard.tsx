"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n";
import { register, unregister } from "@/lib/actions";
import { toDate } from "@/lib/format";
import { attendees, isPast, isRegistered, seatsLeft } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { Activity, User } from "@/lib/types";
import { CATEGORY_ICON, Icon } from "./Icon";
import { Avatar } from "./ui";

/**
 * Activity card, inspired by the moodboard phone card ("I'm in").
 * With a senior viewer, it shows who is going and lets them sign up in one tap.
 */
export function ActivityCard({
  activity,
  viewer,
  footer,
  via = "catalogue",
  headingLevel = 3,
}: {
  activity: Activity;
  viewer?: User;
  footer?: ReactNode;
  via?: "assistant" | "catalogue";
  headingLevel?: 2 | 3;
}) {
  const { state, run } = useStore();
  const { t, f } = useI18n();
  const going = attendees(state, activity.id);
  const left = seatsLeft(state, activity);
  const past = isPast(state, activity.start);
  const mine = viewer ? isRegistered(state, activity.id, viewer.id) : false;
  const others = going.filter((u) => u.id !== viewer?.id);
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <article className="card activity-card">
      <div className="activity-top">
        <div className="date-block" aria-hidden="true">
          <span className="date-day">{toDate(activity.start).getDate()}</span>
          <span className="date-month">{f.month(activity.start)}</span>
        </div>
        <div className="min-0 stack-sm" style={{ flex: 1 }}>
          <Heading>
            {viewer?.role === "senior" ? (
              <Link href={`/senior/activities/${activity.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                {f.text(activity.title)}
              </Link>
            ) : (
              f.text(activity.title)
            )}
          </Heading>
          <div className="meta">
            <span>
              <Icon name="clock" size={16} /> {f.date(activity.start)}
            </span>
            <span>
              <Icon name="pin" size={16} /> {f.text(activity.place)}
            </span>
          </div>
        </div>
        <span className="cat-icon" title={t.categories[activity.category]}>
          <Icon name={CATEGORY_ICON[activity.category]} label={t.categories[activity.category]} />
        </span>
      </div>

      {others.length ? (
        <div className="row" style={{ gap: 10 }}>
          <span className="avatar-stack">
            {others.slice(0, 4).map((u) => (
              <Avatar key={u.id} user={{ ...u, lastName: "" }} size={34} />
            ))}
          </span>
          <span className="small">{t.activity.with(f.names(others.map((u) => u.firstName)))}</span>
        </div>
      ) : null}

      {footer}

      <div className="card-actions">
        {viewer && viewer.role === "senior" ? (
          past ? (
            <span className="badge">{t.activity.past}</span>
          ) : mine ? (
            <>
              <span className="badge badge-ok">{t.activity.registered}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => run((s) => unregister(s, activity.id, viewer.id))}>
                {t.activity.unregister}
              </button>
            </>
          ) : left > 0 ? (
            <button type="button" className="btn btn-sm" onClick={() => run((s) => register(s, activity.id, viewer.id, via))}>
              <Icon name="check" size={18} /> {t.activity.imIn}
            </button>
          ) : (
            <span className="badge badge-danger">{t.activity.full}</span>
          )
        ) : null}
        {!past && !mine ? <span className="muted small">{t.activity.seatsLeft(left)}</span> : null}
      </div>
    </article>
  );
}

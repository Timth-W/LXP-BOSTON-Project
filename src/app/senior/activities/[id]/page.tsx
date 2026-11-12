"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CATEGORY_ICON, Icon } from "@/components/Icon";
import { BackLink, Empty, Person } from "@/components/ui";
import { useI18n } from "@/i18n";
import { register, unregister } from "@/lib/actions";
import { activityById, attendees, isPast, isRegistered, seatsLeft } from "@/lib/selectors";
import { useStore } from "@/lib/store";

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const { state, me, run } = useStore();
  const { t, f } = useI18n();
  if (!me) return null;
  const senior = me;
  const a = activityById(state, id);
  if (!a) {
    return (
      <Empty icon="alert" action={<Link href="/senior/activities">{t.common.back}</Link>}>
        {t.common.notFound}
      </Empty>
    );
  }
  const activity = a;
  const going = attendees(state, a.id);
  const others = going.filter((u) => u.id !== senior.id);
  const mine = isRegistered(state, a.id, senior.id);
  const left = seatsLeft(state, a);
  const past = isPast(state, a.start);

  return (
    <div className="stack-lg">
      <BackLink href="/senior/activities" />
      <header className="stack">
        <span className="chip" style={{ alignSelf: "flex-start" }}>
          <Icon name={CATEGORY_ICON[a.category]} size={16} /> {t.categories[a.category]}
        </span>
        <h1>{f.text(a.title)}</h1>
        <p style={{ fontSize: "1.1rem", maxWidth: "62ch" }}>{f.text(a.description)}</p>
      </header>

      <div className="split">
        <section className="card">
          <div className="meta" style={{ fontSize: "1.02rem", color: "var(--text)", gap: 10 }}>
            <span>
              <Icon name="calendar" size={20} /> {f.date(a.start)}
            </span>
            <span>
              <Icon name="pin" size={20} /> {f.text(a.place)} · {t.sectors[a.sector]}
            </span>
            <span>
              <Icon name="users" size={20} /> {t.activity.organizer} {f.text(a.organizer)}
            </span>
          </div>
          <div className="card-actions">
            {past ? (
              <span className="badge">{t.activity.past}</span>
            ) : mine ? (
              <>
                <span className="badge badge-ok">{t.activity.registered}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => run((s) => unregister(s, activity.id, senior.id))}>
                  {t.activity.unregister}
                </button>
              </>
            ) : left > 0 ? (
              <button
                type="button"
                className="btn btn-block-mobile"
                onClick={() => run((s) => register(s, activity.id, senior.id, "catalogue"))}
              >
                <Icon name="check" /> {t.activity.imIn}
              </button>
            ) : (
              <span className="badge badge-danger">{t.activity.full}</span>
            )}
            {!past ? <span className="muted">{t.activity.seatsLeft(left)}</span> : null}
          </div>
        </section>

        {!past ? (
          <section className="card card-sage">
            <h2 style={{ fontSize: "1.2rem" }} className="row">
              <Icon name="heart" /> {t.activity.goWithCompanion}
            </h2>
            <p>{t.activity.goWithCompanionHelp}</p>
            <Link href={`/senior/outings/new?activity=${a.id}`} className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start" }}>
              {t.senior.newOuting}
            </Link>
          </section>
        ) : null}
      </div>

      <section className="stack">
        <h2>{t.activity.whoGoes}</h2>
        {others.length ? (
          <div className="grid">
            {others.map((u) => {
              const shared = u.interests.filter((i) => senior.interests.includes(i));
              return (
                <div key={u.id} className="card card-flat" style={{ padding: 16 }}>
                  <Person
                    user={u}
                    showLastName={false}
                    subtitle={
                      shared.length
                        ? `${t.activity.sharesInterests}: ${shared.map((c) => t.categories[c].toLowerCase()).join(", ")}`
                        : undefined
                    }
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <Empty icon="users">{t.activity.nobodyYet}</Empty>
        )}
      </section>
    </div>
  );
}

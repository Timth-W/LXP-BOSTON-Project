"use client";

import Link from "next/link";
import { ActivityCard } from "@/components/ActivityCard";
import { Icon } from "@/components/Icon";
import { JoyHero } from "@/components/joy/JoyHero";
import { OutingList } from "@/components/OutingList";
import { useI18n } from "@/i18n";
import { rankActivities } from "@/lib/matching";
import { pendingOffers, upcomingOutings, userById } from "@/lib/selectors";
import { useStore } from "@/lib/store";

export default function SeniorHome() {
  const { state, me } = useStore();
  const { t, f } = useI18n();
  if (!me) return null;

  const next = upcomingOutings(state, me.id).slice(0, 1);
  const suggestions = rankActivities(state, me, undefined, 2);
  const withOffers = state.missions.filter((m) => m.seniorId === me.id && m.status === "open" && pendingOffers(state, m.id).length);

  return (
    <div className="stack-lg">
      <header className="stack-sm">
        <span className="eyebrow">{f.day(state.now)}</span>
        <h1>{t.senior.hello(me.firstName)}</h1>
      </header>

      {withOffers.map((m) => (
        <Link key={m.id} href={`/senior/outings/${m.id}`} className="notice notice-warn" style={{ textDecoration: "none" }}>
          <Icon name="bell" />
          <strong>
            {t.senior.offersWaiting(
              f.names(pendingOffers(state, m.id).map((o) => userById(state, o.companionId)?.firstName ?? "")),
              f.date(m.start),
            )}
          </strong>
        </Link>
      ))}

      <JoyHero role="senior" />

      {next.length ? (
        <section className="stack">
          <div className="section-title">
            <h2>{t.senior.nextOuting}</h2>
            <Link href="/senior/outings" className="link-btn">
              {t.common.seeAll} <Icon name="chevronRight" size={18} />
            </Link>
          </div>
          <OutingList items={next} outingBase="/senior/outings" />
        </section>
      ) : null}

      {suggestions.length ? (
        <section className="stack">
          <div className="section-title">
            <h2>{t.senior.forYou}</h2>
            <Link href="/senior/activities" className="link-btn">
              {t.common.seeAll} <Icon name="chevronRight" size={18} />
            </Link>
          </div>
          <div className="grid">
            {suggestions.map((r) => (
              <ActivityCard key={r.item.id} activity={r.item} viewer={me} via="assistant" />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

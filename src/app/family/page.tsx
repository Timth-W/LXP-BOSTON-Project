"use client";

import Link from "next/link";
import { ConnectForm } from "@/components/FamilyLinks";
import { JoyHero } from "@/components/joy/JoyHero";
import { Icon } from "@/components/Icon";
import { OutingList } from "@/components/OutingList";
import { SeniorSwitcher } from "@/components/SeniorSwitcher";
import { Empty, PageHead, Person, useToast } from "@/components/ui";
import { useI18n } from "@/i18n";
import { buyGiftCard } from "@/lib/actions";
import { PRICING } from "@/lib/constants";
import { giftMinutesLeft, isolationStatus, linksOfFamily, upcomingOutings } from "@/lib/selectors";
import { useActiveSenior } from "@/lib/useActiveSenior";
import { useStore } from "@/lib/store";

export default function FamilyHome() {
  const { state, me, run } = useStore();
  const { t, f } = useI18n();
  const { seniors, senior, choose } = useActiveSenior();
  const [toast, showToast] = useToast();
  if (!me) return null;
  const family = me;

  if (!senior) {
    return (
      <div className="stack-lg">
        <PageHead title={t.family.hello(family.firstName)} lead={t.family.lead} />
        <section className="card" style={{ maxWidth: 760 }}>
          <h2 className="row" style={{ gap: 10 }}>
            <Icon name="link" /> {t.family.connectTitle}
          </h2>
          <p className="muted">{t.family.connectLead}</p>
          <ConnectForm family={family} onLinked={choose} />
        </section>
      </div>
    );
  }

  const target = senior;
  const link = linksOfFamily(state, family.id).find((l) => l.seniorId === target.id);
  const iso = isolationStatus(state, target.id);
  const upcoming = upcomingOutings(state, target.id).slice(0, 3);
  const gift = giftMinutesLeft(state, target.id);
  const nextDate = iso.next?.date ?? null;

  return (
    <div className="stack-lg">
      <PageHead
        title={t.family.hello(family.firstName)}
        action={
          <Link href="/family/book" className="btn btn-block-mobile">
            <Icon name="plus" /> {t.family.book}
          </Link>
        }
      />
      <SeniorSwitcher seniors={seniors} value={target.id} onChange={choose} />
      <JoyHero role="family" />

      {iso.alert ? (
        <div className="notice notice-warn" role="status">
          <Icon name="alert" />
          <div className="stack-sm">
            <strong>{t.family.alertTitle(target.firstName)}</strong>
            <span>{t.family.alertText}</span>
            <Link href="/family/book" className="btn btn-sm" style={{ alignSelf: "flex-start" }}>
              {t.family.bookFor(target.firstName)}
            </Link>
          </div>
        </div>
      ) : null}

      <section className="card">
        <Person user={target} size={56} subtitle={link ? t.family.yourRelation(t.relations[link.relation]) : undefined} />
        <div className="stats">
          <div className="stat">
            <span className="stat-label">{t.family.lastOuting}</span>
            <span className="stat-value" style={{ fontSize: "1.25rem" }}>
              {iso.daysSince === null ? t.family.never : t.family.daysAgo(iso.daysSince)}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">{t.family.nextOuting}</span>
            <span className="stat-value" style={{ fontSize: "1.25rem" }}>
              {nextDate ? f.date(nextDate) : t.family.noNext}
            </span>
          </div>
        </div>
      </section>

      <div className="split">
        <section className="stack">
          <h2>{t.family.upcomingFor(target.firstName)}</h2>
          {upcoming.length ? (
            <OutingList items={upcoming} outingBase="/family/outings" linkActivities={false} />
          ) : (
            <Empty
              icon="calendar"
              action={
                <Link href="/family/book" className="btn btn-sm">
                  {t.family.book}
                </Link>
              }
            >
              {t.family.noNext}
            </Empty>
          )}
        </section>

        <section className="card card-sage" style={{ gap: 10 }}>
          <h2 className="row" style={{ gap: 10, fontSize: "1.15rem" }}>
            <Icon name="gift" /> {t.family.giftTitle}
          </h2>
          <p className="small">{t.family.giftBalance(f.hours(gift))}</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ alignSelf: "flex-start" }}
            onClick={() => {
              run((s) => buyGiftCard(s, family.id, target.id));
              showToast(t.family.giftDone);
            }}
          >
            {t.family.giftBuy} · {f.money(PRICING.giftCard.priceCents)}
          </button>
        </section>
      </div>
      {toast}
    </div>
  );
}

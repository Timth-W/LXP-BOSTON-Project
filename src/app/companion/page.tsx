"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { JoyHero } from "@/components/joy/JoyHero";
import { Badge, Empty, PageHead } from "@/components/ui";
import { useI18n } from "@/i18n";
import { rankMissions } from "@/lib/matching";
import { priceFor } from "@/lib/pricing";
import { COMPANION_TONE, companionStatus, missionForCompanion } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { Mission } from "@/lib/types";

type Tab = "reco" | "mine";

export default function CompanionHome() {
  const { state, me } = useStore();
  const { t, f } = useI18n();
  const [tab, setTab] = useState<Tab>("reco");
  if (!me) return null;
  const companion = me;

  const recommended = rankMissions(state, companion);
  const mine = state.missions
    .filter((m) => state.offers.some((o) => o.missionId === m.id && o.companionId === companion.id && o.status !== "withdrawn"))
    .sort((a, b) => b.start.localeCompare(a.start));
  const list: Mission[] = tab === "reco" ? recommended.map((r) => r.item) : mine;

  return (
    <div className="stack-lg">
      <PageHead title={t.companion.hello(companion.firstName)} />
      <JoyHero role="companion" />

      {!companion.companion?.verified ? (
        <div className="notice notice-warn">
          <Icon name="shield" />
          <p>{t.companion.notVerified}</p>
        </div>
      ) : null}
      {!companion.availability.length ? (
        <Link href="/companion/profile" className="notice notice-coral" style={{ textDecoration: "none" }}>
          <Icon name="calendar" />
          <span>{t.companion.noAvailability}</span>
        </Link>
      ) : null}

      <div className="segmented" role="group" aria-label={t.nav.missions} style={{ alignSelf: "flex-start" }}>
        <button type="button" aria-pressed={tab === "reco"} onClick={() => setTab("reco")}>
          <Icon name="sparkle" size={18} /> {t.companion.recommended} ({recommended.length})
        </button>
        <button type="button" aria-pressed={tab === "mine"} onClick={() => setTab("mine")}>
          <Icon name="heart" size={18} /> {t.companion.myMissions} ({mine.length})
        </button>
      </div>

      {list.length ? (
        <div className="grid">
          {list.map((m) => {
            const v = missionForCompanion(state, m, companion.id);
            const st = companionStatus(state, m, companion.id);
            return (
              <Link key={m.id} href={`/companion/missions/${m.id}`} className="card card-link">
                <div className="row-between">
                  <span className="eyebrow">{t.outingTypes[m.type]}</span>
                  <Badge tone={COMPANION_TONE[st]}>{t.status.companion[st]}</Badge>
                </div>
                <h2 style={{ fontSize: "1.15rem" }}>{t.companion.withSenior(v.seniorFirstName, f.date(m.start))}</h2>
                <div className="meta">
                  <span>
                    <Icon name="clock" size={16} /> {f.duration(m.durationMin)}
                  </span>
                  <span>
                    <Icon name="euro" size={16} /> {t.companion.youEarn(f.money(priceFor(m.durationMin).companionCents))}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <Empty icon="bench">{tab === "reco" ? t.companion.noMission : t.companion.noMyMissions}</Empty>
      )}
    </div>
  );
}

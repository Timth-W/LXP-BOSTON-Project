"use client";

import Link from "next/link";
import { Empty, PageHead } from "@/components/ui";
import { useI18n } from "@/i18n";
import { priceFor } from "@/lib/pricing";
import { companionStatus, userById } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { Mission } from "@/lib/types";

export default function EarningsPage() {
  const { state, me } = useStore();
  const { t, f } = useI18n();
  if (!me) return null;
  const companion = me;
  const mine = state.missions.filter((m) => ["confirmed", "done"].includes(companionStatus(state, m, companion.id)));
  const done = mine.filter((m) => m.status === "done");
  const upcoming = mine.filter((m) => m.status === "confirmed");
  const total = (list: Mission[]) => list.reduce((sum, m) => sum + priceFor(m.durationMin).companionCents, 0);

  return (
    <div className="stack-lg">
      <PageHead title={t.companion.earningsTitle} lead={t.companion.earningsLead} />
      <div className="stats">
        <div className="card stat">
          <span className="stat-value">{f.money(total(done))}</span>
          <span className="stat-label">{t.companion.earned}</span>
        </div>
        <div className="card stat">
          <span className="stat-value">{f.money(total(upcoming))}</span>
          <span className="stat-label">{t.companion.pending}</span>
        </div>
        <div className="card stat">
          <span className="stat-value">{done.length}</span>
          <span className="stat-label">{t.companion.outingsDone}</span>
        </div>
      </div>

      <section className="stack">
        <h2>{t.companion.history}</h2>
        {mine.length ? (
          <ul className="list card" style={{ paddingBlock: 4 }}>
            {[...mine]
              .sort((a, b) => b.start.localeCompare(a.start))
              .map((m) => (
                <li key={m.id}>
                  <Link className="list-link" href={`/companion/missions/${m.id}`}>
                    <span className="list-body">
                      <span className="list-title" style={{ display: "block" }}>
                        {t.companion.withSenior(userById(state, m.seniorId)?.firstName ?? "", f.short(m.start))}
                      </span>
                      <span className="muted small">
                        {t.outingTypes[m.type]} · {f.duration(m.durationMin)} ·{" "}
                        {m.status === "done" ? t.companion.statusPaid : t.companion.statusPending}
                      </span>
                    </span>
                    <strong style={{ color: "var(--navy)", fontVariantNumeric: "tabular-nums" }}>
                      {f.money(priceFor(m.durationMin).companionCents)}
                    </strong>
                  </Link>
                </li>
              ))}
          </ul>
        ) : (
          <Empty
            action={
              <Link href="/companion" className="btn btn-sm">
                {t.nav.missions}
              </Link>
            }
          >
            {t.companion.noEarnings}
          </Empty>
        )}
      </section>
      <p className="muted small">{t.companion.earningsNote}</p>
    </div>
  );
}

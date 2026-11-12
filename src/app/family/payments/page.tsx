"use client";

import Link from "next/link";
import { Badge, Empty, PageHead } from "@/components/ui";
import { useI18n } from "@/i18n";
import { missionById, userById, type StatusTone } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { PaymentStatus } from "@/lib/types";

const TONE: Record<PaymentStatus, StatusTone> = { authorized: "info", captured: "ok", refunded: "neutral" };

export default function FamilyPaymentsPage() {
  const { state, me } = useStore();
  const { t, f } = useI18n();
  if (!me) return null;
  const payments = state.payments.filter((p) => p.payerId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const cards = state.giftCards.filter((g) => g.buyerId === me.id);
  const paid =
    payments.filter((p) => p.status === "captured").reduce((s, p) => s + p.cardCents, 0) + cards.reduce((s, g) => s + g.priceCents, 0);
  const held = payments.filter((p) => p.status === "authorized").reduce((s, p) => s + p.cardCents, 0);

  return (
    <div className="stack-lg">
      <PageHead title={t.family.paymentsTitle} lead={t.family.paymentsLead} />
      <div className="stats">
        <div className="card stat">
          <span className="stat-value">{f.money(paid)}</span>
          <span className="stat-label">{t.family.totalPaid}</span>
        </div>
        <div className="card stat">
          <span className="stat-value">{f.money(held)}</span>
          <span className="stat-label">{t.family.onHold}</span>
        </div>
      </div>

      <section className="stack">
        <h2>{t.nav.outings}</h2>
        {payments.length ? (
          <ul className="list card" style={{ paddingBlock: 4 }}>
            {payments.map((p) => {
              const m = missionById(state, p.missionId);
              const senior = m ? userById(state, m.seniorId) : undefined;
              return (
                <li key={p.id}>
                  <Link className="list-link" href={`/family/outings/${p.missionId}`}>
                    <span className="list-body">
                      <span className="list-title" style={{ display: "block" }}>
                        {m ? t.outingTypes[m.type] : ""} · {senior?.firstName}
                      </span>
                      <span className="muted small" style={{ display: "block" }}>
                        {m ? f.date(m.start) : ""}
                      </span>
                      <span style={{ display: "block", marginTop: 6 }}>
                        <Badge tone={TONE[p.status]}>{t.status.payment[p.status]}</Badge>
                      </span>
                    </span>
                    <strong style={{ color: "var(--navy)", fontVariantNumeric: "tabular-nums" }}>{f.money(p.cardCents)}</strong>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty icon="wallet">{t.family.noPayments}</Empty>
        )}
      </section>

      {cards.length ? (
        <section className="stack">
          <h2>{t.family.giftCards}</h2>
          <ul className="list card" style={{ paddingBlock: 4 }}>
            {cards.map((g) => (
              <li key={g.id}>
                <span className="list-body">
                  <span className="list-title" style={{ display: "block" }}>
                    {f.hours(g.minutesTotal)} · {userById(state, g.seniorId)?.firstName}
                  </span>
                  <span className="muted small">
                    {f.short(g.createdAt)} · {t.family.giftBalance(f.hours(g.minutesLeft))}
                  </span>
                </span>
                <strong style={{ color: "var(--navy)" }}>{f.money(g.priceCents)}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

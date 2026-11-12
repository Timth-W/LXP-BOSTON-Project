"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/Icon";
import { Reasons } from "@/components/Reasons";
import { BackLink, Badge, Empty, Interests, PageHead, Stars } from "@/components/ui";
import { useI18n } from "@/i18n";
import { companionCancel, completeMission, offerHelp, withdrawOffer } from "@/lib/actions";
import { isCompatible, rankMissions } from "@/lib/matching";
import { priceFor } from "@/lib/pricing";
import { activityById, COMPANION_TONE, companionStatus, isPast, missionById, missionForCompanion } from "@/lib/selectors";
import { useStore } from "@/lib/store";

export default function CompanionMissionPage() {
  const { id } = useParams<{ id: string }>();
  const { state, me, run } = useStore();
  const { t, f } = useI18n();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  if (!me) return null;
  const companion = me;
  const m = missionById(state, id);
  const st = m ? companionStatus(state, m, companion.id) : null;
  // Private details (full name, meeting point) are filtered by missionForCompanion below.
  if (!m || !st) {
    return (
      <Empty icon="alert" action={<Link href="/companion">{t.common.back}</Link>}>
        {t.common.notFound}
      </Empty>
    );
  }
  const mission = m;
  const v = missionForCompanion(state, m, companion.id);
  const activity = activityById(state, m.activityId);
  const reco = rankMissions(state, companion).find((r) => r.item.id === m.id);
  const price = priceFor(m.durationMin);
  const past = isPast(state, m.start);

  function submitCancel(e: FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    run((s) => companionCancel(s, mission.id, companion.id, reason.trim()));
    setCancelling(false);
    setReason("");
  }

  return (
    <div className="stack-lg">
      <BackLink href="/companion" />
      <PageHead
        eyebrow={t.outingTypes[m.type]}
        title={t.companion.withSenior(v.seniorFirstName, f.date(m.start))}
        lead={`${f.duration(m.durationMin)} · ${t.sectors[m.sector]}`}
        action={<Badge tone={COMPANION_TONE[st]}>{t.status.companion[st]}</Badge>}
      />

      <div className="split">
        <section className="card">
          {m.note ? (
            <div className="stack-sm">
              <span className="label">{t.companion.seniorNote}</span>
              <p>“{m.note}”</p>
            </div>
          ) : null}
          {activity ? (
            <div className="meta">
              <span>
                <Icon name="calendar" size={16} /> {f.text(activity.title)} · {f.text(activity.place)}
              </span>
            </div>
          ) : null}
          <div className="stack-sm">
            <span className="label">{t.companion.interestsOf(v.seniorFirstName)}</span>
            <Interests list={v.seniorInterests} highlight={companion.interests} />
          </div>
          {reco ? (
            <div className="stack-sm">
              <span className="label">{t.companion.why}</span>
              <Reasons reasons={reco.reasons} />
            </div>
          ) : null}
          <div className="price-box">
            <div className="price-line price-total" style={{ borderTop: 0, paddingTop: 0 }}>
              <span>{t.companion.earnLabel}</span>
              <span>{f.money(price.companionCents)}</span>
            </div>
          </div>

          <div className="card-actions">
            {st === "available" ? (
              isCompatible(state, m, companion) ? (
                <button type="button" className="btn btn-block-mobile" onClick={() => run((s) => offerHelp(s, mission.id, companion.id))}>
                  <Icon name="heart" /> {t.companion.offer}
                </button>
              ) : (
                <>
                  <button type="button" className="btn" disabled>
                    {t.companion.offer}
                  </button>
                  <span className="muted small">{t.companion.outOfArea}</span>
                </>
              )
            ) : null}
            {st === "offered" ? (
              <>
                <span className="muted">{t.companion.waiting(v.seniorFirstName)}</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => run((s) => withdrawOffer(s, mission.id, companion.id))}
                >
                  {t.companion.withdraw}
                </button>
              </>
            ) : null}
            {st === "confirmed" && past ? (
              <button type="button" className="btn" onClick={() => run((s) => completeMission(s, mission.id))}>
                <Icon name="check" /> {t.companion.complete}
              </button>
            ) : null}
            {st === "confirmed" && !cancelling ? (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setCancelling(true)}>
                {t.companion.cancelTitle}
              </button>
            ) : null}
          </div>
          {st === "confirmed" && !past ? <p className="muted small">{t.companion.completeLater}</p> : null}
          {cancelling ? (
            <form className="form card card-soft" onSubmit={submitCancel}>
              <div className="field">
                <label htmlFor="cc-reason">{t.companion.cancelReason}</label>
                <input id="cc-reason" className="input" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
                <small>{t.companion.cancelHelp}</small>
              </div>
              <div className="row">
                <button className="btn btn-danger-solid btn-sm" type="submit" disabled={!reason.trim()}>
                  {t.companion.confirmCancel}
                </button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setCancelling(false)}>
                  {t.companion.keep}
                </button>
              </div>
            </form>
          ) : null}
          {m.status === "done" && m.rating && st === "done" ? (
            <div className="stack-sm">
              <span className="label">{t.companion.reviewReceived}</span>
              <p>
                <Stars value={m.rating} /> {m.review}
              </p>
            </div>
          ) : null}
        </section>

        <section className={`card ${v.unlocked ? "card-sage" : "card-soft"}`} aria-live="polite">
          <h2 className="row" style={{ fontSize: "1.2rem", gap: 10 }}>
            <Icon name={v.unlocked ? "unlock" : "lock"} /> {v.unlocked ? t.companion.infoTitle : t.companion.lockedTitle}
          </h2>
          {v.unlocked ? (
            <div className="stack-sm">
              <p className="small muted">{t.companion.unlocked}</p>
              <p className="strong" style={{ color: "var(--navy)", fontSize: "1.1rem" }}>
                {v.seniorFirstName} {v.seniorLastName}
              </p>
              <p className="row" style={{ gap: 8, alignItems: "flex-start", flexWrap: "nowrap" }}>
                <Icon name="pin" /> <span>{v.meetingPoint}</span>
              </p>
            </div>
          ) : (
            <p className="muted">{t.companion.locked}</p>
          )}
        </section>
      </div>
    </div>
  );
}

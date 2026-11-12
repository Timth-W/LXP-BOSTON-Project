"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/i18n";
import { acceptOffer, cancelMission, completeMission, declineOffer, rateMission } from "@/lib/actions";
import {
  activityById,
  companionOf,
  isLinked,
  isPast,
  missionById,
  OWNER_TONE,
  ownerStatus,
  paymentFor,
  pendingOffers,
  userById,
} from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { StatusTone } from "@/lib/selectors";
import type { PaymentStatus, User } from "@/lib/types";
import { Icon } from "./Icon";
import { BackLink, Badge, Empty, Interests, PageHead, Person, Stars } from "./ui";

const PAYMENT_TONE: Record<PaymentStatus, StatusTone> = { authorized: "info", captured: "ok", refunded: "neutral" };

/** Detail of an accompanied outing, seen by the senior or by a relative. */
export function OutingDetail({ missionId, viewer, backHref }: { missionId: string; viewer: User; backHref: string }) {
  const { state, run } = useStore();
  const { t, f } = useI18n();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");

  const m = missionById(state, missionId);
  const allowed =
    m && (viewer.id === m.seniorId || viewer.id === m.payerId || viewer.id === m.bookedById || isLinked(state, m.seniorId, viewer.id));
  if (!m || !allowed) {
    return (
      <Empty action={<Link href={backHref}>{t.common.back}</Link>} icon="alert">
        {t.common.notFound}
      </Empty>
    );
  }

  const mission = m;
  const senior = userById(state, m.seniorId);
  const payer = userById(state, m.payerId);
  const booker = userById(state, m.bookedById);
  const activity = activityById(state, m.activityId);
  const companion = companionOf(state, m.id);
  const offers = pendingOffers(state, m.id);
  const payment = paymentFor(state, m.id);
  const status = ownerStatus(state, m);
  const past = isPast(state, m.start);
  const isSenior = viewer.id === m.seniorId;
  const canCancel = isSenior || viewer.id === m.payerId || viewer.id === m.bookedById;

  function submitCancel(e: FormEvent) {
    e.preventDefault();
    run((s) => cancelMission(s, mission.id, reason.trim() || t.outing.noReason));
    setCancelling(false);
  }

  function submitRating(e: FormEvent) {
    e.preventDefault();
    run((s) => rateMission(s, mission.id, rating, review.trim()));
  }

  const steps = [
    { label: t.outing.published, done: true },
    { label: t.outing.companionChosen, done: m.status === "confirmed" || m.status === "done" },
    { label: t.outing.happened, done: m.status === "done" },
  ];
  const currentStep = steps.findIndex((s) => !s.done);

  return (
    <div className="stack-lg">
      <BackLink href={backHref} />
      <PageHead
        title={t.outingTypes[m.type]}
        lead={`${f.date(m.start)} · ${f.duration(m.durationMin)} · ${t.sectors[m.sector]}`}
        action={<Badge tone={OWNER_TONE[status]}>{t.status.owner[status]}</Badge>}
      />

      {m.status !== "cancelled" ? (
        <ol className="steps" aria-label={t.outing.progress}>
          {steps.map((st, i) => (
            <li key={st.label} className={st.done ? "done" : i === currentStep ? "current" : undefined}>
              {st.label}
            </li>
          ))}
        </ol>
      ) : (
        <div className="notice notice-warn">
          <Icon name="alert" />
          <p>{t.outing.cancelled(m.cancelReason ?? "")}</p>
        </div>
      )}

      <div className="split">
        <section className="card">
          <h2 style={{ fontSize: "1.2rem" }}>{t.outing.details}</h2>
          {m.note ? <p>“{m.note}”</p> : null}
          <div className="meta">
            {activity ? (
              <span>
                <Icon name="calendar" size={16} />
                {isSenior ? <Link href={`/senior/activities/${activity.id}`}>{f.text(activity.title)}</Link> : f.text(activity.title)}
              </span>
            ) : null}
            <span>
              <Icon name="pin" size={16} />
              {t.outing.meetingAt(m.meetingPoint)}
            </span>
            {!isSenior && senior ? (
              <span>
                <Icon name="user" size={16} />
                {t.outing.forName(senior.firstName)}
              </span>
            ) : null}
            {booker && booker.id !== m.seniorId ? (
              <span>
                <Icon name="users" size={16} />
                {t.outing.bookedBy(booker.id === viewer.id ? t.common.you : booker.firstName)}
              </span>
            ) : null}
          </div>
        </section>

        <section className="card">
          <h2 style={{ fontSize: "1.2rem" }}>{t.outing.payment}</h2>
          {payment ? (
            <>
              <div className="price-line">
                <span>{t.outing.price}</span>
                <strong>{f.money(payment.amountCents)}</strong>
              </div>
              {payment.giftMinutes ? (
                <div className="price-line">
                  <span>
                    <Icon name="gift" size={16} /> {t.outing.coveredByGift}
                  </span>
                  <span>{f.duration(payment.giftMinutes)}</span>
                </div>
              ) : null}
              <div className="price-line">
                <span>{t.outing.paidBy(payer?.id === viewer.id ? t.common.you : (payer?.firstName ?? ""))}</span>
                <span>{f.money(payment.cardCents)}</span>
              </div>
              <div>
                <Badge tone={PAYMENT_TONE[payment.status]}>{t.status.payment[payment.status]}</Badge>
              </div>
            </>
          ) : (
            <p className="muted">{t.outing.noPayment}</p>
          )}
        </section>
      </div>

      {m.status === "open" ? (
        <section className="stack">
          <h2>{t.outing.offers}</h2>
          {offers.length === 0 ? (
            <Empty icon="bell">{t.outing.noOffers}</Empty>
          ) : (
            <div className="grid">
              {offers.map((o) => {
                const c = userById(state, o.companionId);
                if (!c) return null;
                return (
                  <article key={o.id} className="card">
                    <Person user={c} showLastName={false} subtitle={c.companion?.verified ? t.common.verified : t.common.unverified} />
                    {c.bio ? <p>{f.text(c.bio)}</p> : null}
                    <Interests list={c.interests} highlight={senior?.interests} />
                    <div className="card-actions">
                      <button type="button" className="btn btn-sm" onClick={() => run((s) => acceptOffer(s, o.id))}>
                        <Icon name="check" size={18} /> {t.outing.accept(c.firstName)}
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => run((s) => declineOffer(s, o.id))}>
                        {t.outing.decline}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {companion && (m.status === "confirmed" || m.status === "done") ? (
        <section className="card card-sage">
          <h2 style={{ fontSize: "1.2rem" }}>{isSenior ? t.outing.yourCompanion : t.outing.companion}</h2>
          <Person user={companion} showLastName={false} subtitle={companion.companion?.verified ? t.common.verified : undefined} />
          {companion.bio ? <p>{f.text(companion.bio)}</p> : null}
          <Interests list={companion.interests} highlight={senior?.interests} />
        </section>
      ) : null}

      {m.status === "done" ? (
        <section className="card">
          <h2 style={{ fontSize: "1.2rem" }}>{t.outing.review}</h2>
          {m.rating ? (
            <p>
              <Stars value={m.rating} /> {m.review}
            </p>
          ) : isSenior ? (
            <form className="form" onSubmit={submitRating}>
              <fieldset className="field">
                <legend>{t.outing.rating}</legend>
                <div className="star-input">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className={n <= rating ? "on" : undefined}>
                      <input
                        type="radio"
                        name="rating"
                        value={n}
                        checked={rating === n}
                        onChange={() => setRating(n)}
                        aria-label={t.outing.ratingValue(n)}
                      />
                      <Icon name="star" size={32} />
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="field">
                <label htmlFor="rt-review">
                  {t.outing.reviewText} <span className="muted small">({t.common.optional})</span>
                </label>
                <input id="rt-review" className="input" value={review} maxLength={300} onChange={(e) => setReview(e.target.value)} />
              </div>
              <div className="row">
                <button className="btn btn-sm" type="submit">
                  {t.outing.sendReview}
                </button>
              </div>
            </form>
          ) : (
            <p className="muted">{t.outing.noReviewYet(senior?.firstName ?? "")}</p>
          )}
        </section>
      ) : null}

      {canCancel && (m.status === "open" || m.status === "confirmed") ? (
        <section className="stack">
          <div className="row">
            {m.status === "confirmed" && past ? (
              <button type="button" className="btn" onClick={() => run((s) => completeMission(s, mission.id))}>
                <Icon name="check" /> {t.outing.markDone}
              </button>
            ) : null}
            {!cancelling ? (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setCancelling(true)}>
                {t.outing.cancel}
              </button>
            ) : null}
          </div>
          {m.status === "confirmed" && !past ? <p className="muted small">{t.outing.markDoneLater}</p> : null}
          {cancelling ? (
            <form className="card form" onSubmit={submitCancel}>
              <div className="field">
                <label htmlFor="cx-reason">
                  {t.outing.cancelReason} <span className="muted small">({t.common.optional})</span>
                </label>
                <input id="cx-reason" className="input" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
                <small>
                  {companion && m.status === "confirmed" ? t.outing.cancelHelpCompanion(companion.firstName) : t.outing.cancelHelp}
                </small>
              </div>
              <div className="row">
                <button className="btn btn-danger-solid btn-sm" type="submit">
                  {t.outing.confirmCancel}
                </button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setCancelling(false)}>
                  {t.outing.keep}
                </button>
              </div>
            </form>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

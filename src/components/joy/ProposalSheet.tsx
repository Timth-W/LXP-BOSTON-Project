"use client";

/**
 * Confirmation sheet opened by a tap on a proposal (or by Joy when the person says yes).
 * This is the only place where Joy's proposals turn into real actions, always after a tap.
 */
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useI18n } from "@/i18n";
import { acceptOffer, buyGiftCard, createMission, offerHelp, register } from "@/lib/actions";
import { PRICING } from "@/lib/constants";
import { addMinutes, toLocalIso, toDate } from "@/lib/format";
import { isCompatible } from "@/lib/matching";
import type { Proposal } from "@/lib/joy/proposals";
import { proposalCard, when } from "@/lib/joy/script";
import { priceFor, splitPayment } from "@/lib/pricing";
import { activityById, attendees, giftMinutesLeft, isRegistered, missionById, pendingOffers, seatsLeft, userById } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { Icon } from "../Icon";
import { Avatar, Person } from "../ui";

export interface Confirmation {
  /** Sent to GPT Realtime (English, factual). */
  app: string;
  /** Said by the demo voice, in the user's language. */
  spoken: string;
}

function defaultStart(now: string) {
  const d = toDate(now);
  d.setDate(d.getDate() + 2);
  d.setHours(14, 30, 0, 0);
  return toLocalIso(d);
}

export function ProposalSheet({
  proposal,
  viewer,
  onClose,
  onConfirmed,
}: {
  proposal: Proposal;
  viewer: User;
  onClose: () => void;
  onConfirmed: (c: Confirmation) => void;
}) {
  const { state, run } = useStore();
  const { t, f, locale } = useI18n();
  const x = { t, f, locale };
  const card = proposalCard(proposal, state, viewer, x);
  const panelRef = useRef<HTMLDivElement>(null);
  const senior = "seniorId" in proposal ? userById(state, proposal.seniorId) : undefined;
  const lastMeeting = senior ? [...state.missions].reverse().find((m) => m.seniorId === senior.id)?.meetingPoint : undefined;
  const [meetingPoint, setMeetingPoint] = useState(lastMeeting ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const activity = "activityId" in proposal ? activityById(state, proposal.activityId) : undefined;

  function confirmJoin() {
    if (proposal.kind !== "join" || !activity) return;
    run((s) => register(s, activity.id, proposal.seniorId, "assistant"));
    onConfirmed({ app: `The user signed up for "${f.text(activity.title)}".`, spoken: t.joy.ack.join(f.text(activity.title)) });
  }

  function confirmBook(e: FormEvent) {
    e.preventDefault();
    if (proposal.kind !== "book" || !senior) return;
    if (!meetingPoint.trim()) return setError(t.joy.sheet.meetingError);
    run((s) =>
      createMission(s, {
        seniorId: senior.id,
        bookedById: viewer.id,
        payerId: viewer.id,
        activityId: activity?.id ?? null,
        type: activity ? "activity" : "walk",
        note: "",
        start: activity ? addMinutes(activity.start, -15) : defaultStart(state.now),
        durationMin: activity ? 150 : 90,
        sector: activity?.sector ?? senior.sector,
        meetingPoint: meetingPoint.trim(),
        via: "assistant",
      }),
    );
    onConfirmed({ app: "The companion request was published and the payment is on hold.", spoken: t.joy.ack.book });
  }

  const sheetTitle = card.title;
  let body: React.ReactNode = null;
  let actions: React.ReactNode = null;

  if (proposal.kind === "join" && activity) {
    const going = attendees(state, activity.id).filter((u) => u.id !== proposal.seniorId);
    const done = isRegistered(state, activity.id, proposal.seniorId);
    body = (
      <>
        <p className="sheet-when">{when(activity.start, state.now, x)}</p>
        <p className="muted">
          <Icon name="pin" size={18} /> {f.text(activity.place)}
        </p>
        <p>{f.text(activity.description)}</p>
        {going.length ? (
          <div className="row" style={{ gap: 10 }}>
            <span className="avatar-stack">
              {going.slice(0, 4).map((u) => (
                <Avatar key={u.id} user={{ ...u, lastName: "" }} size={34} />
              ))}
            </span>
            <span className="small">{t.activity.with(f.names(going.map((u) => u.firstName)))}</span>
          </div>
        ) : null}
        <p className="small strong" style={{ color: "var(--forest)" }}>
          {t.joy.sheet.free} · {t.activity.seatsLeft(seatsLeft(state, activity))}
        </p>
      </>
    );
    actions = done ? (
      <span className="badge badge-ok">{t.activity.registered}</span>
    ) : (
      <button type="button" className="btn btn-block" onClick={confirmJoin} disabled={seatsLeft(state, activity) <= 0}>
        <Icon name="check" /> {t.joy.sheet.confirmJoin}
      </button>
    );
  }

  if (proposal.kind === "book" && senior) {
    const duration = activity ? 150 : 90;
    const split = splitPayment(duration, giftMinutesLeft(state, senior.id));
    const start = activity ? addMinutes(activity.start, -15) : defaultStart(state.now);
    body = (
      <form id="joy-book" className="stack" onSubmit={confirmBook} noValidate>
        <p className="sheet-when">
          {when(start, state.now, x)} · {f.duration(duration)}
        </p>
        {activity ? <p className="muted">{f.text(activity.title)}</p> : null}
        <div className="field">
          <label htmlFor="joy-meeting">
            {viewer.id === senior.id ? t.joy.sheet.meetingPoint : t.joy.sheet.meetingPointFamily(senior.firstName)}
          </label>
          <input
            id="joy-meeting"
            className="input"
            value={meetingPoint}
            placeholder={t.booking.meetingPointPlaceholder}
            aria-invalid={Boolean(error)}
            onChange={(e) => {
              setMeetingPoint(e.target.value);
              setError(null);
            }}
          />
          {error ? <span className="error">{error}</span> : <small>{t.booking.meetingPointHelp}</small>}
        </div>
        <div className="price-box">
          <div className="price-line">
            <span>{t.booking.priceLine(f.duration(split.billedMinutes), f.money(PRICING.hourlyCents))}</span>
            <span>{f.money(split.totalCents)}</span>
          </div>
          {split.giftMinutes ? (
            <div className="price-line">
              <span>
                <Icon name="gift" size={16} /> {t.outing.coveredByGift}
              </span>
              <span>− {f.money(split.totalCents - split.cardCents)}</span>
            </div>
          ) : null}
          <div className="price-line price-total">
            <span>{t.joy.sheet.toPay}</span>
            <span>{f.money(split.cardCents)}</span>
          </div>
        </div>
      </form>
    );
    actions = (
      <button type="submit" form="joy-book" className="btn btn-block">
        <Icon name="check" /> {t.joy.sheet.confirmBook}
      </button>
    );
  }

  if (proposal.kind === "answer") {
    const m = missionById(state, proposal.missionId);
    const offers = pendingOffers(state, proposal.missionId);
    const base = viewer.role === "family" ? "/family/outings" : "/senior/outings";
    body = (
      <>
        {m ? <p className="sheet-when">{when(m.start, state.now, x)}</p> : null}
        {offers.map((o) => {
          const c = userById(state, o.companionId);
          if (!c) return null;
          return (
            <div key={o.id} className="card card-flat" style={{ padding: 14 }}>
              <Person user={c} showLastName={false} subtitle={c.companion?.verified ? t.common.verified : t.common.unverified} />
              {c.bio ? <p className="small">{f.text(c.bio)}</p> : null}
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  run((s) => acceptOffer(s, o.id));
                  onConfirmed({ app: `The user chose ${c.firstName} as companion.`, spoken: t.joy.ack.answer(c.firstName) });
                }}
              >
                <Icon name="check" size={18} /> {t.joy.sheet.accept(c.firstName)}
              </button>
            </div>
          );
        })}
      </>
    );
    actions = m ? (
      <Link href={`${base}/${m.id}`} className="btn btn-secondary btn-block">
        {t.joy.sheet.see}
      </Link>
    ) : null;
  }

  if (proposal.kind === "upcoming") {
    const href =
      viewer.role === "companion"
        ? `/companion/missions/${proposal.missionId}`
        : proposal.missionId
          ? `${viewer.role === "family" ? "/family/outings" : "/senior/outings"}/${proposal.missionId}`
          : viewer.role === "senior" && proposal.activityId
            ? `/senior/activities/${proposal.activityId}`
            : null;
    body = (
      <>
        <p className="sheet-when">{when(proposal.date, state.now, x)}</p>
        {activity ? (
          <p className="muted">
            <Icon name="pin" size={18} /> {f.text(activity.place)}
          </p>
        ) : null}
      </>
    );
    actions = href ? (
      <Link href={href} className="btn btn-block">
        {t.joy.sheet.see}
      </Link>
    ) : null;
  }

  if (proposal.kind === "mission") {
    const m = missionById(state, proposal.missionId);
    if (m) {
      const s = userById(state, m.seniorId);
      body = (
        <>
          <p className="sheet-when">
            {when(m.start, state.now, x)} · {f.duration(m.durationMin)}
          </p>
          <p className="muted">
            {t.outingTypes[m.type]} · {t.sectors[m.sector]}
          </p>
          {m.note ? <p>“{m.note}”</p> : null}
          <p className="strong" style={{ color: "var(--navy)" }}>
            {t.companion.youEarn(f.money(priceFor(m.durationMin).companionCents))}
          </p>
          <p className="small muted">
            <Icon name="lock" size={16} /> {t.companion.locked}
          </p>
        </>
      );
      actions = (
        <button
          type="button"
          className="btn btn-block"
          disabled={!isCompatible(state, m, viewer)}
          onClick={() => {
            run((st) => offerHelp(st, m.id, viewer.id));
            onConfirmed({ app: `The user offered to help ${s?.firstName ?? ""}.`, spoken: t.joy.ack.mission });
          }}
        >
          <Icon name="heart" /> {t.joy.sheet.confirmMission}
        </button>
      );
    }
  }

  if (proposal.kind === "gift" && senior) {
    body = (
      <>
        <p>{t.family.giftText(f.hours(PRICING.giftCard.minutes), f.money(PRICING.giftCard.priceCents))}</p>
        <p className="small muted">{t.family.giftBalance(f.hours(giftMinutesLeft(state, senior.id)))}</p>
      </>
    );
    actions = (
      <button
        type="button"
        className="btn btn-block"
        onClick={() => {
          run((s) => buyGiftCard(s, viewer.id, senior.id));
          onConfirmed({ app: `The user offered a gift card to ${senior.firstName}.`, spoken: t.joy.ack.gift });
        }}
      >
        <Icon name="gift" /> {t.joy.sheet.confirmGift(f.money(PRICING.giftCard.priceCents))}
      </button>
    );
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        ref={panelRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <span className="cat-icon" aria-hidden="true">
            <Icon name={card.icon} />
          </span>
          <h2 id="sheet-title" className="min-0" style={{ flex: 1, fontSize: "1.3rem" }}>
            {sheetTitle}
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t.common.close}>
            <Icon name="close" />
          </button>
        </div>
        <div className="stack">{body}</div>
        <div className="stack-sm">
          {actions}
          <button type="button" className="btn btn-ghost btn-block" onClick={onClose}>
            {t.joy.sheet.notNow}
          </button>
          {proposal.kind !== "upcoming" && proposal.kind !== "answer" ? <p className="muted small center">{t.joy.sheet.safe}</p> : null}
        </div>
      </div>
    </div>
  );
}

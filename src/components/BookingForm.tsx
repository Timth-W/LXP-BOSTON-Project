"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useI18n } from "@/i18n";
import { createMission } from "@/lib/actions";
import { OUTING_TYPE_IDS, PRICING, SECTOR_IDS } from "@/lib/constants";
import { addMinutes } from "@/lib/format";
import { splitPayment } from "@/lib/pricing";
import { giftMinutesLeft, isPast, userById } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { Draft, OutingType, SectorId, User } from "@/lib/types";
import { Icon } from "./Icon";

const DURATIONS = [60, 90, 120, 150, 180, 240];

type Errors = Partial<Record<"start" | "meetingPoint", string>>;

/**
 * Booking of an accompanied outing, used by the senior and by relatives.
 * The price is shown before confirming; the payment is only captured after the outing.
 */
export function BookingForm({
  senior,
  booker,
  payers,
  initial,
  via,
  onBooked,
}: {
  senior: User;
  booker: User;
  /** People who can pay: the senior and/or their relatives. */
  payers: User[];
  initial?: Partial<Draft>;
  via: "assistant" | "manual";
  onBooked: (missionId: string) => void;
}) {
  const { state, run } = useStore();
  const { t, f } = useI18n();
  const futureActivities = state.activities.filter((a) => !isPast(state, a.start));
  const initialActivity = futureActivities.find((a) => a.id === initial?.activityId);

  const [activityId, setActivityId] = useState(initialActivity?.id ?? "");
  const [type, setType] = useState<OutingType>(initial?.type ?? (initialActivity ? "activity" : "walk"));
  const [start, setStart] = useState(initial?.start ?? "");
  const [durationMin, setDurationMin] = useState(DURATIONS.includes(initial?.durationMin ?? 0) ? initial!.durationMin! : 90);
  const [sector, setSector] = useState<SectorId>(initialActivity?.sector ?? senior.sector);
  const [meetingPoint, setMeetingPoint] = useState("");
  const [note, setNote] = useState(initial?.note ?? "");
  const [payerId, setPayerId] = useState(payers.some((p) => p.id === booker.id) ? booker.id : (payers[0]?.id ?? booker.id));
  const [errors, setErrors] = useState<Errors>({});

  const gift = giftMinutesLeft(state, senior.id);
  const price = useMemo(() => splitPayment(durationMin, gift), [durationMin, gift]);
  const payer = userById(state, payerId);

  function onActivityChange(id: string) {
    setActivityId(id);
    const a = futureActivities.find((x) => x.id === id);
    if (a) {
      setType("activity");
      setStart(addMinutes(a.start, -15));
      setSector(a.sector);
      setErrors(({ start: _s, ...rest }) => rest);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Errors = {};
    if (!start) errs.start = t.booking.errors.start;
    else if (isPast(state, start)) errs.start = t.booking.errors.past;
    if (!meetingPoint.trim()) errs.meetingPoint = t.booking.errors.meetingPoint;
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(errs.start ? "bk-start" : "bk-meeting")?.focus();
      return;
    }
    const id = run((s) =>
      createMission(s, {
        seniorId: senior.id,
        bookedById: booker.id,
        payerId,
        activityId: activityId || null,
        type,
        note: note.trim(),
        start,
        durationMin,
        sector,
        meetingPoint: meetingPoint.trim(),
        via,
      }),
    );
    onBooked(id);
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      {via === "assistant" ? (
        <div className="notice">
          <Icon name="sparkle" />
          <p>
            <strong>{t.booking.aiPrefilled}</strong> {t.booking.aiPrefilledText}
          </p>
        </div>
      ) : null}

      <div className="card">
        {booker.id !== senior.id ? <h2 style={{ fontSize: "1.2rem" }}>{t.booking.forSenior(senior.firstName)}</h2> : null}
        <div className="fields-2">
          <div className="field">
            <label htmlFor="bk-activity">
              {t.booking.activity} <span className="muted small">({t.common.optional})</span>
            </label>
            <select id="bk-activity" className="input" value={activityId} onChange={(e) => onActivityChange(e.target.value)}>
              <option value="">{t.booking.noActivity}</option>
              {futureActivities.map((a) => (
                <option key={a.id} value={a.id}>
                  {f.text(a.title)}, {f.short(a.start)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="bk-type">{t.booking.type}</label>
            <select id="bk-type" className="input" value={type} onChange={(e) => setType(e.target.value as OutingType)}>
              {OUTING_TYPE_IDS.map((k) => (
                <option key={k} value={k}>
                  {t.outingTypes[k]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="fields-2">
          <div className="field">
            <label htmlFor="bk-start">{t.booking.start}</label>
            <input
              id="bk-start"
              type="datetime-local"
              className="input"
              value={start}
              min={state.now}
              aria-invalid={Boolean(errors.start)}
              aria-describedby={errors.start ? "bk-start-err" : undefined}
              onChange={(e) => {
                setStart(e.target.value);
                setErrors(({ start: _s, ...rest }) => rest);
              }}
            />
            {errors.start ? (
              <span className="error" id="bk-start-err">
                {errors.start}
              </span>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="bk-duration">{t.booking.duration}</label>
            <select id="bk-duration" className="input" value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))}>
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {f.duration(d)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="stack" style={{ gap: 18 }}>
          <div className="field">
            <label htmlFor="bk-meeting">{t.booking.meetingPoint}</label>
            <input
              id="bk-meeting"
              className="input"
              value={meetingPoint}
              placeholder={t.booking.meetingPointPlaceholder}
              aria-invalid={Boolean(errors.meetingPoint)}
              aria-describedby="bk-meeting-help"
              onChange={(e) => {
                setMeetingPoint(e.target.value);
                setErrors(({ meetingPoint: _m, ...rest }) => rest);
              }}
            />
            {errors.meetingPoint ? (
              <span className="error" id="bk-meeting-help">
                {errors.meetingPoint}
              </span>
            ) : (
              <small id="bk-meeting-help">
                <Icon name="lock" size={14} /> {t.booking.meetingPointHelp}
              </small>
            )}
          </div>
        </div>
        <details className="more">
          <summary>{t.booking.moreOptions}</summary>
          <div className="stack" style={{ gap: 18, marginTop: 14 }}>
            <div className="field">
              <label htmlFor="bk-sector">{t.booking.sector}</label>
              <select
                id="bk-sector"
                className="input"
                value={sector}
                onChange={(e) => setSector(e.target.value as SectorId)}
                aria-describedby="bk-sector-help"
              >
                {SECTOR_IDS.map((s) => (
                  <option key={s} value={s}>
                    {t.sectors[s]}
                  </option>
                ))}
              </select>
              <small id="bk-sector-help">{t.booking.sectorHelp}</small>
            </div>
            <div className="field">
              <label htmlFor="bk-note">
                {t.booking.note} <span className="muted small">({t.common.optional})</span>
              </label>
              <textarea
                id="bk-note"
                className="input"
                value={note}
                maxLength={300}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t.booking.notePlaceholder}
              />
            </div>
          </div>
        </details>
      </div>

      {payers.length > 1 ? (
        <fieldset className="field">
          <legend>{t.booking.whoPays}</legend>
          <div className="radio-cards">
            {payers.map((p) => (
              <label key={p.id} className="radio-card">
                <input type="radio" name="payer" value={p.id} checked={payerId === p.id} onChange={() => setPayerId(p.id)} />
                <span>
                  <strong>{p.id === booker.id ? t.booking.iPay : t.booking.otherPays(p.firstName)}</strong>
                  <br />
                  <span className="muted small">{p.id === booker.id ? t.booking.iPayHelp : t.booking.otherPaysHelp(p.firstName)}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="price-box" aria-live="polite">
        <div className="price-line">
          <span>{t.booking.priceLine(f.duration(price.billedMinutes), f.money(PRICING.hourlyCents))}</span>
          <span>{f.money(price.totalCents)}</span>
        </div>
        {price.giftMinutes ? (
          <div className="price-line">
            <span>
              <Icon name="gift" size={16} /> {t.booking.giftLine(f.duration(price.giftMinutes), f.duration(gift))}
            </span>
            <span>− {f.money(price.totalCents - price.cardCents)}</span>
          </div>
        ) : null}
        <div className="price-line price-total">
          <span>{payer && payer.id !== booker.id ? t.booking.toPayBy(payer.firstName) : t.booking.toPay}</span>
          <span>{f.money(price.cardCents)}</span>
        </div>
        <p className="muted small">{t.booking.priceNote}</p>
      </div>

      <div className="row">
        <button className="btn btn-block-mobile" type="submit">
          {t.booking.submit}
        </button>
      </div>
    </form>
  );
}

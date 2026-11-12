"use client";

/**
 * Joy: the voice assistant, JoyTo's flagship feature.
 * Joy greets the person by name, talks about what is planned and suggests outings
 * ("Hello Marie! You have Tea and crosswords tomorrow at 5 pm. Would you like to join…").
 * Each suggestion is a card: a tap (or a "yes" to Joy) opens a confirmation sheet, and only a
 * second tap on the green button books anything.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useI18n } from "@/i18n";
import type { AssistantRequest, AssistantResponse } from "@/lib/ai/schema";
import { dayKey } from "@/lib/format";
import { joinProposal, proposalsFor, type Proposal } from "@/lib/joy/proposals";
import { greeting, keywords, proposalCard, proposalLine } from "@/lib/joy/script";
import { eligibleActivities, rankActivities } from "@/lib/matching";
import { attendees, seatsLeft } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { Category, DayKey, User } from "@/lib/types";
import { Icon } from "../Icon";
import { LogoMark } from "../Logo";
import { ProposalSheet, type Confirmation } from "./ProposalSheet";
import { useJoyVoice, type JoyStatus } from "./useJoyVoice";

const normalize = (text: string) =>
  ` ${text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z' ]+/g, " ")} `;

const YES =
  / (yes|yeah|yep|ok|okay|sure|please|of course|why not|gladly|oui|ouais|d'accord|daccord|volontiers|avec plaisir|pourquoi pas|bien sur|carrement|go) /;
const NO = / (no|nope|not now|later|something else|another|next|non|pas maintenant|plus tard|autre chose|une autre|suivant) /;
const BYE = / (bye|goodbye|stop|that's all|au revoir|a bientot|arrete|c'est tout) /;

export function JoyScreen({ viewer, seniorId }: { viewer: User; seniorId?: string }) {
  const { state, run } = useStore();
  const { t, f, locale } = useI18n();
  const x = useMemo(() => ({ t, f, locale }), [t, f, locale]);

  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const autoStarted = useRef(false);

  const proposals: Proposal[] = useMemo(() => {
    const base = proposalsFor(state, viewer, seniorId);
    if (viewer.role !== "senior") return base;
    const eligible = new Set(eligibleActivities(state, viewer).map((a) => a.id));
    const extras = extraIds
      .filter((id) => eligible.has(id))
      .map((id) => joinProposal(state, viewer, id))
      .filter((p) => !base.some((b) => b.id === p.id));
    return [...extras, ...base];
  }, [state, viewer, seniorId, extraIds]);

  const proposalsRef = useRef(proposals);
  proposalsRef.current = proposals;
  const focusRef = useRef(focusId);
  focusRef.current = focusId;

  /* ---------- Understanding the person in demo mode (simple rules + the text AI for seniors) ---------- */

  const findMatch = useCallback(
    (said: string) => {
      const words = new Set(normalize(said).trim().split(/\s+/));
      let best: { p: Proposal; score: number } | null = null;
      for (const p of proposalsRef.current) {
        const score = keywords(p, state, x).filter((k) => words.has(k)).length;
        if (score && (!best || score > best.score)) best = { p, score };
      }
      return best?.p ?? null;
    },
    [state, x],
  );

  const askTextAssistant = useCallback(
    async (message: string): Promise<string | null> => {
      if (viewer.role !== "senior") return null;
      const candidates = eligibleActivities(state, viewer).map((a) => ({
        id: a.id,
        title: f.text(a.title),
        category: a.category,
        start: a.start,
        place: f.text(a.place),
        seatsLeft: seatsLeft(state, a),
        attendees: attendees(state, a.id).map((p) => ({ firstName: p.firstName, interests: p.interests })),
      }));
      const body: AssistantRequest = {
        locale,
        message,
        today: state.now,
        profile: { firstName: viewer.firstName, interests: viewer.interests, availability: viewer.availability, sector: viewer.sector },
        history: [],
        candidates,
      };
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) return null;
        const out = (await res.json()) as AssistantResponse;
        const ids = out.suggestions.map((s) => s.activityId);
        if (ids.length) {
          setExtraIds((prev) => Array.from(new Set([...ids, ...prev])));
          setFocusId(`join:${ids[0]}`);
        }
        return out.clarification ? `${out.reply} ${out.clarification}` : out.reply;
      } catch {
        return null;
      }
    },
    [viewer, state, f, locale],
  );

  const respond = useCallback(
    async (said: string): Promise<string | null> => {
      const n = normalize(said);
      const list = proposalsRef.current;
      const match = findMatch(said);
      const focused = list.find((p) => p.id === focusRef.current) ?? null;
      if (YES.test(n) && !NO.test(n)) {
        const target = match ?? focused ?? list[0];
        if (!target) return t.joy.nothing;
        setFocusId(target.id);
        setSheetId(target.id);
        return t.joy.demo.confirmPrompt;
      }
      if (BYE.test(n)) {
        window.setTimeout(() => voice.stop(), 3500);
        return t.joy.demo.bye;
      }
      if (match) {
        setFocusId(match.id);
        return proposalLine(match, state, viewer, x);
      }
      if (NO.test(n)) {
        const index = focused ? list.indexOf(focused) : -1;
        const next = list[index + 1];
        if (!next) return t.joy.nothing;
        setFocusId(next.id);
        return `${t.joy.demo.next} ${proposalLine(next, state, viewer, x)}`;
      }
      return (await askTextAssistant(said)) ?? t.joy.demo.notUnderstood;
    },
    // `voice` is declared below; it is only used inside a timer, after it exists.
    [findMatch, askTextAssistant, state, viewer, x, t],
  );

  /* ---------- Tool calls from GPT Realtime ---------- */

  const onFind = useCallback(
    async (args: { category?: string; day?: string }) => {
      if (viewer.role !== "senior") return [];
      const ranked = rankActivities(
        state,
        viewer,
        {
          categories: args.category ? [args.category as Category] : [],
          days: args.day ? [args.day as DayKey] : [],
          moment: null,
          wantsCompanion: false,
          wantsGroup: true,
        },
        3,
      ).filter((r) => !args.day || dayKey(r.item.start) === args.day);
      const ids = ranked.map((r) => r.item.id);
      setExtraIds((prev) => Array.from(new Set([...ids, ...prev])));
      return ids.map((id) => {
        const p = joinProposal(state, viewer, id);
        return { proposal_id: p.id, line: proposalLine(p, state, viewer, x) };
      });
    },
    [state, viewer, x],
  );

  const voice = useJoyVoice(locale, {
    respond,
    onShow: (id) => setFocusId(id),
    onOpen: (id) => {
      if (!proposalsRef.current.some((p) => p.id === id)) return;
      setFocusId(id);
      setSheetId(id);
    },
    onFind,
  });

  const context = useCallback(
    () => ({
      role: viewer.role,
      firstName: viewer.firstName,
      greeting: greeting(state, viewer, proposals, x),
      proposals: proposals.map((p) => {
        const c = proposalCard(p, state, viewer, x);
        return { id: p.id, line: proposalLine(p, state, viewer, x), label: `${c.title}, ${c.subtitle}` };
      }),
    }),
    [state, viewer, proposals, x],
  );

  const startVoice = useCallback(() => {
    setFocusId(proposals[0]?.id ?? null);
    voice.start(context());
  }, [voice, context, proposals]);

  /* "Talk with Joy" buttons elsewhere open this page with ?start=1: Joy starts talking right away. */
  useEffect(() => {
    if (autoStarted.current || !voice.ready) return;
    if (new URLSearchParams(window.location.search).get("start") === "1") {
      autoStarted.current = true;
      window.history.replaceState(null, "", window.location.pathname);
      startVoice();
    }
  }, [voice.ready, startVoice]);

  function onConfirmed(c: Confirmation) {
    setSheetId(null);
    voice.notify(c.app, c.spoken);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    setText("");
    void voice.sendText(clean);
  }

  const statusLabel: Record<JoyStatus, string> = {
    off: t.joy.ready,
    connecting: t.joy.connecting,
    speaking: t.joy.speaking,
    listening: t.joy.listening,
    thinking: t.joy.demo.searching,
    waiting: voice.canListen ? t.joy.ready : t.joy.typePlaceholder,
    error: t.joy.error,
  };
  const sheet = proposals.find((p) => p.id === sheetId) ?? null;
  const hello =
    viewer.role === "senior"
      ? t.joy.greeting.senior(viewer.firstName)
      : viewer.role === "companion"
        ? t.joy.greeting.companion(viewer.firstName)
        : t.joy.greeting.family(viewer.firstName, "");

  return (
    <div className="stack-lg">
      <section className="joy-stage" aria-label={t.joy.name}>
        <button
          type="button"
          className="joy-orb"
          data-status={voice.status}
          onClick={voice.active ? (voice.status === "waiting" && voice.canListen ? voice.listen : undefined) : startVoice}
          aria-label={voice.active ? statusLabel[voice.status] : t.joy.start}
        >
          <LogoMark size={76} />
        </button>
        <p className="joy-status" role="status">
          {voice.active ? statusLabel[voice.status] : t.joy.name}
        </p>
        <p className="joy-caption" aria-live="polite">
          {voice.joyLine || (viewer.role === "family" ? t.joy.lead : hello)}
        </p>
        {voice.userLine ? (
          <p className="joy-user">
            <strong>{t.joy.you} :</strong> {voice.userLine}
          </p>
        ) : null}
        {voice.error ? <p className="notice notice-warn small">{voice.error === "mic" ? t.joy.micDenied : t.joy.error}</p> : null}

        {!voice.active ? (
          <button type="button" className="btn joy-start" onClick={startVoice}>
            <Icon name="mic" /> {t.joy.start}
          </button>
        ) : (
          <div className="row" style={{ justifyContent: "center" }}>
            {voice.mode === "demo" && voice.canListen ? (
              <button
                type="button"
                className="btn btn-sm"
                onClick={voice.listen}
                disabled={voice.status === "listening" || voice.status === "speaking"}
              >
                <Icon name="mic" size={20} /> {t.joy.speak}
              </button>
            ) : null}
            {voice.mode === "realtime" ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={voice.toggleMic} aria-pressed={!voice.micOn}>
                <Icon name="mic" size={20} /> {voice.micOn ? t.joy.mute : t.joy.unmute}
              </button>
            ) : null}
            <button type="button" className="btn btn-secondary btn-sm" onClick={voice.stop}>
              <Icon name="close" size={20} /> {t.joy.end}
            </button>
          </div>
        )}

        {voice.active ? (
          <form className="joy-type" onSubmit={onSubmit}>
            <label htmlFor="joy-text" className="sr-only">
              {t.joy.typePlaceholder}
            </label>
            <input
              id="joy-text"
              className="input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.joy.typePlaceholder}
              autoComplete="off"
              maxLength={300}
            />
            <button type="submit" className="icon-btn" aria-label={t.joy.send} disabled={!text.trim()}>
              <Icon name="send" />
            </button>
          </form>
        ) : null}
        <span className="joy-mode">
          <Icon name="sparkle" size={14} /> {voice.mode === "realtime" ? t.joy.realtimeMode : t.joy.demoMode}
        </span>
      </section>

      <section className="stack" aria-labelledby="joy-proposals">
        <h2 id="joy-proposals">{t.joy.proposalsTitle}</h2>
        {proposals.length ? (
          <div className="proposal-grid">
            {proposals.map((p) => {
              const c = proposalCard(p, state, viewer, x);
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`proposal${focusId === p.id ? " focused" : ""}`}
                  data-kind={p.kind}
                  onClick={() => {
                    setFocusId(p.id);
                    setSheetId(p.id);
                  }}
                >
                  <span className="cat-icon" aria-hidden="true">
                    <Icon name={c.icon} />
                  </span>
                  <span className="min-0" style={{ flex: 1 }}>
                    <span className="proposal-title">{c.title}</span>
                    <span className="proposal-sub">{c.subtitle}</span>
                  </span>
                  <span className="proposal-action">{c.action}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="muted">{t.joy.noProposals}</p>
        )}
      </section>

      {sheet ? <ProposalSheet proposal={sheet} viewer={viewer} onClose={() => setSheetId(null)} onConfirmed={onConfirmed} /> : null}
    </div>
  );
}

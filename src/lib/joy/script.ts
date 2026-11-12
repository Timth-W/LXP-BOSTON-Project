/**
 * Turns Joy's proposals into words (speech and cards) in the user's language.
 * Used by the demo voice and sent to GPT Realtime as context, so both say the same things.
 */
import type { Formatters } from "@/i18n";
import type { Dict } from "@/i18n/en";
import { CATEGORY_ICON, type IconName } from "@/components/Icon";
import { formatTime } from "../format";
import { activityById, missionById, pendingOffers, userById } from "../selectors";
import type { Locale, State, User } from "../types";
import type { Proposal } from "./proposals";

export interface JoyText {
  t: Dict;
  f: Formatters;
  locale: Locale;
}

const DAY_MS = 86_400_000;

/** "tomorrow at 5 pm", "on Saturday at 2:30 pm"… relative to the demo clock. */
export function when(iso: string, now: string, { t, f, locale }: JoyText): string {
  const day = (d: string) => new Date(`${d.slice(0, 10)}T00:00`).getTime();
  const diff = Math.round((day(iso) - day(now)) / DAY_MS);
  const time = formatTime(iso, locale);
  if (diff === 0) return t.joy.today(time);
  if (diff === 1) return t.joy.tomorrow(time);
  const weekday = f.day(iso).split(" ")[0].replace(",", "");
  if (diff > 1 && diff < 7) return t.joy.onDay(locale === "fr" ? weekday.toLowerCase() : weekday, time);
  return t.joy.onDate(f.day(iso), time);
}

function names(s: State, missionId: string, f: Formatters) {
  return f.names(pendingOffers(s, missionId).map((o) => userById(s, o.companionId)?.firstName ?? ""));
}

/** One spoken sentence per proposal. */
export function proposalLine(p: Proposal, s: State, viewer: User, x: JoyText): string {
  const { t, f } = x;
  const senior = "seniorId" in p ? userById(s, p.seniorId) : undefined;
  const forOther = viewer.role !== "senior";
  switch (p.kind) {
    case "answer": {
      const m = missionById(s, p.missionId);
      const w = m ? when(m.start, s.now, x) : "";
      return forOther
        ? t.joy.line.answerFamily(names(s, p.missionId, f), senior?.firstName ?? "", w)
        : t.joy.line.answer(names(s, p.missionId, f), w);
    }
    case "upcoming": {
      const a = activityById(s, p.activityId);
      const title = a ? f.text(a.title) : t.joy.card.upcomingMission;
      const w = when(p.date, s.now, x);
      if (viewer.role === "companion") return t.joy.line.upcomingCompanion(senior?.firstName ?? "", w);
      return forOther ? t.joy.line.upcomingFamily(senior?.firstName ?? "", title, w) : t.joy.line.upcoming(title, w);
    }
    case "join": {
      const a = activityById(s, p.activityId);
      if (!a) return "";
      const w = when(a.start, s.now, x);
      return p.mates.length ? t.joy.line.joinWith(f.text(a.title), w, f.names(p.mates)) : t.joy.line.join(f.text(a.title), w);
    }
    case "book": {
      const a = activityById(s, p.activityId);
      if (forOther) {
        return a
          ? t.joy.line.bookFamily(senior?.firstName ?? "", f.text(a.title), when(a.start, s.now, x))
          : t.joy.line.bookFamilyWalk(senior?.firstName ?? "");
      }
      return a ? t.joy.line.book(f.text(a.title)) : t.joy.line.bookWalk;
    }
    case "mission": {
      const m = missionById(s, p.missionId);
      return m ? t.joy.line.mission(userById(s, m.seniorId)?.firstName ?? "", when(m.start, s.now, x)) : "";
    }
    case "gift":
      return t.joy.line.gift(senior?.firstName ?? "");
  }
}

export interface ProposalCardText {
  title: string;
  subtitle: string;
  action: string;
  icon: IconName;
}

export function proposalCard(p: Proposal, s: State, viewer: User, x: JoyText): ProposalCardText {
  const { t, f } = x;
  const senior = "seniorId" in p ? userById(s, p.seniorId) : undefined;
  switch (p.kind) {
    case "answer": {
      const m = missionById(s, p.missionId);
      return {
        title: t.joy.card.answer(names(s, p.missionId, f)),
        subtitle: m ? when(m.start, s.now, x) : "",
        action: t.joy.action.answer,
        icon: "heart",
      };
    }
    case "upcoming": {
      const a = activityById(s, p.activityId);
      const title =
        viewer.role === "companion" ? t.joy.card.mission(senior?.firstName ?? "") : a ? f.text(a.title) : t.joy.card.upcomingMission;
      return { title, subtitle: when(p.date, s.now, x), action: t.joy.action.upcoming, icon: a ? CATEGORY_ICON[a.category] : "calendar" };
    }
    case "join": {
      const a = activityById(s, p.activityId);
      return {
        title: a ? f.text(a.title) : "",
        subtitle: a ? `${when(a.start, s.now, x)} · ${f.text(a.place)}` : "",
        action: t.joy.action.join,
        icon: a ? CATEGORY_ICON[a.category] : "calendar",
      };
    }
    case "book": {
      const a = activityById(s, p.activityId);
      return {
        title: a ? t.joy.card.book : t.joy.card.bookWalk,
        subtitle: a ? `${f.text(a.title)} · ${when(a.start, s.now, x)}` : (senior?.firstName ?? ""),
        action: t.joy.action.book,
        icon: "users",
      };
    }
    case "mission": {
      const m = missionById(s, p.missionId);
      return {
        title: t.joy.card.mission(m ? (userById(s, m.seniorId)?.firstName ?? "") : ""),
        subtitle: m ? `${when(m.start, s.now, x)} · ${t.outingTypes[m.type]}` : "",
        action: t.joy.action.mission,
        icon: "heart",
      };
    }
    case "gift":
      return { title: t.joy.card.gift, subtitle: senior?.firstName ?? "", action: t.joy.action.gift, icon: "gift" };
  }
}

/** What Joy says first: hello, a question, then the two or three most useful proposals. */
export function greeting(s: State, viewer: User, proposals: Proposal[], x: JoyText): string {
  const { t } = x;
  const seniorId = proposals.find((p) => "seniorId" in p && p.seniorId !== viewer.id);
  const seniorName = seniorId && "seniorId" in seniorId ? (userById(s, seniorId.seniorId)?.firstName ?? "") : "";
  const hello =
    viewer.role === "senior"
      ? t.joy.greeting.senior(viewer.firstName)
      : viewer.role === "family"
        ? t.joy.greeting.family(viewer.firstName, seniorName)
        : t.joy.greeting.companion(viewer.firstName);
  if (!proposals.length) return `${hello} ${t.joy.nothing}`;
  const lines = proposals
    .slice(0, 3)
    .map((p) => proposalLine(p, s, viewer, x))
    .filter(Boolean);
  return [hello, ...lines, t.joy.closing].join(" ");
}

/** Words that let the demo voice recognise which proposal the person is talking about. */
export function keywords(p: Proposal, s: State, x: JoyText): string[] {
  const words: string[] = [];
  const add = (text: string) =>
    words.push(
      ...text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .split(/[^a-z]+/)
        .filter((w) => w.length > 3),
    );
  const a = "activityId" in p ? activityById(s, p.activityId) : undefined;
  if (a) {
    add(x.f.text(a.title));
    add(x.t.categories[a.category]);
  }
  if (p.kind === "join") p.mates.forEach(add);
  if (p.kind === "answer") pendingOffers(s, p.missionId).forEach((o) => add(userById(s, o.companionId)?.firstName ?? ""));
  if (p.kind === "book") add(x.t.joy.card.book);
  if (p.kind === "gift") add(x.t.joy.card.gift);
  if (p.kind === "mission") {
    const m = missionById(s, p.missionId);
    if (m) add(userById(s, m.seniorId)?.firstName ?? "");
  }
  return Array.from(new Set(words));
}

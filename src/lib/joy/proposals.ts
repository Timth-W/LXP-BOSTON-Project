/**
 * Joy's proposals: what Joy talks about when the conversation starts.
 * Built from the data only (no AI, no text): screens and the voice engine turn them into
 * sentences in the user's language. Nothing here books anything: every proposal needs a tap.
 */
import { daysBetween } from "../format";
import { rankActivities, rankMissions } from "../matching";
import { attendees, giftMinutesLeft, isPast, pendingOffers, seniorsOf, upcomingOutings, userById } from "../selectors";
import type { State, User } from "../types";

export type Proposal =
  /** Sign up to a free activity. */
  | { id: string; kind: "join"; seniorId: string; activityId: string; mates: string[] }
  /** Book a paid companion to go to an activity (or for a walk when activityId is null). */
  | { id: string; kind: "book"; seniorId: string; activityId: string | null }
  /** Companions offered to help: accept one. */
  | { id: string; kind: "answer"; seniorId: string; missionId: string }
  /** Something already planned soon: just a reminder. */
  | { id: string; kind: "upcoming"; seniorId: string; date: string; activityId: string | null; missionId: string | null }
  /** Companion side: an outing looking for someone. */
  | { id: string; kind: "mission"; missionId: string }
  /** Family side: offer a gift card. */
  | { id: string; kind: "gift"; seniorId: string };

export type ProposalKind = Proposal["kind"];

/** Reminders only for what happens within the next two days. */
const SOON_DAYS = 2;
const MAX = 4;

function seniorProposals(s: State, senior: User): Proposal[] {
  const list: Proposal[] = [];

  for (const m of s.missions.filter((x) => x.seniorId === senior.id && x.status === "open" && !isPast(s, x.start))) {
    if (pendingOffers(s, m.id).length) list.push({ id: `answer:${m.id}`, kind: "answer", seniorId: senior.id, missionId: m.id });
  }

  const soon = upcomingOutings(s, senior.id).find((i) => daysBetween(s.now.slice(0, 10), i.date.slice(0, 10)) <= SOON_DAYS);
  if (soon) {
    list.push({
      id: `upcoming:${soon.kind === "activity" ? soon.activity.id : soon.mission.id}`,
      kind: "upcoming",
      seniorId: senior.id,
      date: soon.date,
      activityId: soon.kind === "activity" ? soon.activity.id : soon.mission.activityId,
      missionId: soon.kind === "mission" ? soon.mission.id : null,
    });
  }

  // Order matters: Joy reads the first ones aloud ("…would you like to join X? Or would you
  // like someone to go with you?"), then the second activity is offered if the person says no.
  const [first, second] = rankActivities(s, senior, undefined, 2);
  if (first) list.push(joinProposal(s, senior, first.item.id));
  list.push({ id: `book:${first?.item.id ?? "walk"}`, kind: "book", seniorId: senior.id, activityId: first?.item.id ?? null });
  if (second) list.push(joinProposal(s, senior, second.item.id));

  return list.slice(0, MAX);
}

function familyProposals(s: State, family: User, seniorId?: string): Proposal[] {
  const senior = seniorId ? userById(s, seniorId) : seniorsOf(s, family.id)[0];
  if (!senior) return [];
  const list: Proposal[] = [];

  for (const m of s.missions.filter((x) => x.seniorId === senior.id && x.status === "open" && !isPast(s, x.start))) {
    if (pendingOffers(s, m.id).length) list.push({ id: `answer:${m.id}`, kind: "answer", seniorId: senior.id, missionId: m.id });
  }
  const soon = upcomingOutings(s, senior.id).find((i) => daysBetween(s.now.slice(0, 10), i.date.slice(0, 10)) <= SOON_DAYS);
  if (soon) {
    list.push({
      id: `upcoming:${soon.kind === "activity" ? soon.activity.id : soon.mission.id}`,
      kind: "upcoming",
      seniorId: senior.id,
      date: soon.date,
      activityId: soon.kind === "activity" ? soon.activity.id : soon.mission.activityId,
      missionId: soon.kind === "mission" ? soon.mission.id : null,
    });
  }
  const top = rankActivities(s, senior, undefined, 1)[0];
  list.push({ id: `book:${top?.item.id ?? "walk"}`, kind: "book", seniorId: senior.id, activityId: top?.item.id ?? null });
  if (giftMinutesLeft(s, senior.id) < 120) list.push({ id: `gift:${senior.id}`, kind: "gift", seniorId: senior.id });
  return list.slice(0, MAX);
}

function companionProposals(s: State, companion: User): Proposal[] {
  const list: Proposal[] = [];
  const confirmed = s.missions
    .filter((m) => m.status === "confirmed" && !isPast(s, m.start))
    .filter((m) => s.offers.some((o) => o.missionId === m.id && o.companionId === companion.id && o.status === "accepted"))
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  if (confirmed && daysBetween(s.now.slice(0, 10), confirmed.start.slice(0, 10)) <= SOON_DAYS) {
    list.push({
      id: `upcoming:${confirmed.id}`,
      kind: "upcoming",
      seniorId: confirmed.seniorId,
      date: confirmed.start,
      activityId: confirmed.activityId,
      missionId: confirmed.id,
    });
  }
  for (const r of rankMissions(s, companion).slice(0, 3)) {
    const offered = s.offers.some((o) => o.missionId === r.item.id && o.companionId === companion.id && o.status === "pending");
    if (!offered) list.push({ id: `mission:${r.item.id}`, kind: "mission", missionId: r.item.id });
  }
  return list.slice(0, MAX);
}

/** Proposals for the signed-in user. For relatives, seniorId picks which loved one. */
export function proposalsFor(s: State, user: User, seniorId?: string): Proposal[] {
  if (user.role === "senior") return seniorProposals(s, user);
  if (user.role === "family") return familyProposals(s, user, seniorId);
  return companionProposals(s, user);
}

/** Extra "join" proposals for activities found during the conversation. */
export function joinProposal(s: State, senior: User, activityId: string): Proposal {
  const mates = attendees(s, activityId)
    .filter((u) => u.id !== senior.id && u.interests.some((i) => senior.interests.includes(i)))
    .map((u) => u.firstName);
  return { id: `join:${activityId}`, kind: "join", seniorId: senior.id, activityId, mates };
}

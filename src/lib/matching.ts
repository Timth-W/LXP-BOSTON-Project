/**
 * Recommendation rules.
 * 1. Hard filters, always applied by code (never by the AI): future date, seats left,
 *    companion's areas and availability.
 * 2. Ranking and explanation: by the AI (route /api/assistant) or, as a fallback, by the score below.
 * Reasons are returned as translatable descriptors, rendered in the viewer's language.
 */
import { slotOf, dayKey } from "./format";
import { activityById, attendees, isPast, isRegistered, seatsLeft, userById } from "./selectors";
import type { Activity, Category, Intent, Mission, SectorId, Slot, State, User } from "./types";

export type Reason =
  | { kind: "likes"; category: Category }
  | { kind: "available"; slot: Slot }
  | { kind: "mates"; names: string[] }
  | { kind: "nearby" }
  | { kind: "activityMatch"; activityId: string }
  | { kind: "shared"; categories: Category[] }
  | { kind: "inArea"; sector: SectorId };

export interface Ranked<T> {
  item: T;
  score: number;
  reasons: Reason[];
}

/** Activities a senior can actually join (hard filters). */
export function eligibleActivities(s: State, senior: User): Activity[] {
  return s.activities.filter((a) => !isPast(s, a.start) && seatsLeft(s, a) > 0 && !isRegistered(s, a.id, senior.id));
}

export function rankActivities(s: State, senior: User, intent?: Intent, limit = 3): Ranked<Activity>[] {
  let list = eligibleActivities(s, senior);
  if (intent?.days.length) list = list.filter((a) => intent.days.includes(dayKey(a.start)));
  if (intent?.moment) {
    const moment = intent.moment;
    list = list.filter((a) => slotOf(a.start).endsWith(moment));
  }
  if (intent?.categories.length && list.some((a) => intent.categories.includes(a.category))) {
    list = list.filter((a) => intent.categories.includes(a.category));
  }
  return list
    .map((a) => {
      let score = 0;
      const reasons: Reason[] = [];
      if (senior.interests.includes(a.category)) {
        score += 3;
        reasons.push({ kind: "likes", category: a.category });
      }
      if (senior.availability.includes(slotOf(a.start))) {
        score += 2;
        reasons.push({ kind: "available", slot: slotOf(a.start) });
      }
      const mates = attendees(s, a.id).filter((p) => p.id !== senior.id && p.interests.some((i) => senior.interests.includes(i)));
      if (mates.length) {
        score += mates.length;
        reasons.push({ kind: "mates", names: mates.map((m) => m.firstName) });
      }
      if (a.sector === senior.sector) {
        score += 1;
        reasons.push({ kind: "nearby" });
      }
      return { item: a, score, reasons };
    })
    .sort((x, y) => y.score - x.score || x.item.start.localeCompare(y.item.start))
    .slice(0, limit);
}

/** Hard filters before an outing is offered to a companion. */
export function isCompatible(s: State, m: Mission, companion: User): boolean {
  const c = companion.companion;
  if (!c) return false;
  return m.status === "open" && !isPast(s, m.start) && c.sectors.includes(m.sector) && companion.availability.includes(slotOf(m.start));
}

export function rankMissions(s: State, companion: User): Ranked<Mission>[] {
  return s.missions
    .filter((m) => isCompatible(s, m, companion))
    .map((m) => {
      const senior = userById(s, m.seniorId);
      const shared = (senior?.interests ?? []).filter((i) => companion.interests.includes(i));
      const reasons: Reason[] = [];
      let score = 2;
      const activity = activityById(s, m.activityId);
      if (activity && companion.interests.includes(activity.category)) {
        score += 4;
        reasons.push({ kind: "activityMatch", activityId: activity.id });
      }
      if (shared.length) {
        score += shared.length * 3;
        reasons.push({ kind: "shared", categories: shared });
      }
      reasons.push({ kind: "available", slot: slotOf(m.start) });
      reasons.push({ kind: "inArea", sector: m.sector });
      return { item: m, score, reasons };
    })
    .sort((x, y) => y.score - x.score || x.item.start.localeCompare(y.item.start));
}

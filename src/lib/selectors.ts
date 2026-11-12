/**
 * Derived data. Screens never keep their own copy of the data: they read the state through
 * these functions, which keeps every screen in sync after any change.
 */
import { NO_OUTING_ALERT_DAYS } from "./constants";
import { normalizeEmail, normalizeInviteCode } from "./auth";
import { daysBetween, toDate } from "./format";
import type { Activity, FamilyLink, Mission, Offer, State, User } from "./types";

/* ---------- Users and links ---------- */

export const userById = (s: State, id: string | undefined): User | undefined => (id ? s.users.find((u) => u.id === id) : undefined);
export const currentUser = (s: State): User | undefined => userById(s, s.currentUserId ?? undefined);
export const findUserByEmail = (s: State, email: string) => s.users.find((u) => u.email === normalizeEmail(email));
export const findSeniorByCode = (s: State, code: string) =>
  s.users.find((u) => u.role === "senior" && u.inviteCode === normalizeInviteCode(code));

export const linksOfSenior = (s: State, seniorId: string): FamilyLink[] => s.links.filter((l) => l.seniorId === seniorId);
export const linksOfFamily = (s: State, familyId: string): FamilyLink[] => s.links.filter((l) => l.familyId === familyId);
export const familyOf = (s: State, seniorId: string): User[] =>
  linksOfSenior(s, seniorId)
    .map((l) => userById(s, l.familyId))
    .filter((u): u is User => Boolean(u));
export const seniorsOf = (s: State, familyId: string): User[] =>
  linksOfFamily(s, familyId)
    .map((l) => userById(s, l.seniorId))
    .filter((u): u is User => Boolean(u));
export const isLinked = (s: State, seniorId: string, familyId: string) =>
  s.links.some((l) => l.seniorId === seniorId && l.familyId === familyId);

/** People allowed to pay for a senior's outing: the senior and their linked relatives. */
export const payersFor = (s: State, seniorId: string): User[] => {
  const senior = userById(s, seniorId);
  return senior ? [senior, ...familyOf(s, seniorId)] : [];
};

/* ---------- Activities ---------- */

export const activityById = (s: State, id: string | null | undefined): Activity | undefined =>
  id ? s.activities.find((a) => a.id === id) : undefined;
export const isPast = (s: State, iso: string) => toDate(iso).getTime() < toDate(s.now).getTime();
export const registrationsFor = (s: State, activityId: string) => s.registrations.filter((r) => r.activityId === activityId);
export const seatsLeft = (s: State, a: Activity) => a.capacity - registrationsFor(s, a.id).length;
export const isRegistered = (s: State, activityId: string, seniorId: string) =>
  s.registrations.some((r) => r.activityId === activityId && r.seniorId === seniorId);
export const attendees = (s: State, activityId: string): User[] =>
  registrationsFor(s, activityId)
    .map((r) => userById(s, r.seniorId))
    .filter((u): u is User => Boolean(u));

/* ---------- Outings ---------- */

export const missionById = (s: State, id: string): Mission | undefined => s.missions.find((m) => m.id === id);
export const offersFor = (s: State, missionId: string): Offer[] => s.offers.filter((o) => o.missionId === missionId);
export const pendingOffers = (s: State, missionId: string) => offersFor(s, missionId).filter((o) => o.status === "pending");
export const acceptedOffer = (s: State, missionId: string) => s.offers.find((o) => o.missionId === missionId && o.status === "accepted");
export const companionOf = (s: State, missionId: string): User | undefined => userById(s, acceptedOffer(s, missionId)?.companionId);
export const paymentFor = (s: State, missionId: string) => s.payments.find((p) => p.missionId === missionId);
export const giftMinutesLeft = (s: State, seniorId: string) =>
  s.giftCards.filter((g) => g.seniorId === seniorId).reduce((sum, g) => sum + g.minutesLeft, 0);

export type StatusTone = "info" | "ok" | "warn" | "danger" | "neutral";

/** Status of an outing seen by the senior or a relative. */
export type OwnerStatus = "searching" | "offers" | "confirmed" | "done" | "cancelled";
export function ownerStatus(s: State, m: Mission): OwnerStatus {
  if (m.status === "open") return pendingOffers(s, m.id).length ? "offers" : "searching";
  if (m.status === "confirmed") return "confirmed";
  if (m.status === "done") return "done";
  return "cancelled";
}
export const OWNER_TONE: Record<OwnerStatus, StatusTone> = {
  searching: "info",
  offers: "warn",
  confirmed: "ok",
  done: "neutral",
  cancelled: "danger",
};

/** Status of an outing seen by a companion. */
export type CompanionStatus = "available" | "offered" | "confirmed" | "done" | "cancelled" | "taken";
export function companionStatus(s: State, m: Mission, companionId: string): CompanionStatus {
  const mine = s.offers.find(
    (o) => o.missionId === m.id && o.companionId === companionId && (o.status === "pending" || o.status === "accepted"),
  );
  if (m.status === "cancelled") return "cancelled";
  if (m.status === "done") return mine?.status === "accepted" ? "done" : "taken";
  if (m.status === "confirmed") return mine?.status === "accepted" ? "confirmed" : "taken";
  return mine ? "offered" : "available";
}
export const COMPANION_TONE: Record<CompanionStatus, StatusTone> = {
  available: "info",
  offered: "warn",
  confirmed: "ok",
  done: "neutral",
  cancelled: "danger",
  taken: "neutral",
};

/**
 * Progressive privacy: what a companion is allowed to see.
 * In production this filter must be enforced by the backend and the database (row-level security).
 */
export function missionForCompanion(s: State, m: Mission, companionId: string) {
  const senior = userById(s, m.seniorId);
  const st = companionStatus(s, m, companionId);
  const unlocked = st === "confirmed" || st === "done";
  return {
    ...m,
    seniorFirstName: senior?.firstName ?? "",
    seniorInterests: senior?.interests ?? [],
    seniorLastName: unlocked ? (senior?.lastName ?? "") : null,
    meetingPoint: unlocked ? m.meetingPoint : null,
    unlocked,
  };
}

export type OutingItem = { kind: "activity"; date: string; activity: Activity } | { kind: "mission"; date: string; mission: Mission };

export function outingsOf(s: State, seniorId: string): OutingItem[] {
  const items: OutingItem[] = [];
  for (const r of s.registrations.filter((x) => x.seniorId === seniorId)) {
    const a = activityById(s, r.activityId);
    if (a) items.push({ kind: "activity", date: a.start, activity: a });
  }
  for (const m of s.missions.filter((x) => x.seniorId === seniorId && x.status !== "cancelled")) {
    items.push({ kind: "mission", date: m.start, mission: m });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

export const upcomingOutings = (s: State, seniorId: string) => outingsOf(s, seniorId).filter((i) => !isPast(s, i.date));

/** For relatives: last outing, next outing, and an alert when nothing happened for a while. */
export function isolationStatus(s: State, seniorId: string) {
  const real = outingsOf(s, seniorId).filter((i) => i.kind === "activity" || i.mission.status !== "open");
  const past = real.filter((i) => isPast(s, i.date));
  const next = real.filter((i) => !isPast(s, i.date));
  const last = past.length ? past[past.length - 1].date : null;
  const daysSince = last ? daysBetween(last, s.now) : null;
  const alert = (daysSince === null || daysSince > NO_OUTING_ALERT_DAYS) && next.length === 0;
  return { last, daysSince, next: next[0] ?? null, alert };
}

export const unreadCount = (s: State, userId: string) => s.notifications.filter((n) => n.userId === userId && !n.read).length;
